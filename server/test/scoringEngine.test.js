/**
 * Unit Tests for CivicPulse Scoring Engine
 * Verifies mathematical correctness of urgency calculation and project ranking.
 */

import {
  computeUrgencyScore,
  calculateRecencyDecay,
  calculateDensityScore,
  recomputePriorityProjects,
  CATEGORY_SEVERITY_MAP
} from '../src/services/scoringEngine.js';

console.log('------------------------------------------------------------');
console.log(' CivicPulse Scoring Engine Unit Test Suite');
console.log('------------------------------------------------------------');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Test Case 1: High severity in severely underserved region (e.g. Ward 12 Dharavi)
// ---------------------------------------------------------------------------
console.log('\nTest Case 1: High Severity in High Infra-Gap Region');
const case1 = computeUrgencyScore({
  complaintSeverityWeight: 90,
  infraGapScore: 92.4,
  recencyDecay: 100,
  densityScore: 80,
});
// (90 * 0.40) + (92.4 * 0.35) + (100 * 0.15) + (80 * 0.10) = 36 + 32.34 + 15 + 8 = 91.34 -> 91.3
console.log(`  Result urgency: ${case1} (Expected: ~91.3)`);
assert(case1 === 91.3, `Urgency score must exactly equal 91.3 (Got: ${case1})`);
assert(case1 >= 90, 'High severity in underserved area produces critical urgency (>= 90)');

// ---------------------------------------------------------------------------
// Test Case 2: Low severity in low infra-gap region (e.g. Ward 1 Colaba)
// ---------------------------------------------------------------------------
console.log('\nTest Case 2: Low Severity in Well-Funded Low Infra-Gap Region');
const case2 = computeUrgencyScore({
  complaintSeverityWeight: 40,
  infraGapScore: 24.5,
  recencyDecay: 20,
  densityScore: 15,
});
// (40 * 0.40) + (24.5 * 0.35) + (20 * 0.15) + (15 * 0.10) = 16 + 8.575 + 3 + 1.5 = 29.075 -> 29.1
console.log(`  Result urgency: ${case2} (Expected: ~29.1)`);
assert(case2 === 29.1, `Urgency score must exactly equal 29.1 (Got: ${case2})`);
assert(case2 < 35, 'Low severity in well-funded area produces low urgency (< 35)');

// ---------------------------------------------------------------------------
// Test Case 3: Recency Decay Behavior (Fresh vs Stale complaint)
// ---------------------------------------------------------------------------
console.log('\nTest Case 3: Recency Decay Behavior');
const freshDate = new Date();
const staleDate = new Date(Date.now() - (72 * 60 * 60 * 1000)); // 72 hours ago

const freshScore = computeUrgencyScore({
  category: 'water',
  infraGapScore: 80,
  createdAt: freshDate,
});

const staleScore = computeUrgencyScore({
  category: 'water',
  infraGapScore: 80,
  createdAt: staleDate,
});

console.log(`  Fresh score: ${freshScore} vs Stale score: ${staleScore}`);
assert(freshScore > staleScore, `Fresh complaint (${freshScore}) must score higher than 72h stale (${staleScore})`);
assert(freshScore <= 100 && staleScore >= 0, 'Scores must strictly remain clamped in [0, 100]');

// ---------------------------------------------------------------------------
// Test Case 4: Category fallback weighting
// ---------------------------------------------------------------------------
console.log('\nTest Case 4: Category Default Weights');
assert(CATEGORY_SEVERITY_MAP.water === 85, 'Water severity default is 85');
assert(CATEGORY_SEVERITY_MAP.electricity === 80, 'Electricity severity default is 80');
assert(CATEGORY_SEVERITY_MAP.roads === 72, 'Roads severity default is 72');

// ---------------------------------------------------------------------------
// Test Case 5: Priority Project Aggregation & Ranking
// ---------------------------------------------------------------------------
console.log('\nTest Case 5: Priority Project Ranking');
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

const rankedProjects = recomputePriorityProjects(sampleSubmissions, sampleRegions);

console.log(`  Ranked projects count: ${rankedProjects.length}`);
assert(rankedProjects.length === 3, 'Must aggregate 5 submissions into 3 distinct projects');
assert(rankedProjects[0].final_priority_rank === 1, 'Top project has rank 1');
assert(rankedProjects[0].region_name === 'Ward 12 - Dharavi', 'Dharavi water cluster is ranked #1');
assert(rankedProjects[0].submission_count === 3, 'Dharavi cluster counted 3 submissions');
assert(rankedProjects[2].region_name === 'Ward 4 - Bandra West', 'Bandra roads cluster is ranked #3');

console.log('------------------------------------------------------------');
console.log(` Summary: ${passedTests}/${totalTests} tests passed successfully.`);
console.log('------------------------------------------------------------\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
