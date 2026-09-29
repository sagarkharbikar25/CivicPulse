/**
 * CivicPulse Client/Server Contract Test Suite
 *
 * The React client in client/src/lib/api.js destructures specific fields out of
 * each response. These tests pin that contract so a backend refactor cannot
 * silently break the dashboard.
 */

process.env.NODE_ENV = 'test';
process.env.ADMIN_API_KEY = 'test-admin-key-abc123';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

import { suite, group, assert, assertEqual, assertBetween, startTestServer, summary } from './harness.js';
import { getSubmissions, getRegions, getPriorityProjects, recomputeAll } from '../src/db/supabaseAdmin.js';

suite('Client/Server Contract');

const CATEGORIES = ['roads', 'water', 'electricity', 'sanitation', 'transport', 'other'];
// Matches the schema CHECK constraint and plan.md: status text default 'new'.
const STATUSES = ['new', 'reviewed', 'prioritized'];

/* ------------------------------------------------------------------ */
group('1. Shapes the client destructures from each endpoint');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const subs = await getSubmissions({});
    assert(Array.isArray(subs), 'getSubmissions returns an array');
    assert(subs.length > 0, 'getSubmissions is non-empty with seed data');
    for (const sub of subs) {
      assert(typeof sub.id === 'string' && sub.id.length > 0, 'Submission has a string id');
      assert(CATEGORIES.includes(sub.category), `Submission category "${sub.category}" is a known enum`);
      assert(STATUSES.includes(sub.status), `Submission status "${sub.status}" is a known enum`);
      assert(['voice', 'text', 'chat'].includes(sub.raw_input_type), 'Submission raw_input_type is a known enum');
      assert(typeof sub.raw_text === 'string', 'Submission raw_text is a string');
      assert(typeof sub.region_name === 'string' && sub.region_name.length > 0,
        'Submission region_name is a non-empty string');
      assertBetween(sub.urgency_score, 0, 100, 'Submission urgency_score is 0-100');
      assertBetween(sub.latitude, -90, 90, 'Submission latitude is -90..90');
      assertBetween(sub.longitude, -180, 180, 'Submission longitude is -180..180');
    }

    const projects = await getPriorityProjects({});
    assert(Array.isArray(projects), 'getPriorityProjects returns an array');
    assert(projects.length > 0, 'getPriorityProjects is non-empty with seed data');
    for (const p of projects) {
      assert(typeof p.final_priority_rank === 'number', 'Project has numeric final_priority_rank');
      // client/src/pages/PolicymakerView.jsx calls item.avg_urgency.toFixed(1)
      // unconditionally, so this must always be a number.
      assert(typeof p.avg_urgency === 'number', 'Project avg_urgency is a number (PolicymakerView calls .toFixed on it)');
      assertBetween(p.avg_urgency, 0, 100, 'Project avg_urgency is 0-100');
      assert(typeof p.submission_count === 'number', 'Project submission_count is a number');
      assert(typeof p.recommended_action === 'string' && p.recommended_action.length > 0,
        'Project has a recommended_action string');
      assert(typeof p.region_name === 'string' && p.region_name.length > 0, 'Project has a region_name string');
      assert(CATEGORIES.includes(p.category), `Project category "${p.category}" is a known enum`);
    }

    const heat = await (await s.get('/api/priority/heatmap')).json();
    assertEqual(heat.type, 'FeatureCollection', 'Heatmap type is FeatureCollection');
    assert(Array.isArray(heat.data) && heat.data.length > 0, 'Heatmap data[] is a non-empty ward array');
    assert(Array.isArray(heat.features) && heat.features.length > 0, 'Heatmap features[] is a non-empty array');
    for (const w of heat.data) {
      assert(typeof w.name === 'string' && w.name.length > 0, 'Heatmap ward has a name string');
      assert(Number.isFinite(w.latitude) && Number.isFinite(w.longitude), 'Heatmap ward has numeric lat/lng');
      assertBetween(w.intensity, 0, 100, 'Heatmap ward intensity is 0-100');
      assertBetween(w.gapScore, 0, 100, 'Heatmap ward gapScore is 0-100');
    }

    const regions = await getRegions();
    assert(Array.isArray(regions) && regions.length > 0, 'getRegions returns a non-empty array');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('2. Response envelope the client relies on');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    // client/src/lib/api.js checks `if (data.success)` for mutations
    const post = await s.postJson('/api/submissions/text', {
      raw_text: 'Storm drain blocked by debris near the main market entrance.',
    });
    const postBody = await post.json();
    assertEqual(post.status, 201, 'Text submission returns 201');
    assertEqual(postBody.success, true, 'Text submission envelope has success:true');
    assert(Boolean(postBody.message), 'Text submission envelope has a message');
    assert(Boolean(postBody.data), 'Text submission envelope has a data object');
    assert(Boolean(postBody.classification), 'Text submission envelope has a classification object');
    assert(Boolean(postBody.priority_impact), 'Text submission envelope has a priority_impact object');
    assertEqual(postBody.classification.category, postBody.data.category,
      'classification.category agrees with the stored data.category');
    assertBetween(postBody.classification.severity_score_10, 0, 10, 'severity_score_10 is 0-10');
    assert(typeof postBody.pipeline_latency_ms === 'number', 'pipeline_latency_ms is reported');

    // Realtime broadcast the client subscribes to
    const bad = await s.postJson('/api/submissions/text', {});
    const badBody = await bad.json();
    assertEqual(bad.status, 400, 'Missing raw_text is rejected with 400');
    assertEqual(badBody.success, false, 'Error envelope has success:false');
    assert(typeof badBody.error === 'string' && badBody.error.length > 0, 'Error envelope has an error string');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('3. Client-supplied filters are honoured end-to-end');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    // client/src/lib/api.js forwards ?limit= to the API; confirm the cap is respected.
    const cappedRes = await (await s.get('/api/submissions?limit=5')).json();
    assertEqual(cappedRes.data.length, 5, 'limit=5 returns exactly 5 submissions');
    assertEqual(cappedRes.count, 5, 'count matches the returned array length');

    // The dashboard forwards ?sort=; confirm it changes ordering.
    const byUrgency = await (await s.get('/api/submissions?sort=urgency')).json();
    const scores = byUrgency.data.map(x => x.urgency_score);
    assert(scores.every((v, i) => i === 0 || scores[i - 1] >= v), 'sort=urgency is descending');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('4. Admin recompute contract the dashboard triggers');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const goodKey = await s.postJson('/api/admin/recompute', {}, { 'x-admin-key': 'test-admin-key-abc123' });
    assertEqual(goodKey.status, 200, 'Admin recompute with correct key is 200');
    const goodBody = await goodKey.json();
    assertEqual(goodBody.success, true, 'Admin recompute returns success:true');
    assert(Boolean(goodBody.result), 'Admin recompute includes a result object');

    const noKey = await s.postJson('/api/admin/recompute', {});
    assertEqual(noKey.status, 401, 'Admin recompute without key is 401');

    // recomputeAll() is the DB-layer entry point the admin route delegates to.
    const direct = await recomputeAll();
    assert(direct && typeof direct === 'object', 'recomputeAll() returns a result object');
  } finally {
    await s.close();
  }
}

summary('Contract');
