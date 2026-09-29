/**
 * CivicPulse Scoring Engine
 * Pure, deterministic scoring function with zero side-effects and zero API calls.
 * 
 * Formula:
 * urgency_score = (complaint_severity_weight * 0.40)
 *               + (region.infra_gap_score * 0.35)
 *               + (complaint_recency_decay * 0.15)
 *               + (submission_density_in_area * 0.10)
 */

// Baseline category severity weights (0 - 100)
export const CATEGORY_SEVERITY_MAP = {
  water: 85,
  electricity: 80,
  roads: 72,
  sanitation: 65,
  transport: 60,
  other: 50,
};

/**
 * Coerces a value to a finite number, falling back to `fallback` only when the
 * value is genuinely absent/unparseable.
 *
 * The ubiquitous `Number(x) || fallback` idiom is wrong here because 0 is
 * falsy: a genuinely zero infra-gap score or a zero urgency was silently
 * rewritten to the fallback (0 urgency displayed as 75/100 on the dashboard).
 */
export function coerceNumber(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * NaN-safe clamp. `Math.max(0, Math.min(100, NaN)` evaluates to NaN, so a
 * single bad input previously poisoned the entire urgency score.
 */
export function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * Calculates exponential recency decay from hours elapsed
 * Recent reports (0 hrs) = 100
 * Decay constant is 48h: 100 -> ~61 at 24h -> ~37 at 48h, floored at 10.
 * 
 * @param {number|Date|string} createdAt - timestamp or hours elapsed
 * @param {Date} [referenceTime=new Date()]
 * @returns {number} score between 0 and 100
 */
export function calculateRecencyDecay(createdAt, referenceTime = new Date()) {
  let hoursElapsed = 0;
  if (typeof createdAt === 'number') {
    hoursElapsed = Number.isFinite(createdAt) ? Math.max(0, createdAt) : 0;
  } else {
    const createdDate = new Date(createdAt);
    const refDate = new Date(referenceTime);
    // An unparseable timestamp previously produced NaN hours, which propagated
    // all the way through to a NaN urgency score.
    const deltaMs = refDate.getTime() - createdDate.getTime();
    hoursElapsed = Number.isFinite(deltaMs) ? Math.max(0, deltaMs / (1000 * 60 * 60)) : 0;
  }

  // 100 at 0h, ~61 at 24h, ~37 at 48h, min floor 10
  const decay = 100 * Math.exp(-hoursElapsed / 48);
  return Number(clamp(decay, 10, 100).toFixed(1));
}

/**
 * Normalizes submission density in an area into a 0 - 100 index
 * 
 * @param {number} count - number of complaints in cluster/area
 * @returns {number} score between 0 and 100
 */
export function calculateDensityScore(count = 1) {
  const safeCount = Math.max(1, coerceNumber(count, 1));
  // Logarithmic scaling: 1 complaint = 15, 5 complaints = 50, 10 complaints = 80, 15+ = 100
  const density = 15 + (Math.log2(safeCount) * 22);
  return Number(clamp(density, 15, 100).toFixed(1));
}

/**
 * Pure calculation function for single complaint urgency
 * 
 * @param {Object} params
 * @param {number} [params.complaintSeverityWeight] - 0 to 100
 * @param {string} [params.category] - category key if weight not explicitly provided
 * @param {number} [params.infraGapScore=50] - 0 to 100 (from region_index)
 * @param {number} [params.recencyDecay=100] - 0 to 100 (or calculated from createdAt)
 * @param {number|Date|string} [params.createdAt] - used if recencyDecay not provided
 * @param {number} [params.densityScore=20] - 0 to 100
 * @param {number} [params.clusterCount] - used if densityScore not provided
 * @returns {number} urgency_score clamped between 0 and 100, rounded to 1 decimal
 */
export function computeUrgencyScore(params = {}) {
  const {
    complaintSeverityWeight,
    category = 'other',
    infraGapScore,
    recencyDecay,
    createdAt,
    densityScore,
    clusterCount = 1,
  } = params || {};

  // 1. Resolve severity weight
  const severity = typeof complaintSeverityWeight === 'number'
    ? clamp(complaintSeverityWeight, 0, 100)
    : (CATEGORY_SEVERITY_MAP[String(category).toLowerCase()] || CATEGORY_SEVERITY_MAP.other);

  // 2. Resolve infra gap score (0-100). 0 is a valid value, not "missing".
  const infraGap = clamp(coerceNumber(infraGapScore, 50), 0, 100);

  // 3. Resolve recency decay (0-100)
  let recency = recencyDecay;
  if (typeof recency !== 'number' || !Number.isFinite(recency)) {
    recency = createdAt ? calculateRecencyDecay(createdAt) : 100;
  }
  recency = clamp(recency, 0, 100);

  // 4. Resolve submission density (0-100)
  let density = densityScore;
  if (typeof density !== 'number' || !Number.isFinite(density)) {
    density = calculateDensityScore(clusterCount);
  }
  density = clamp(density, 0, 100);

  // Exact formula specified in 01-core-backend.md
  // urgency_score = (complaint_severity_weight * 0.4)
  //               + (region.infra_gap_score * 0.35)
  //               + (complaint_recency_decay * 0.15)
  //               + (submission_density_in_area * 0.10)
  const score = (severity * 0.40) +
                (infraGap * 0.35) +
                (recency * 0.15) +
                (density * 0.10);

  return Number(clamp(score, 0, 100).toFixed(1));
}

/**
 * Recomputes and ranks priority projects across all submissions and regions.
 * Groups complaints by (region_name, category), derives aggregated urgency and
 * generates structured actionable municipal projects.
 * 
 * @param {Array<Object>} submissions
 * @param {Array<Object>} regions
 * @returns {Array<Object>} ranked priority projects
 */
export function recomputePriorityProjects(submissions = [], regions = []) {
  if (!Array.isArray(submissions) || submissions.length === 0) return [];

  // Index regions for quick lookup
  const regionMap = new Map();
  (Array.isArray(regions) ? regions : []).forEach(reg => {
    if (reg && reg.region_name) {
      regionMap.set(reg.region_name.toLowerCase(), reg);
    }
  });

  // Group submissions by region_name + category
  const clusters = new Map();

  submissions.forEach(sub => {
    const regionName = sub.region_name || 'Unassigned Ward';
    const category = sub.category || 'other';
    const key = `${regionName.toLowerCase()}:::${category.toLowerCase()}`;

    if (!clusters.has(key)) {
      clusters.set(key, {
        region_name: regionName,
        category: category,
        submissions: [],
        totalUrgency: 0,
      });
    }

    const cluster = clusters.get(key);
    cluster.submissions.push(sub);
    cluster.totalUrgency += coerceNumber(sub.urgency_score, 50);
  });

  // Action templates by category
  const actionTemplates = {
    water: 'Deploy emergency pipeline repair crew and install secondary potable distribution manifold.',
    electricity: 'Dispatch grid technicians for transformer replacement and overhead line clearance.',
    roads: 'Initiate rapid cold-mix asphalt pothole repair and structural road surface grading.',
    sanitation: 'Mobilize mechanized solid waste compactors and sanitize open drain perimeter.',
    transport: 'Reconfigure transit corridor feeder bus frequency and clear traffic choke point.',
    other: 'Dispatch municipal field assessment officer for on-site diagnostic review.',
  };

  const projectList = [];

  for (const cluster of clusters.values()) {
    const count = cluster.submissions.length;
    const avgUrgency = Number((cluster.totalUrgency / count).toFixed(1));
    const matchingRegion = regionMap.get(cluster.region_name.toLowerCase()) || {};
    const infraGap = coerceNumber(matchingRegion.infra_gap_score, 50);

    // Composite ranking metric: High urgency + volume multiplier + infra disparity boost
    const volumeMultiplier = 1 + (Math.log2(count) * 0.25);
    const compositeScore = (avgUrgency * 0.7 + infraGap * 0.3) * volumeMultiplier;

    const action = actionTemplates[cluster.category.toLowerCase()] || actionTemplates.other;

    projectList.push({
      region_name: cluster.region_name,
      category: cluster.category,
      submission_count: count,
      avg_urgency: avgUrgency,
      compositeScore: Number(compositeScore.toFixed(2)),
      recommended_action: `${action} (Impact area: ${cluster.region_name})`,
      latitude: coerceNumber(cluster.submissions[0]?.latitude, coerceNumber(matchingRegion.latitude, 19.0760)),
      longitude: coerceNumber(cluster.submissions[0]?.longitude, coerceNumber(matchingRegion.longitude, 72.8777)),
      generated_at: new Date().toISOString(),
    });
  }

  // Sort descending by composite score and assign final_priority_rank (1, 2, 3...)
  projectList.sort((a, b) => b.compositeScore - a.compositeScore);

  return projectList.map((project, index) => ({
    id: `proj-${index + 1}`,
    region_name: project.region_name,
    category: project.category,
    submission_count: project.submission_count,
    avg_urgency: project.avg_urgency,
    final_priority_rank: index + 1,
    recommended_action: project.recommended_action,
    latitude: project.latitude,
    longitude: project.longitude,
    generated_at: project.generated_at,
  }));
}
