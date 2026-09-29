import { Router } from 'express';
import { getPriorityProjects, getSubmissions, getRegions, syncPriorityProjects, isLegacyDummy } from '../db/supabaseAdmin.js';
import { recomputePriorityProjects, coerceNumber, clamp } from '../services/scoringEngine.js';
import { wardNameMatches } from '../utils/geo.js';

const router = Router();

/**
 * GET /api/priority
 * Dynamically computes ranked priority projects list from live submissions and regions.
 */
router.get('/', async (req, res, next) => {
  try {
    const [rawSubs, rawRegions] = await Promise.all([
      getSubmissions({ limit: 500 }),
      getRegions(),
    ]);

    const submissions = (rawSubs || []).filter(s => !isLegacyDummy(s.region_name));
    const regions = (rawRegions || []).filter(r => !isLegacyDummy(r.region_name));

    // Dynamic prioritization calculation from live database records
    let projects = recomputePriorityProjects(submissions, regions);

    if (!projects || projects.length === 0) {
      projects = await getPriorityProjects();
    } else {
      syncPriorityProjects(projects).catch(e => console.warn('[Priority] Background sync:', e.message));
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
    const [rawRegions, rawSubs] = await Promise.all([
      getRegions(),
      getSubmissions({ limit: 500 }),
    ]);

    const regions = (rawRegions || []).filter(r => !isLegacyDummy(r.region_name));
    const submissions = (rawSubs || []).filter(s => !isLegacyDummy(s.region_name));

    // Aggregate real database submissions per authentic ward
    const wardNodes = (regions || []).map((region) => {
      const wardSubs = (submissions || []).filter((s) => wardNameMatches(s.region_name, region.region_name));

      const count = wardSubs.length;
      const avgSubUrgency = count > 0
        ? wardSubs.reduce((acc, curr) => acc + coerceNumber(curr.urgency_score, 75), 0) / count
        : null;
      const gapScore = coerceNumber(region.infra_gap_score, 70);

      // Composite intensity: weighted blend of active complaint urgency and infrastructural gap
      const intensity = avgSubUrgency !== null
        ? Math.round(clamp(avgSubUrgency * 0.65 + gapScore * 0.35, 0, 100))
        : Math.round(clamp(gapScore, 0, 100));

      return {
        id: region.id,
        name: region.region_name,
        region_name: region.region_name,
        latitude: Number(region.latitude),
        longitude: Number(region.longitude),
        intensity: intensity,
        submissionsCount: count,
        population: coerceNumber(region.population, 450000),
        gapScore: Math.round(gapScore),
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
    const features = (submissions || []).map((sub) => {
      const urgency = coerceNumber(sub.urgency_score, 75);
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [coerceNumber(sub.longitude, 0), coerceNumber(sub.latitude, 0)],
        },
        properties: {
          id: sub.id,
          category: sub.category,
          region_name: sub.region_name,
          urgency_score: urgency,
          weight: Number((clamp(urgency, 0, 100) / 100).toFixed(2)),
          status: sub.status,
          created_at: sub.created_at,
          raw_text: sub.raw_text,
        },
      };
    });
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
          ? Number((submissions.reduce((a, b) => a + coerceNumber(b.urgency_score, 75), 0) / submissions.length).toFixed(1))
          : 78.4,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
