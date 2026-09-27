import { Router } from 'express';
import { recomputeAll } from '../db/supabaseAdmin.js';

const router = Router();

/**
 * POST /api/admin/recompute
 * Manually trigger re-scoring across all stored complaints and regenerates priority ranking.
 */
router.post('/recompute', async (req, res, next) => {
  try {
    const result = await recomputeAll();

    res.json({
      success: true,
      message: 'Scoring engine recomputed priority rankings successfully',
      result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
