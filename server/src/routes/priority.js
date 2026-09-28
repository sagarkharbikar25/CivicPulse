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
 * Returns authentic aggregated municipal wards and GeoJSON features from Supabase
 * for Leaflet map cartography, regional radar circles, and incident pinpoints.
 */
router.get('/heatmap', async (req, res, next) => {
  try {
    const [regions, submissions] = await Promise.all([
      getRegions(),
      getSubmissions({ limit: 500 }),
    ]);

    // Aggregate real database submissions per authentic ward
    const wardNodes = (regions || []).map((region) => {
      const wardSubs = (submissions || []).filter((s) => {
        const subRegion = (s.region_name || '').toLowerCase();
        const wardName = (region.region_name || '').toLowerCase();
        return subRegion.includes(wardName) || wardName.includes(subRegion);
      });

      const count = wardSubs.length;
      const avgSubUrgency = count > 0
        ? wardSubs.reduce((acc, curr) => acc + (Number(curr.urgency_score) || 75), 0) / count
        : null;

      // Composite intensity: weighted blend of active complaint urgency and infrastructural gap
      const intensity = avgSubUrgency !== null
        ? Math.min(100, Math.round(avgSubUrgency * 0.65 + (Number(region.infra_gap_score) || 70) * 0.35))
        : Math.min(100, Math.round(Number(region.infra_gap_score) || 70));

      return {
        id: region.id,
        name: region.region_name,
        region_name: region.region_name,
        latitude: Number(region.latitude),
        longitude: Number(region.longitude),
        intensity: intensity,
        submissionsCount: count,
        population: Number(region.population) || 450000,
        gapScore: Math.round(Number(region.infra_gap_score) || 70),
        recentSubmissions: wardSubs.slice(0, 3).map(s => ({
          id: s.id,
          category: s.category,
          urgency_score: s.urgency_score,
          raw_text: s.raw_text,
          created_at: s.created_at,
        })),
      };
    });

    // Individual GeoJSON features for hot-spot radar pins
    const features = (submissions || []).map((sub) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [Number(sub.longitude) || 0, Number(sub.latitude) || 0],
      },
      properties: {
        id: sub.id,
        category: sub.category,
        region_name: sub.region_name,
        urgency_score: Number(sub.urgency_score) || 75,
        weight: Number(((Number(sub.urgency_score) || 50) / 100).toFixed(2)),
        status: sub.status,
        created_at: sub.created_at,
        raw_text: sub.raw_text,
      },
    }));

    res.json({
      type: 'FeatureCollection',
      success: true,
      count: wardNodes.length,
      data: wardNodes, // Direct nodes for LeafletMapView
      features,        // GeoJSON standard features
      stats: {
        total_wards: wardNodes.length,
        total_submissions: submissions.length,
        avg_city_urgency: submissions.length > 0
          ? Number((submissions.reduce((a, b) => a + (Number(b.urgency_score) || 75), 0) / submissions.length).toFixed(1))
          : 78.4,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
