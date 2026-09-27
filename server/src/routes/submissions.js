import { Router } from 'express';
import { getSubmissions, createSubmission, getRegions } from '../db/supabaseAdmin.js';
import { computeUrgencyScore } from '../services/scoringEngine.js';

const router = Router();

/**
 * GET /api/submissions
 * Query params:
 *   - region: filter by region substring
 *   - category: filter by category (water, electricity, roads, sanitation, etc.)
 *   - status: filter by status (new, reviewed, prioritized)
 *   - limit: max records (default 50)
 *   - sort: 'urgency' | 'newest' (default: newest)
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
 * Day 1 Stub: Accepts citizen text report, calculates urgency score, and stores in database.
 * (Full AI entity classification and translation wires in Day 2: feature/ai-integration)
 */
router.post('/text', async (req, res, next) => {
  try {
    const { raw_text, region_name, category, latitude, longitude, raw_input_type = 'text' } = req.body;

    if (!raw_text || typeof raw_text !== 'string' || !raw_text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: raw_text',
      });
    }

    const regions = await getRegions();
    const matchedRegion = regions.find(r => 
      region_name && r.region_name.toLowerCase().includes(region_name.toLowerCase())
    ) || regions[0];

    const urgency = computeUrgencyScore({
      category: category || 'other',
      infraGapScore: matchedRegion?.infra_gap_score || 50,
      createdAt: new Date(),
    });

    const newSubmission = await createSubmission({
      raw_input_type,
      raw_text: raw_text.trim(),
      language_detected: 'en',
      translated_text: raw_text.trim(),
      category: category || 'other',
      latitude: Number(latitude) || matchedRegion.latitude,
      longitude: Number(longitude) || matchedRegion.longitude,
      region_name: matchedRegion.region_name,
      urgency_score: urgency,
      status: 'new',
    });

    res.status(201).json({
      success: true,
      message: 'Citizen submission received and scored successfully',
      data: newSubmission,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/submissions/voice
 * Day 1 Stub: Confirms voice endpoint route readiness.
 * (Full Whisper STT audio processing wires in Day 2: feature/ai-integration)
 */
router.post('/voice', (req, res) => {
  res.status(202).json({
    success: true,
    message: 'Voice ingestion stub ready. Multilingual Whisper transcription pipeline activates in feature/ai-integration.',
    endpoint: '/api/submissions/voice',
    status: 'stubbed_day_1',
  });
});

export default router;
