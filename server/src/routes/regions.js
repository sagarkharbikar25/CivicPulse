import { Router } from 'express';
import { getRegions } from '../db/supabaseAdmin.js';

const router = Router();

/**
 * GET /api/regions
 * Returns seeded region_index data with population, coordinates, and infra_gap_score
 */
router.get('/', async (req, res, next) => {
  try {
    const regions = await getRegions();

    res.json({
      success: true,
      count: regions.length,
      data: regions,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
