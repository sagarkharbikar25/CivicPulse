import { Router } from 'express';
import multer from 'multer';
import { getSubmissions, createSubmission, getRegions, recomputeAll } from '../db/supabaseAdmin.js';
import { computeUrgencyScore } from '../services/scoringEngine.js';
import { transcribeAudio } from '../services/whisperService.js';
import { classifyComplaint } from '../services/llmClassifyService.js';
import { generatePolicyRecommendation } from '../services/recommendationService.js';
import { submissionRateLimiter, sanitizeCitizenInput } from '../middleware/security.js';

const router = Router();

// Configure Multer for memory buffer audio uploads (10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * Helper: Matches region name or guess against registered municipal wards
 */
function resolveWard(regionInput, regions) {
  if (!regionInput) return regions[0];
  const query = regionInput.toLowerCase().trim();
  const matched = regions.find(r => r.region_name.toLowerCase().includes(query));
  return matched || regions[0];
}

/**
 * GET /api/submissions
 * Query params: region, category, status, limit, sort
 */
router.get('/', async (req, res, next) => {
  try {
    const { region, category, status, limit, sort } = req.query;
    const submissions = await getSubmissions({ region, category, status, limit, sort });

    res.json({
      success: true,
      count: submissions.length,
      filters: { region: region || null, category: category || null, status: status || null },
      data: submissions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/submissions/text
 * Day 2: Multilingual Text -> LLM Classify -> Urgency Scoring -> Save -> Recompute Rankings
 */
router.post('/text', submissionRateLimiter, sanitizeCitizenInput, async (req, res, next) => {
  try {
    const startTime = Date.now();
    const textInput = req.body.raw_text || req.body.text;
    const { region_name, latitude, longitude, raw_input_type = 'text' } = req.body;

    if (!textInput || typeof textInput !== 'string' || !textInput.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: raw_text (or text) is required and cannot be empty.',
      });
    }

    const raw_text = textInput;

    // 1. LLM Reasoning & Classification Call
    const aiResult = await classifyComplaint(raw_text);

    // 2. Resolve target ward (explicit preference -> LLM guess -> fallback ward)
    const regions = await getRegions();
    const targetWard = resolveWard(region_name || aiResult.region_guess, regions);

    // 3. Compute Multi-Factor Urgency Score
    // Severity from LLM (0-10) scaled to weight (0-100)
    const severityWeight = Math.round(aiResult.severity * 10);
    const urgency = computeUrgencyScore({
      complaintSeverityWeight: severityWeight,
      category: aiResult.category,
      infraGapScore: targetWard.infra_gap_score || 50,
      createdAt: new Date(),
    });

    // 4. Save to Database
    const newSubmission = await createSubmission({
      raw_input_type,
      raw_text: raw_text.trim(),
      language_detected: aiResult.language_detected || 'en',
      translated_text: aiResult.translated_text || raw_text.trim(),
      category: aiResult.category || 'other',
      latitude: Number(latitude) || targetWard.latitude,
      longitude: Number(longitude) || targetWard.longitude,
      region_name: targetWard.region_name,
      urgency_score: urgency,
      status: aiResult.status || 'new',
    });

    // 5. Dynamic Priority Project Recomputation
    const recomputeSummary = await recomputeAll();
    let topRecommendation = null;
    if (recomputeSummary?.topProject) {
      topRecommendation = await generatePolicyRecommendation(recomputeSummary.topProject);
      recomputeSummary.topProject.recommended_action = topRecommendation;
    }

    const processingMs = Date.now() - startTime;

    res.status(201).json({
      success: true,
      message: 'Citizen complaint classified, scored, and mapped successfully.',
      pipeline_latency_ms: processingMs,
      classification: {
        category: aiResult.category,
        language_detected: aiResult.language_detected,
        translated_text: aiResult.translated_text,
        region_guess: aiResult.region_guess,
        severity_score_10: aiResult.severity,
        one_line_summary: aiResult.one_line_summary,
        fallback_used: aiResult.fallback || false,
      },
      data: newSubmission,
      priority_impact: {
        total_projects: recomputeSummary?.projectsCount || 0,
        top_project: recomputeSummary?.topProject || null,
        top_policy_action: topRecommendation,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/submissions/voice
 * Day 2: Multipart Audio -> Whisper STT -> LLM Classify -> Urgency Scoring -> Save -> Recompute
 */
router.post('/voice', submissionRateLimiter, upload.single('audio'), async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { region_name, latitude, longitude, sample_text, live_transcript, text } = req.body;
    const recognizedSpeech = (live_transcript || sample_text || text || '').trim();

    // 1. Ingest audio from multipart file, buffer, or sample text
    let audioBuffer = req.file?.buffer;
    const originalname = req.file?.originalname || 'recording.webm';
    const mimetype = req.file?.mimetype || 'audio/webm';

    // 2. Whisper Speech-to-Text Transcription
    const sttResult = await transcribeAudio({
      buffer: audioBuffer,
      originalname,
      mimetype,
      sampleText: recognizedSpeech,
    });

    const transcribedText = sttResult.transcript;
    if (!transcribedText || !transcribedText.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Unable to extract audible transcript from audio file.',
      });
    }

    // 3. LLM Reasoning & Classification Call
    const aiResult = await classifyComplaint(transcribedText);

    // 4. Resolve target ward
    const regions = await getRegions();
    const targetWard = resolveWard(region_name || aiResult.region_guess, regions);

    // 5. Compute Multi-Factor Urgency Score
    const severityWeight = Math.round(aiResult.severity * 10);
    const urgency = computeUrgencyScore({
      complaintSeverityWeight: severityWeight,
      category: aiResult.category,
      infraGapScore: targetWard.infra_gap_score || 50,
      createdAt: new Date(),
    });

    // 6. Save to Database
    const newSubmission = await createSubmission({
      raw_input_type: 'voice',
      raw_text: transcribedText,
      language_detected: sttResult.language_detected || aiResult.language_detected || 'en',
      translated_text: aiResult.translated_text || transcribedText,
      category: aiResult.category || 'other',
      latitude: Number(latitude) || targetWard.latitude,
      longitude: Number(longitude) || targetWard.longitude,
      region_name: targetWard.region_name,
      urgency_score: urgency,
      status: aiResult.status || 'new',
    });

    // 7. Dynamic Priority Project Recomputation
    const recomputeSummary = await recomputeAll();
    let topRecommendation = null;
    if (recomputeSummary?.topProject) {
      topRecommendation = await generatePolicyRecommendation(recomputeSummary.topProject);
      recomputeSummary.topProject.recommended_action = topRecommendation;
    }

    const processingMs = Date.now() - startTime;

    res.status(201).json({
      success: true,
      message: 'Voice complaint transcribed, classified, and scored in real-time.',
      pipeline_latency_ms: processingMs,
      stt: {
        transcript: sttResult.transcript,
        language_detected: sttResult.language_detected,
        stt_duration_seconds: sttResult.duration_seconds,
        stt_provider: sttResult.provider,
      },
      classification: {
        category: aiResult.category,
        translated_text: aiResult.translated_text,
        region_guess: aiResult.region_guess,
        severity_score_10: aiResult.severity,
        one_line_summary: aiResult.one_line_summary,
        fallback_used: aiResult.fallback || false,
      },
      data: newSubmission,
      priority_impact: {
        total_projects: recomputeSummary?.projectsCount || 0,
        top_project: recomputeSummary?.topProject || null,
        top_policy_action: topRecommendation,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
