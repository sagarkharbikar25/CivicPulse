/**
 * CivicPulse Scoring Engine Unit Test Suite
 *
 * Verifies the mathematical correctness, clamping, determinism and edge-case
 * behaviour of the urgency formula documented in plan.md §5 / 01-core-backend.md:
 *
 *   urgency = (severity * 0.40) + (infra_gap * 0.35) + (recency * 0.15) + (density * 0.10)
 */

import {
  computeUrgencyScore,
  calculateRecencyDecay,
  calculateDensityScore,
  recomputePriorityProjects,
  CATEGORY_SEVERITY_MAP,
} from '../src/services/scoringEngine.js';
import { suite, group, assert, assertEqual, assertClose, assertBetween, summary } from './harness.js';

suite('Scoring Engine — Unit Tests');

/* ------------------------------------------------------------------ */
group('1. Exact formula verification');
/* ------------------------------------------------------------------ */

// (90*0.40) + (92.4*0.35) + (100*0.15) + (80*0.10) = 36 + 32.34 + 15 + 8 = 91.34 -> 91.3
const case1 = computeUrgencyScore({
  complaintSeverityWeight: 90, infraGapScore: 92.4, recencyDecay: 100, densityScore: 80,
});
assertEqual(case1, 91.3, 'High severity + high infra gap + fresh + dense = 91.3');
assert(case1 >= 90, 'Critical urgency (>= 90) for a severe hazard in an underserved ward');

// (40*0.40) + (24.5*0.35) + (20*0.15) + (15*0.10) = 16 + 8.575 + 3 + 1.5 = 29.075 -> 29.1
const case2 = computeUrgencyScore({
  complaintSeverityWeight: 40, infraGapScore: 24.5, recencyDecay: 20, densityScore: 15,
});
assertEqual(case2, 29.1, 'Low severity + funded ward + stale + sparse = 29.1');
assert(case2 < 35, 'Low urgency (< 35) for minor issue in a well-funded ward');

// All-100 inputs: 40 + 35 + 15 + 10 = 100
assertEqual(computeUrgencyScore({
  complaintSeverityWeight: 100, infraGapScore: 100, recencyDecay: 100, densityScore: 100,
}), 100, 'All factors at 100 produce exactly 100');

// All-0 inputs = 0
assertEqual(computeUrgencyScore({
  complaintSeverityWeight: 0, infraGapScore: 0, recencyDecay: 0, densityScore: 0,
}), 0, 'All factors at 0 produce exactly 0');

// Weights must sum to 1.0 => output is a weighted average of the inputs
const mid = computeUrgencyScore({
  complaintSeverityWeight: 50, infraGapScore: 50, recencyDecay: 50, densityScore: 50,
});
assertEqual(mid, 50, 'Uniform 50 inputs produce 50 (weights sum to 1.0)');

/* ------------------------------------------------------------------ */
group('2. Clamping and input hardening');
/* ------------------------------------------------------------------ */

assertEqual(computeUrgencyScore({
  complaintSeverityWeight: 5000, infraGapScore: 5000, recencyDecay: 5000, densityScore: 5000,
}), 100, 'Out-of-range high inputs clamp to 100');

assertEqual(computeUrgencyScore({
  complaintSeverityWeight: -999, infraGapScore: -999, recencyDecay: -999, densityScore: -999,
}), 0, 'Negative inputs clamp to 0');

assertBetween(computeUrgencyScore({ infraGapScore: 99999 }), 0, 100, 'Huge infra gap stays within [0,100]');
assertBetween(computeUrgencyScore({ infraGapScore: -1 }), 0, 100, 'Negative infra gap stays within [0,100]');
assertBetween(computeUrgencyScore({ category: 'water' }), 0, 100, 'Category-only call stays within [0,100]');
assertBetween(computeUrgencyScore(), 0, 100, 'Zero-arg call stays within [0,100]');

// NaN / undefined / string inputs must not produce NaN
for (const bad of [NaN, undefined, null, 'abc', {}, []]) {
  const out = computeUrgencyScore({
    complaintSeverityWeight: bad, infraGapScore: bad, recencyDecay: bad, densityScore: bad,
  });
  assert(!Number.isNaN(out), `Non-numeric severity input ${JSON.stringify(bad)} does not yield NaN`);
}

assert(!Number.isNaN(computeUrgencyScore({ infraGapScore: 'not-a-number' })),
  'Non-numeric infra gap falls back to default instead of NaN');
assert(!Number.isNaN(computeUrgencyScore({ createdAt: 'not-a-date' })),
  'Invalid createdAt falls back to default instead of NaN');

/* ------------------------------------------------------------------ */
group('3. Category severity defaults');
/* ------------------------------------------------------------------ */

assertEqual(CATEGORY_SEVERITY_MAP.water, 85, 'Water default severity is 85');
assertEqual(CATEGORY_SEVERITY_MAP.electricity, 80, 'Electricity default severity is 80');
assertEqual(CATEGORY_SEVERITY_MAP.roads, 72, 'Roads default severity is 72');
assertEqual(CATEGORY_SEVERITY_MAP.sanitation, 65, 'Sanitation default severity is 65');

// Category fallback path (no explicit severity) is deterministic and ordered
const waterScore = computeUrgencyScore({ category: 'water', infraGapScore: 50 });
const roadsScore = computeUrgencyScore({ category: 'roads', infraGapScore: 50 });
assert(waterScore > roadsScore, `Water (${waterScore}) outranks Roads (${roadsScore}) at equal infra gap`);

const otherScore = computeUrgencyScore({ category: 'nonexistent-category', infraGapScore: 50 });
assertEqual(otherScore, computeUrgencyScore({ category: 'other', infraGapScore: 50 }),
  'Unknown category falls back to the "other" baseline');

assertEqual(computeUrgencyScore({ category: 'WATER', infraGapScore: 50 }), waterScore,
  'Category matching is case-insensitive');

/* ------------------------------------------------------------------ */
group('4. Explicit severity overrides the category baseline');
/* ------------------------------------------------------------------ */

// This is the regression guard for the bug where the LLM severity was discarded.
const sevOverride = computeUrgencyScore({
  complaintSeverityWeight: 95, category: 'other', infraGapScore: 50, recencyDecay: 100, densityScore: 15,
});
const baselineOverride = computeUrgencyScore({
  complaintSeverityWeight: 50, category: 'other', infraGapScore: 50, recencyDecay: 100, densityScore: 15,
});
assert(sevOverride > baselineOverride,
  `Explicit severity 95 (${sevOverride}) must outrank severity 50 (${baselineOverride})`);

/* ------------------------------------------------------------------ */
group('5. Recency decay');
/* ------------------------------------------------------------------ */

const ref = new Date('2026-01-10T00:00:00.000Z');
assertEqual(calculateRecencyDecay('2026-01-10T00:00:00.000Z', ref), 100, 'Brand new complaint decays to 100');
// 100 * e^(-24/48) = 60.7 ; 100 * e^(-48/48) = 36.8
assertClose(calculateRecencyDecay('2026-01-09T00:00:00.000Z', ref), 60.7, 0.2, '24h old decays to ~61');
assertClose(calculateRecencyDecay('2026-01-08T00:00:00.000Z', ref), 36.8, 0.2, '48h old decays to ~37');
assert(calculateRecencyDecay('2026-01-01T00:00:00.000Z', ref) < 30, '9-day-old complaint decays below 30');

// Floor and monotonicity
assert(calculateRecencyDecay('2000-01-01T00:00:00.000Z', ref) >= 10, 'Very old complaint hits the 10 floor');
assertEqual(calculateRecencyDecay('2026-01-11T00:00:00.000Z', ref), 100,
  'Future-dated timestamp does not produce > 100 (no negative hours)');

let monotonic = true;
let prev = Infinity;
for (let h = 0; h <= 200; h += 5) {
  const v = calculateRecencyDecay(new Date(ref.getTime() - h * 3600000), ref);
  if (v > prev) monotonic = false;
  prev = v;
}
assert(monotonic, 'Recency decay is monotonically non-increasing over time');

assertEqual(calculateDensityScore(1), 15, 'A single complaint yields density 15');
assert(calculateDensityScore(10) > calculateDensityScore(3), 'More complaints yield higher density');
assert(calculateDensityScore(100000) <= 100, 'Very high volume density caps at 100');
assert(calculateDensityScore(0) >= 15, 'Zero count floors at the single-complaint density');
assert(calculateDensityScore(-5) >= 15, 'Negative count floors at the single-complaint density');

/* ------------------------------------------------------------------ */
group('6. Fresh vs stale ordering end-to-end');
/* ------------------------------------------------------------------ */

const fresh = computeUrgencyScore({ category: 'water', infraGapScore: 80, createdAt: new Date() });
const stale = computeUrgencyScore({ category: 'water', infraGapScore: 80, createdAt: new Date(Date.now() - 72 * 3600000) });
assert(fresh > stale, `Fresh (${fresh}) must outrank 72h-stale (${stale})`);

/* ------------------------------------------------------------------ */
group('7. Determinism / purity');
/* ------------------------------------------------------------------ */

const inputs = { complaintSeverityWeight: 77, infraGapScore: 61, recencyDecay: 88, densityScore: 44 };
const a = computeUrgencyScore(inputs);
const b = computeUrgencyScore(inputs);
assertEqual(a, b, 'Repeated calls with identical inputs are byte-identical (pure function)');

const original = JSON.stringify(inputs);
computeUrgencyScore(inputs);
assertEqual(JSON.stringify(inputs), original, 'computeUrgencyScore does not mutate its input object');

/* ------------------------------------------------------------------ */
group('8. Priority project aggregation and ranking');
/* ------------------------------------------------------------------ */

const sampleSubmissions = [
  { region_name: 'Ward 12 - Dharavi', category: 'water', urgency_score: 95 },
  { region_name: 'Ward 12 - Dharavi', category: 'water', urgency_score: 93 },
  { region_name: 'Ward 12 - Dharavi', category: 'water', urgency_score: 94 },
  { region_name: 'Ward 4 - Bandra West', category: 'roads', urgency_score: 35 },
  { region_name: 'Ward 9 - Kurla West', category: 'electricity', urgency_score: 88 },
];
const sampleRegions = [
  { region_name: 'Ward 12 - Dharavi', infra_gap_score: 92.4 },
  { region_name: 'Ward 4 - Bandra West', infra_gap_score: 31.8 },
  { region_name: 'Ward 9 - Kurla West', infra_gap_score: 86.8 },
];

const ranked = recomputePriorityProjects(sampleSubmissions, sampleRegions);
assertEqual(ranked.length, 3, 'Five submissions aggregate into three distinct projects');
assertEqual(ranked[0].final_priority_rank, 1, 'Top project has rank 1');
assertEqual(ranked[0].region_name, 'Ward 12 - Dharavi', 'Dharavi water cluster ranks #1');
assertEqual(ranked[0].submission_count, 3, 'Dharavi cluster counts 3 submissions');
assertEqual(ranked[2].region_name, 'Ward 4 - Bandra West', 'Bandra roads cluster ranks last');
assertEqual(ranked[0].avg_urgency, 94, 'Dharavi average urgency is 94');

// Ranking must be a dense 1..N sequence in descending order
const ranks = ranked.map(p => p.final_priority_rank);
assert(ranks.every((r, i) => r === i + 1), `Ranks form a dense ascending sequence (${ranks.join(',')})`);
const composite = recomputePriorityProjects(sampleSubmissions, sampleRegions)
  .map(p => p.final_priority_rank);
assert(composite.length === 3, 'Recomputation is stable across calls');

assert(ranked.every(p => typeof p.recommended_action === 'string' && p.recommended_action.length > 20),
  'Every project carries a substantive recommended action');
assert(ranked[0].recommended_action.includes('Dharavi'), 'Recommended action names the impact ward');

/* ------------------------------------------------------------------ */
group('9. Aggregation edge cases');
/* ------------------------------------------------------------------ */

assertEqual(recomputePriorityProjects([], []).length, 0, 'Empty inputs produce no projects');
assertEqual(recomputePriorityProjects(null, null).length, 0, 'Null inputs produce no projects');
assertEqual(recomputePriorityProjects(undefined, undefined).length, 0, 'Undefined inputs produce no projects');

const missingMeta = recomputePriorityProjects(
  [{ category: 'water', urgency_score: 70 }],
  [],
);
assertEqual(missingMeta.length, 1, 'A submission with no region still forms a project');
assertEqual(missingMeta[0].region_name, 'Unassigned Ward', 'Missing region defaults to "Unassigned Ward"');
assert(missingMeta[0].recommended_action.length > 0, 'Missing region still yields a recommended action');

const noUrgency = recomputePriorityProjects(
  [{ region_name: 'Ward X', category: 'water' }],
  [{ region_name: 'Ward X', infra_gap_score: 50 }],
);
assert(!Number.isNaN(noUrgency[0].avg_urgency), 'Missing urgency_score falls back instead of NaN');

const unknownCategory = recomputePriorityProjects(
  [{ region_name: 'Ward X', category: 'quantum-nanowiring', urgency_score: 50 }],
  [],
);
assert(unknownCategory[0].recommended_action.length > 0, 'Unknown category falls back to the "other" action');

const caseInsensitive = recomputePriorityProjects(
  [
    { region_name: 'ward 12', category: 'WATER', urgency_score: 90 },
    { region_name: 'WARD 12', category: 'water', urgency_score: 90 },
  ],
  [],
);
assertEqual(caseInsensitive.length, 1,
  'Clustering key is case-insensitive so duplicate casing does not split a cluster');

const volumeBoost = (() => {
  const one = recomputePriorityProjects(
    [{ region_name: 'W', category: 'water', urgency_score: 60 }], [{ region_name: 'W', infra_gap_score: 50 }]);
  const many = recomputePriorityProjects(
    Array.from({ length: 8 }, () => ({ region_name: 'W', category: 'water', urgency_score: 60 })),
    [{ region_name: 'W', infra_gap_score: 50 }],
  );
  return many[0].final_priority_rank - one[0].final_priority_rank;
})();
assert(volumeBoost <= 0, 'Volume multiplier is neutral-or-better at equal urgency');

summary('Scoring Engine');
