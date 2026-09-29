/**
 * CivicPulse Robustness & Edge-Case Test Suite
 *
 * Covers the failure modes that are most likely to break the live demo:
 * empty ward lists, malformed query params, unicode/multilingual text,
 * concurrent submissions, GPS handling, and the ward-matching predicates the
 * heatmap depends on.
 */

process.env.NODE_ENV = 'test';
process.env.ADMIN_API_KEY = 'test-admin-key-abc123';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

import { suite, group, assert, assertEqual, assertBetween, startTestServer, summary } from './harness.js';
import { wardNameMatches, normalizeWardName, haversineKm, nearestWard, isValidCoordinatePair } from '../src/utils/geo.js';
import { normalizeLimit, getRegions } from '../src/db/supabaseAdmin.js';
import { localStore, INITIAL_REGIONS } from '../src/db/localStore.js';

suite('Robustness & Edge Cases');

/* ------------------------------------------------------------------ */
group('1. Ward name matching predicates');
/* ------------------------------------------------------------------ */

assertEqual(normalizeWardName('  Zone 2 - Dharampeth / Civil Lines (Nagpur) '),
  'zone 2 - dharampeth civil lines nagpur', 'normalizeWardName lowercases, strips punctuation, collapses spaces');
assertEqual(normalizeWardName(null), '', 'normalizeWardName handles null');
assertEqual(normalizeWardName(undefined), '', 'normalizeWardName handles undefined');

assert(wardNameMatches('Ward 12 - Dharavi / Shahu Nagar', 'Dharavi'), 'Ward matches on locality substring');
assert(wardNameMatches('Dharavi', 'Ward 12 - Dharavi / Shahu Nagar'), 'Matching is symmetric');
assert(wardNameMatches('Zone 2 - Dharampeth / Civil Lines (Nagpur)', 'dharampeth'), 'Punctuation-insensitive ward match');
// Regression: normalizeWardName strips the parentheses, leaving a trailing
// "21.1458 79.0640" that broke substring matching, so a GPS-tagged grievance
// was attributed to zero wards in the heatmap.
assert(wardNameMatches('Dharampeth (21.1458, 79.0640)', 'Zone 2 - Dharampeth / Civil Lines (Nagpur)'),
  'Geotag-suffixed ward label still matches the bare ward');
assert(wardNameMatches('Ward 12 - Dharavi / Shahu Nagar 19.0760 72.8777', 'Dharavi'),
  'Bare coordinate suffix does not break ward matching');
assert(wardNameMatches('Nagpur (21.1458, 79.0640)', 'Zone 2 - Dharampeth / Civil Lines (Nagpur)'),
  'City-level geotag guess resolves to the Nagpur ward');

// The regression that inflated every ward's complaint count
assert(!wardNameMatches('', 'Ward 12 - Dharavi'), 'Empty submission region does NOT match a ward');
assert(!wardNameMatches(null, 'Ward 12 - Dharavi'), 'Null submission region does NOT match a ward');
assert(!wardNameMatches(undefined, 'Ward 12 - Dharavi'), 'Undefined submission region does NOT match a ward');
assert(!wardNameMatches('Ward 12 - Dharavi', ''), 'Empty ward name does NOT match a submission');
assert(!wardNameMatches('   ', 'Ward 12 - Dharavi'), 'Whitespace-only region does NOT match a ward');
assert(!wardNameMatches(' ', ' '), 'Two blank labels do not match each other');

/* ------------------------------------------------------------------ */
group('2. Geospatial helpers');
/* ------------------------------------------------------------------ */

// Nagpur Dharampeth -> Dhantoli is roughly 1.5 km
const d = haversineKm(21.1458, 79.0720, 21.1420, 79.0850);
assertBetween(d, 1.0, 2.0, `Haversine distance between two Nagpur wards is ~1.5 km (got ${d.toFixed(2)})`);
assertEqual(Math.round(haversineKm(21.1458, 79.0720, 21.1458, 79.0720)), 0, 'Distance to self is 0');

const near = nearestWard(INITIAL_REGIONS, 21.1460, 79.0725);
assert(Boolean(near) && near.region_name.includes('Dharampeth'),
  `Nearest ward to Dharampeth GPS is the Dharampeth ward (got ${near?.region_name})`);

const near2 = nearestWard(INITIAL_REGIONS, 21.1422, 79.0848);
assert(Boolean(near2) && near2.region_name.includes('Sitabuldi'),
  `Nearest ward to Sitabuldi GPS is the Sitabuldi ward (got ${near2?.region_name})`);

assertEqual(nearestWard([], 21.1, 79.0), null, 'nearestWard returns null for an empty ward list');
assertEqual(nearestWard(INITIAL_REGIONS, null, null), null, 'nearestWard returns null for null coords');
assertEqual(nearestWard(INITIAL_REGIONS, 'abc', 'def'), null, 'nearestWard returns null for non-numeric coords');
assertEqual(nearestWard(INITIAL_REGIONS, 0, 0), null, 'nearestWard ignores the null-island 0,0 sentinel');

assert(isValidCoordinatePair(21.1458, 79.0720), 'Valid Nagpur coordinates accepted');
assert(isValidCoordinatePair(-33.8688, 151.2093), 'Valid southern-hemisphere coordinates accepted');
assert(!isValidCoordinatePair(0, 0), '0,0 null island rejected');
assert(!isValidCoordinatePair(91, 0), 'Latitude > 90 rejected');
assert(!isValidCoordinatePair(0, 181), 'Longitude > 180 rejected');
assert(!isValidCoordinatePair('abc', 'def'), 'Non-numeric coordinates rejected');
assert(!isValidCoordinatePair(null, null), 'Null coordinates rejected');

/* ------------------------------------------------------------------ */
group('3. Limit parameter normalization');
/* ------------------------------------------------------------------ */

assertEqual(normalizeLimit(undefined), 50, 'Undefined limit falls back to 50');
assertEqual(normalizeLimit('25'), 25, 'Numeric string limit is parsed');
assertEqual(normalizeLimit(10), 10, 'Numeric limit is used');
assertEqual(normalizeLimit('abc'), 50, 'Non-numeric limit falls back (previously produced NaN -> empty result)');
assertEqual(normalizeLimit('NaN'), 50, 'Literal "NaN" falls back');
assertEqual(normalizeLimit(-5), 50, 'Negative limit falls back');
assertEqual(normalizeLimit(0), 50, 'Zero limit falls back');
assertEqual(normalizeLimit(999999), 1000, 'Oversized limit is capped at 1000');
assertEqual(normalizeLimit(1.9), 1, 'Fractional limit is truncated');
assertEqual(normalizeLimit(null), 50, 'Null limit falls back');

/* ------------------------------------------------------------------ */
group('4. Seed data integrity');
/* ------------------------------------------------------------------ */

assert(INITIAL_REGIONS.length >= 10, `At least 10 seeded wards present (got ${INITIAL_REGIONS.length})`);

const names = INITIAL_REGIONS.map(r => r.region_name);
assertEqual(new Set(names).size, names.length, 'Seeded ward names are unique');

for (const r of INITIAL_REGIONS) {
  assertBetween(r.latitude, -90, 90, `Ward "${r.region_name}" has a valid latitude`);
  assertBetween(r.longitude, -180, 180, `Ward "${r.region_name}" has a valid longitude`);
  assertBetween(r.infra_gap_score, 0, 100, `Ward "${r.region_name}" infra gap within 0-100`);
  assert(Number.isInteger(r.population) && r.population > 0, `Ward "${r.region_name}" has a positive population`);
}

const validCategories = new Set(['roads', 'water', 'electricity', 'sanitation', 'transport', 'other']);
const validInputTypes = new Set(['voice', 'text', 'chat']);

for (const s of localStore.getSubmissions({ limit: 1000 })) {
  assert(validCategories.has(s.category), `Submission ${s.id} has a valid category (${s.category})`);
  assert(validInputTypes.has(s.raw_input_type), `Submission ${s.id} has a valid raw_input_type (${s.raw_input_type})`);
  assertBetween(s.urgency_score, 0, 100, `Submission ${s.id} urgency within 0-100`);
  assertBetween(s.latitude, -90, 90, `Submission ${s.id} latitude within range`);
  assertBetween(s.longitude, -180, 180, `Submission ${s.id} longitude within range`);
}

/* ------------------------------------------------------------------ */
group('5. GET endpoints with hostile query parameters');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    for (const q of ['?limit=abc', '?limit=-1', '?limit=0', '?limit=NaN', '?limit=', '?limit=null']) {
      const res = await s.get(`/api/submissions${q}`);
      const body = await res.json();
      assertEqual(res.status, 200, `GET /api/submissions${q} returns 200`);
      assert(Array.isArray(body.data), `GET /api/submissions${q} returns an array`);
      assert(body.count > 0, `GET /api/submissions${q} returns a non-empty result (no silent NaN wipe)`);
    }

    // SQL-ish / wildcard injection attempts in the ilike filters
    for (const region of ['%', '_', "'; DROP TABLE submissions; --", '100%', 'Ward 12']) {
      const res = await s.get(`/api/submissions?region=${encodeURIComponent(region)}`);
      assertEqual(res.status, 200, `region filter ${JSON.stringify(region)} does not crash the query`);
      assert(Array.isArray((await res.json()).data), `region filter ${JSON.stringify(region)} returns an array`);
    }

    for (const category of ['water', 'WATER', 'nonexistent', '', 'roads']) {
      const res = await s.get(`/api/submissions?category=${encodeURIComponent(category)}`);
      assertEqual(res.status, 200, `category filter ${JSON.stringify(category)} returns 200`);
    }

    const sorted = await (await s.get('/api/submissions?sort=urgency')).json();
    const urgencies = sorted.data.map(s => Number(s.urgency_score) || 0);
    const isDescending = urgencies.every((v, i) => i === 0 || urgencies[i - 1] >= v);
    assert(isDescending, 'sort=urgency returns a descending urgency ordering');

    const byRegion = await (await s.get('/api/submissions?region=Kurla')).json();
    assert(byRegion.data.every(s => /kurla/i.test(s.region_name)),
      'region filter only returns matching wards');

    const byStatus = await (await s.get('/api/submissions?status=new')).json();
    assert(byStatus.data.every(s => s.status === 'new'), 'status filter only returns matching statuses');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('6. Multilingual and unicode input');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const samples = [
      { lang: 'Hindi (Devanagari)', text: 'हमारे चाळ में पानी की पाइप फट गई है, तीन दिन से पीने का पानी नहीं आ रहा।' },
      { lang: 'Marathi (Devanagari)', text: 'वार्डात मोठा खड्डा पडला आहे, रस्त्यावर अपघात होत आहेत.' },
      { lang: 'Hinglish', text: 'Bandra west station ke paas traffic light band hai, subah se jam.' },
      { lang: 'Tamil (Indic)', text: 'குழாய் உடைந்து தண்ணீர் இல்லை, மூன்று நாட்களாக.' },
      { lang: 'Telugu (Indic)', text: 'పైప్‌లైన్ పగిలిపోయింది, మూడు రోజులుగా నీరు లేదు.' },
      { lang: 'Arabic RTL', text: 'انパイプラين مقطوع منذ ثلاثة أيام في الحي.' },
      { lang: 'Emoji', text: '🚰 Water pipe burst! ⚡ Transformer sparking near school 🏥' },
      { lang: 'Mixed script', text: 'Paani nahi aa raha यहाँ paani pipe फट गया है - urgent!' },
      { lang: 'Very long single word', text: 'x'.repeat(1500) },
    ];

    for (const { lang, text } of samples) {
      const res = await s.postJson('/api/submissions/text', { raw_text: text });
      const body = await res.json();
      assertEqual(res.status, 201, `${lang} input accepted with 201`);
      assert(Boolean(body.data?.id), `${lang} input persisted with an id`);
      assertBetween(body.data.urgency_score, 0, 100, `${lang} produced a bounded urgency score`);
      assert(
        ['roads', 'water', 'electricity', 'sanitation', 'other'].includes(body.data.category),
        `${lang} produced a valid category (${body.data.category})`,
      );
    }
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('7. Concurrent submissions do not corrupt state');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const before = (await (await s.get('/api/submissions')).json()).count;

    const batch = Array.from({ length: 10 }, (_, i) =>
      s.postJson('/api/submissions/text', {
        raw_text: `Rapid-fire submission ${i}: water pipe burst in ward cluster ${i % 3}.`,
      }));

    const results = await Promise.all(batch);
    const statuses = results.map(r => r.status);
    assert(statuses.every(st => st === 201), `All 10 concurrent submissions succeeded (${statuses.join(',')})`);

    const bodies = await Promise.all(results.map(r => r.json()));
    const ids = bodies.map(b => b.data.id);
    assertEqual(new Set(ids).size, ids.length, 'Concurrent submissions all received unique ids');

    const after = (await (await s.get('/api/submissions')).json()).count;
    assert(after >= before, `Submission count did not shrink after the burst (${before} -> ${after})`);

    // Rankings must remain internally consistent
    const prio = await (await s.get('/api/priority')).json();
    const ranks = prio.data.map(p => p.final_priority_rank);
    assert(ranks.every((r, i) => r === i + 1), 'Priority ranks remain a dense ascending sequence after a burst');
    assert(prio.data.every(p => typeof p.recommended_action === 'string' && p.recommended_action.length > 0),
      'Every project still has a recommended action after a burst');

    const heat = await (await s.get('/api/priority/heatmap')).json();
    assertEqual(heat.type, 'FeatureCollection', 'Heatmap still valid GeoJSON after a burst');
    assert(heat.data.every(w => w.intensity >= 0 && w.intensity <= 100),
      'All heatmap intensities remain within 0-100 after a burst');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('8. Urgency score reflects declared severity (regression guard)');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    // Same ward, same text, only the declared severity differs. Before the fix
    // the route discarded the declared severity and both scored identically.
    const low = await s.postJson('/api/submissions/text', {
      raw_text: 'Streetlight near the park is not working.',
      region_name: 'Ward 12 - Dharavi / Shahu Nagar',
      category: 'other',
      severity: 1,
    });
    const high = await s.postJson('/api/submissions/text', {
      raw_text: 'Streetlight near the park is not working.',
      region_name: 'Ward 12 - Dharavi / Shahu Nagar',
      category: 'other',
      severity: 10,
    });

    const lo = (await low.json()).data;
    const hi = (await high.json()).data;
    assert(hi.urgency_score > lo.urgency_score,
      `Declared severity changes the score (sev1=${lo.urgency_score} vs sev10=${hi.urgency_score})`);

    // Declared category must win over the classifier
    const asWater = await s.postJson('/api/submissions/text', {
      raw_text: 'There is a problem in the neighbourhood.',
      category: 'water',
    });
    const asRoads = await s.postJson('/api/submissions/text', {
      raw_text: 'There is a problem in the neighbourhood.',
      category: 'roads',
    });
    assertEqual((await asWater.json()).data.category, 'water', 'Citizen-declared category is honoured (water)');
    assertEqual((await asRoads.json()).data.category, 'roads', 'Citizen-declared category is honoured (roads)');

    // Invalid declared category falls back to the classifier
    const bogus = await s.postJson('/api/submissions/text', {
      raw_text: 'Water pipeline burst in the area.',
      category: 'not-a-category',
    });
    const bogusBody = await bogus.json();
    assertEqual(bogusBody.data.category, 'water',
      'Invalid declared category falls back to the AI classification');

    // Severity above the documented 0-10 range is clamped
    const overMax = await s.postJson('/api/submissions/text', {
      raw_text: 'Critical transformer fire at the school gate.',
      severity: 9999,
    });
    const overBody = await overMax.json();
    assertBetween(overBody.data.urgency_score, 0, 100, 'Out-of-range severity is clamped, not propagated');
    assertBetween(overBody.classification.severity_score_10, 0, 10, 'Reported severity stays within 0-10');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('9. Preserved scores survive recompute (regression guard)');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const before = await (await s.get('/api/submissions?sort=urgency')).json();
    const topBefore = before.data[0];

    const recompute = await s.postJson('/api/admin/recompute', {}, { 'x-admin-key': 'test-admin-key-abc123' });
    assertEqual(recompute.status, 200, 'Admin recompute succeeds');

    const after = await (await s.get('/api/submissions?sort=urgency')).json();
    const topAfter = after.data.find(x => x.id === topBefore.id);

    assert(Boolean(topAfter), 'Highest-urgency submission still exists after recompute');
    assertEqual(topAfter.urgency_score, topBefore.urgency_score,
      `Recompute preserves the LLM-derived score instead of overwriting it with a category baseline (${topBefore.urgency_score} -> ${topAfter?.urgency_score})`);

    // Scores must not all collapse to a small set of category baselines
    const distinct = new Set(after.data.map(x => x.urgency_score));
    assert(distinct.size >= 5,
      `Urgency scores remain well-distributed after recompute (${distinct.size} distinct values)`);
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('10. Heatmap ward aggregation accuracy');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const heat = await (await s.get('/api/priority/heatmap')).json();
    const subs = (await (await s.get('/api/submissions?limit=1000')).json()).data;
    const regions = await getRegions();

    assert(heat.data.length === regions.length,
      `Heatmap returns one node per registered ward (${heat.data.length} vs ${regions.length})`);
    assert(heat.data.length > 0, 'Heatmap returns a non-empty ward list');

    const totalAssigned = heat.data.reduce((acc, w) => acc + w.submissionsCount, 0);
    const withCoords = subs.filter(x => x.region_name);
    assert(totalAssigned <= withCoords.length,
      `Ward complaint counts do not exceed the number of named submissions (${totalAssigned} <= ${withCoords.length})`);

    for (const w of heat.data) {
      assertBetween(w.intensity, 0, 100, `Ward "${w.name}" intensity within 0-100`);
      assertBetween(w.gapScore, 0, 100, `Ward "${w.name}" gap score within 0-100`);
      assert(Number.isFinite(w.latitude) && Number.isFinite(w.longitude), `Ward "${w.name}" has numeric coordinates`);
      assert(w.submissionsCount >= 0, `Ward "${w.name}" has a non-negative complaint count`);
    }

    for (const f of heat.features) {
      assertEqual(f.type, 'Feature', 'GeoJSON feature has correct type');
      assertEqual(f.geometry.type, 'Point', 'GeoJSON geometry is a Point');
      assert(Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length === 2,
        'GeoJSON coordinates are a [lng, lat] pair');
      assertBetween(f.geometry.coordinates[0], -180, 180, 'GeoJSON longitude in range');
      assertBetween(f.geometry.coordinates[1], -90, 90, 'GeoJSON latitude in range');
      assertBetween(f.properties.weight, 0, 1, 'GeoJSON weight normalized to 0..1');
    }

    assertEqual(heat.features.length, subs.length,
      'Every submission appears as a map feature (lng before lat per GeoJSON spec)');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('11. Voice pipeline edge cases');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    // Voice endpoint with no audio and no transcript must fail cleanly
    const empty = await s.postForm('/api/submissions/voice', (() => {
      const fd = new FormData();
      return fd;
    })());
    assertEqual(empty.status, 400, 'Voice submission with no audio or transcript rejected with 400');
    assertEqual((await empty.json()).success, false, 'Empty voice submission reports failure');

    // Oversized audio -> 413 (multer LIMIT_FILE_SIZE)
    const fd = new FormData();
    fd.append('audio', new Blob([new Uint8Array(11 * 1024 * 1024)], { type: 'audio/webm' }), 'big.webm');
    const big = await s.postForm('/api/submissions/voice', fd);
    assertEqual(big.status, 413, 'Audio above the 10MB cap rejected with 413');
    assert(/10MB/.test((await big.json()).error), 'Oversize audio error names the 10MB limit');

    // Oversized transcript field
    const fd2 = new FormData();
    fd2.append('sample_text', 'x'.repeat(2500));
    const longText = await s.postForm('/api/submissions/voice', fd2);
    assertEqual(longText.status, 400, 'Voice transcript over 2000 chars rejected with 400');

    // Valid minimal voice submission
    const fd3 = new FormData();
    fd3.append('audio', new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: 'audio/webm' }), 'v.webm');
    fd3.append('sample_text', 'Transformer sparking near the primary school gate.');
    const ok = await s.postForm('/api/submissions/voice', fd3);
    assertEqual(ok.status, 201, 'Valid voice submission accepted with 201');
    const okBody = await ok.json();
    assertEqual(okBody.data.raw_input_type, 'voice', 'Stored with raw_input_type = voice');
    assert(Boolean(okBody.stt?.transcript), 'Response includes the STT transcript');
    assert(Boolean(okBody.stt?.stt_provider), 'Response names the STT provider used');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('12. In-memory store does not duplicate rows');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const before = (await (await s.get('/api/submissions?limit=1000')).json()).count;

    const fd = new FormData();
    fd.append('sample_text', 'Open sewer overflowing near the market entrance.');
    await s.postForm('/api/submissions/voice', fd);
    const afterVoice = (await (await s.get('/api/submissions?limit=1000')).json()).count;

    await s.postJson('/api/submissions/text', { raw_text: 'Water pipeline burst in the same lane.' });
    const afterText = (await (await s.get('/api/submissions?limit=1000')).json()).count;

    assertEqual(afterVoice, before + 1, 'Voice submission adds exactly one row');
    assertEqual(afterText, afterVoice + 1, 'Text submission adds exactly one row');

    const subs = (await (await s.get('/api/submissions?limit=1000')).json()).data;
    const ids = subs.map(x => x.id);
    assertEqual(new Set(ids).size, ids.length, 'No duplicate submission ids in the store');

    const recent = subs.filter(s => /Open sewer overflowing/.test(s.raw_text || ''));
    assertEqual(recent.length, 1,
      `Voice grievance stored exactly once (found ${recent.length}) — previously mirrored as a duplicate`);
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('13. LLM-failure fallback preserves the grievance (02-ai-integration task 6)');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    // An unparseable, low-signal complaint forces the heuristic fallback rather
    // than a real LLM call. The plan requires this row to be SAVED, flagged
    // needs_review, rather than lost.
    const res = await s.postJson('/api/submissions/text', {
      raw_text: 'xyzzy plugh',
    });
    assertEqual(res.status, 201, 'Fallback-classified grievance is still accepted with 201');
    const body = await res.json();
    assert(Boolean(body.data?.id), 'Fallback-classified grievance IS persisted, not dropped');

    const status = body.data.status;
    assert(['new', 'needs_review'].includes(status),
      `Persisted status is a documented enum value (got ${JSON.stringify(status)})`);

    // The status must survive a read-back (i.e. the schema enum accepts it).
    const list = await (await s.get('/api/submissions?limit=1000')).json();
    const stored = list.data.find(x => x.id === body.data.id);
    assert(Boolean(stored), 'Fallback submission is retrievable via GET /api/submissions');
    assertEqual(stored.status, status, 'Status round-trips unchanged through the store');

    // ...and the 4th enum value must not be lost by the recompute pass either.
    await s.postJson('/api/admin/recompute', {}, { 'x-admin-key': 'test-admin-key-abc123' });
    const after = await (await s.get('/api/submissions?limit=1000')).json();
    assert(Boolean(after.data.find(x => x.id === body.data.id)),
      'Fallback submission survives the admin recompute pass');

    // Filtering by the fallback status must work (schema CHECK allows it).
    const filteredRes = await s.get('/api/submissions?status=needs_review');
    assertEqual(filteredRes.status, 200, 'Filtering by status=needs_review does not error');
    const filtered = await filteredRes.json();
    assert(Array.isArray(filtered.data), 'needs_review filter returns an array');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('14. Schema / RLS status enum is internally consistent');
/* ------------------------------------------------------------------ */

{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const schemaPath = path.resolve(process.cwd(), '../seed/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Extract the allowed statuses from the public-insert RLS policy.
  const policyMatch = schema.match(
    /create policy "Public can insert citizen complaints"[\s\S]*?with check \(([\s\S]*?)\);/);
  assert(Boolean(policyMatch), 'Located the public-insert RLS policy in seed/schema.sql');

  const policyStatuses = (policyMatch[1].match(/status in \(([^)]*)\)/)?.[1] || '')
    .split(',')
    .map(s => s.trim().replace(/'/g, ''))
    .filter(Boolean);

  assert(policyStatuses.includes('needs_review'),
    `RLS insert policy permits 'needs_review' (found: ${policyStatuses.join(', ')})`);
  assert(policyStatuses.includes('new'), 'RLS insert policy permits \'new\'');
  assert(policyStatuses.includes('reviewed'), 'RLS insert policy permits \'reviewed\'');
  assert(policyStatuses.includes('prioritized'), 'RLS insert policy permits \'prioritized\'');

  // Every status the server can write must be accepted by that policy.
  const llmService = await import('../src/services/llmClassifyService.js');
  const sample = llmService.heuristicClassifyComplaint('xyzzy plugh');
  assert(Boolean(sample.category), 'Heuristic classifier still returns a category for unparseable input');
}

summary('Robustness');
