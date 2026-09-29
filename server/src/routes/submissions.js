import { Router } from 'express';
import multer from 'multer';
import { getSubmissions, createSubmission, getRegions, recomputeAll } from '../db/supabaseAdmin.js';
import { computeUrgencyScore } from '../services/scoringEngine.js';
import { transcribeAudio } from '../services/whisperService.js';
import { classifyComplaint } from '../services/llmClassifyService.js';
import { generatePolicyRecommendation } from '../services/recommendationService.js';
import { submissionRateLimiter, sanitizeCitizenInput } from '../middleware/security.js';
import { nearestWard, isValidCoordinatePair, wardNameMatches } from '../utils/geo.js';

const router = Router();

const MAX_CITIZEN_TEXT_LENGTH = 2000;

// Configure Multer for memory buffer audio uploads (10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * Helper: Matches region name or GPS coordinates against registered municipal wards.
 *
 * Resolution order: high-precision device GPS -> explicit region text -> LLM
 * region guess -> first registered ward. The previous implementation crashed
 * with a TypeError whenever the ward list was empty, and only accepted an
 * exact full-name substring match.
 */
function resolveWard(regionInput, regions, latitude, longitude) {
  const wardList = Array.isArray(regions) ? regions : [];
  if (wardList.length === 0) return null;

  const fallbackWard = wardList.find(r => r.region_name.includes('Nagpur')) || wardList[0];

  // 1. High-precision device GPS coordinates -> nearest registered ward
  if (isValidCoordinatePair(latitude, longitude)) {
    const nearest = nearestWard(wardList, latitude, longitude);
    if (nearest) return nearest;
  }

  // 2. Text keyword query match (partial, ward-list aware)
  if (!regionInput || !String(regionInput).trim()) return fallbackWard;
  const matched = wardList.find(r => wardNameMatches(r.region_name, regionInput));
  return matched || fallbackWard;
}

/**
 * Shared tail of the intake pipeline: classify -> resolve ward -> score -> persist.
 */
async function ingestComplaint({ rawText, inputType, body, sttResult = null }) {
  const startTime = Date.now();

  // 1. AI classification (single structured-JSON LLM call, with heuristic fallback)
  const aiResult = await classifyComplaint(rawText);

  // 2. A citizen who explicitly states the category/severity knows the ground
  //    truth better than a classifier, so their declaration wins as a floor.
  //    Previously both were silently discarded, so the UI's category picker and
  //    severity slider had no effect on the stored record.
  const declaredCategory = typeof body.category === 'string' ? body.category.trim().toLowerCase() : null;
  const VALID_CATEGORIES = ['roads', 'water', 'electricity', 'sanitation', 'other'];
  const category = declaredCategory && VALID_CATEGORIES.includes(declaredCategory)
    ? declaredCategory
    : (aiResult.category || 'other');

  const declaredSeverity = Number(body.severity);
  const llmSeverity = Number(aiResult.severity);
  const baseSeverity = Number.isFinite(llmSeverity) ? llmSeverity : 5;
  const severity = Number.isFinite(declaredSeverity)
    ? Math.min(10, Math.max(baseSeverity, Math.min(10, Math.max(0, declaredSeverity))))
    : baseSeverity;

  // 3. Resolve target ward
  const regions = await getRegions();
  const targetWard = resolveWard(body.region_name || aiResult.region_guess, regions, body.latitude, body.longitude);

  const hasGpsCoords = isValidCoordinatePair(body.latitude, body.longitude);
  const finalLat = hasGpsCoords ? Number(body.latitude) : (Number(targetWard?.latitude) || 0);
  const finalLng = hasGpsCoords ? Number(body.longitude) : (Number(targetWard?.longitude) || 0);
  const finalRegionName = (body.region_name && String(body.region_name).trim().length > 0)
    ? String(body.region_name).trim()
    : (hasGpsCoords
        ? `Nagpur (${finalLat.toFixed(4)}, ${finalLng.toFixed(4)})`
        : (targetWard?.region_name || 'Unassigned Ward'));

  // 4. Multi-factor urgency score (LLM/citizen severity 0-10 scaled to 0-100)
  const severityWeight = Math.round(severity * 10);
  const urgency = computeUrgencyScore({
    complaintSeverityWeight: severityWeight,
    category,
    infraGapScore: Number(targetWard?.infra_gap_score) || 50,
    createdAt: new Date(),
  });

  // 5. Persist
  const newSubmission = await createSubmission({
    raw_input_type: inputType,
    raw_text: rawText,
    language_detected: sttResult?.language_detected || aiResult.language_detected || 'en',
    translated_text: aiResult.translated_text || rawText,
    category,
    latitude: finalLat,
    longitude: finalLng,
    region_name: finalRegionName,
    urgency_score: urgency,
    status: aiResult.status || 'new',
  });

  // 6. Re-rank priorities and generate the tailored intervention
  const recomputeSummary = await recomputeAll();
  const intervention = await generatePolicyRecommendation({
    region_name: finalRegionName,
    category,
    submission_count: 1,
    avg_urgency: urgency,
  });

  return {
    newSubmission,
    aiResult,
    category,
    severity,
    recomputeSummary,
    intervention,
    processingMs: Date.now() - startTime,
  };
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
 * Multilingual text -> LLM classify -> urgency scoring -> save -> recompute rankings
 */
router.post('/text', submissionRateLimiter, sanitizeCitizenInput, async (req, res, next) => {
  try {
    const textInput = req.body.raw_text || req.body.text;

    if (!textInput || typeof textInput !== 'string' || !textInput.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: raw_text (or text) is required and cannot be empty.',
      });
    }

    if (textInput.length > MAX_CITIZEN_TEXT_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: raw_text exceeds maximum allowed length of ${MAX_CITIZEN_TEXT_LENGTH} characters.`,
      });
    }

    const rawInputType = ['voice', 'text', 'chat'].includes(req.body.raw_input_type)
      ? req.body.raw_input_type
      : 'text';

    const { newSubmission, aiResult, recomputeSummary, intervention, processingMs } =
      await ingestComplaint({ rawText: textInput.trim(), inputType: rawInputType, body: req.body });

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
        top_policy_action: intervention,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/submissions/voice
 * Multipart audio -> Whisper STT -> LLM classify -> urgency scoring -> save -> recompute
 */
router.post('/voice', submissionRateLimiter, upload.single('audio'), async (req, res, next) => {
  try {
    const { sample_text, live_transcript, text } = req.body;
    const recognizedSpeech = (live_transcript || sample_text || text || '').trim();

    if (recognizedSpeech.length > MAX_CITIZEN_TEXT_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Validation failed: speech transcript exceeds maximum allowed length of ${MAX_CITIZEN_TEXT_LENGTH} characters.`,
      });
    }

    // 1. Ingest audio from multipart file, buffer, or sample text
    const audioBuffer = req.file?.buffer;
    const originalname = req.file?.originalname || 'recording.webm';
    const mimetype = req.file?.mimetype || 'audio/webm';

    // Reject an empty multipart body. Without this, transcribeAudio's fallback
    // fabricated a placeholder grievance and stored a submission that no citizen
    // ever made.
    if (!recognizedSpeech && !(audioBuffer && audioBuffer.length > 0)) {
      return res.status(400).json({
        success: false,
        error: 'No audio file or speech transcript was provided.',
      });
    }

    // 2. Whisper Speech-to-Text transcription
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

    const { newSubmission, aiResult, recomputeSummary, intervention, processingMs } =
      await ingestComplaint({
        rawText: transcribedText.trim(),
        inputType: 'voice',
        body: req.body,
        sttResult,
      });

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
        language_detected: sttResult.language_detected || aiResult.language_detected,
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
        top_policy_action: intervention,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
