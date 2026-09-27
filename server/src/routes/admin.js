import { Router } from 'express';
import { recomputeAll } from '../db/supabaseAdmin.js';
import { requireAdminAuth } from '../middleware/security.js';

const router = Router();

/**
 * POST /api/admin/recompute
 * Manually trigger re-scoring across all stored complaints and regenerates priority ranking.
 * Protected by requireAdminAuth
 */
router.post('/recompute', requireAdminAuth, async (req, res, next) => {
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
