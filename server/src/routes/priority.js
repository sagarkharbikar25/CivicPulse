import { Router } from 'express';
import { getPriorityProjects, getSubmissions, getRegions } from '../db/supabaseAdmin.js';
import { recomputePriorityProjects } from '../services/scoringEngine.js';

const router = Router();

/**
 * GET /api/priority
 * Returns ranked priority projects list with urgency, submission counts, and actions.
 */
router.get('/', async (req, res, next) => {
  try {
    let projects = await getPriorityProjects();

    // If projects empty, calculate on the fly
    if (!projects || projects.length === 0) {
      const submissions = await getSubmissions({ limit: 500 });
      const regions = await getRegions();
      projects = recomputePriorityProjects(submissions, regions);
    }

    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/priority/heatmap
 * Returns GeoJSON-style points for Leaflet map cartography and hot-spot radar circles.
 */
router.get('/heatmap', async (req, res, next) => {
  try {
    const submissions = await getSubmissions({ limit: 200 });

    const features = submissions.map(sub => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [Number(sub.longitude) || 0, Number(sub.latitude) || 0],
      },
      properties: {
        id: sub.id,
        category: sub.category,
        region_name: sub.region_name,
        urgency_score: sub.urgency_score,
        // Normalized weight 0.0 - 1.0 for Leaflet heat layer intensity
        weight: Number(((sub.urgency_score || 50) / 100).toFixed(2)),
        status: sub.status,
        created_at: sub.created_at,
        raw_text: sub.raw_text,
      },
    }));

    res.json({
      type: 'FeatureCollection',
      success: true,
      count: features.length,
      features,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
