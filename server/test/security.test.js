/**
 * CivicPulse Security & Defense-in-Depth Test Suite
 *
 * Validates the controls claimed in plan.md §12 / SECURITY.md:
 *   1. HTTP security headers (Helmet, HSTS, nosniff, frame-deny, CSP)
 *   2. Strict CORS origin allowlisting
 *   3. Tiered rate limiting (general + citizen intake)
 *   4. XSS / injection sanitization
 *   5. Request payload size limits
 *   6. Admin endpoint authentication (fail-closed)
 */

process.env.NODE_ENV = 'test';
process.env.ADMIN_API_KEY = 'test-admin-key-abc123';
process.env.CLIENT_ORIGIN = 'https://civicpulse.example,http://localhost:5173';

import { suite, group, assert, assertEqual, startTestServer, summary } from './harness.js';

suite('Security & Defense-in-Depth');

/* ------------------------------------------------------------------ */
group('1. HTTP security headers');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const res = await s.get('/api/health');
    const h = res.headers;

    assertEqual(h.get('x-content-type-options'), 'nosniff', 'X-Content-Type-Options: nosniff');
    assertEqual(h.get('x-frame-options'), 'DENY', 'X-Frame-Options: DENY');
    assert(Boolean(h.get('content-security-policy')), 'Content-Security-Policy header present');
    assert(!h.get('x-powered-by'), 'X-Powered-By removed (header fingerprinting)');
    assert(h.get('content-security-policy')?.includes('default-src'), 'CSP declares default-src');
    assertEqual(res.status, 200, 'Health endpoint reachable');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('2. CORS origin allowlist');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const allowed = await s.get('/api/health', { Origin: 'https://civicpulse.example' });
    assertEqual(allowed.headers.get('access-control-allow-origin'), 'https://civicpulse.example',
      'Configured CLIENT_ORIGIN is echoed back');

    const localAllowed = await s.get('/api/health', { Origin: 'http://localhost:5173' });
    assertEqual(localAllowed.headers.get('access-control-allow-origin'), 'http://localhost:5173',
      'Second configured origin is allowed');

    // The critical regression: origin:true used to reflect ANY origin.
    const evil = await s.get('/api/health', { Origin: 'https://evil-attacker.example' });
    assert(!evil.headers.get('access-control-allow-origin'),
      'Unlisted origin receives NO Access-Control-Allow-Origin header');
    assert(evil.status === 403 || evil.status >= 400,
      `Unlisted origin is rejected (got ${evil.status})`);

    const nullish = await s.get('/api/health', { Origin: 'null' });
    assert(!nullish.headers.get('access-control-allow-origin'), 'Origin "null" is not allowed');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('3. XSS / injection sanitization');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const payloads = [
      "<script>alert('xss')</script>Water pipeline burst in the ward.",
      '<img src=x onerror=alert(1)>Road collapse near the bridge.',
      '<svg/onload=alert(1)>Transformer sparking outside the school.',
      'javascript:alert(1)Broken streetlight for 3 weeks.',
      '<iframe src="javascript:alert(1)"></iframe>Garbage not collected.',
    ];

    for (const payload of payloads) {
      const res = await s.postJson('/api/submissions/text', { raw_text: payload });
      const body = await res.json();
      const stored = body?.data?.raw_text ?? '';
      assert(res.status === 201, `Payload accepted after sanitization (${payload.slice(0, 32)}...)`);
      assert(!/<script/i.test(stored), 'Stored text contains no <script> tag');
      assert(!/onerror\s*=/i.test(stored), 'Stored text contains no onerror handler');
      assert(!/onload\s*=/i.test(stored), 'Stored text contains no onload handler');
      assert(!/<iframe/i.test(stored), 'Stored text contains no iframe');
      assert(!/javascript:/i.test(stored), 'Stored text contains no javascript: URI');
    }
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('4. Input validation & payload limits');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const empty = await s.postJson('/api/submissions/text', { raw_text: '' });
    assertEqual(empty.status, 400, 'Empty raw_text rejected with 400');
    assertEqual((await empty.json()).success, false, 'Empty body response has success:false');

    const whitespace = await s.postJson('/api/submissions/text', { raw_text: '     \n\t  ' });
    assertEqual(whitespace.status, 400, 'Whitespace-only raw_text rejected with 400');

    const missing = await s.postJson('/api/submissions/text', {});
    assertEqual(missing.status, 400, 'Missing raw_text rejected with 400');

    const nonString = await s.postJson('/api/submissions/text', { raw_text: { a: 1 } });
    assertEqual(nonString.status, 400, 'Non-string raw_text rejected with 400');

    const tooLong = await s.postJson('/api/submissions/text', { raw_text: 'a'.repeat(2001) });
    assertEqual(tooLong.status, 400, 'raw_text over 2000 chars rejected with 400');
    assert(/2000 characters/.test((await tooLong.json()).error), 'Oversize error names the documented limit');

    const justUnder = await s.postJson('/api/submissions/text', {
      raw_text: `Road damage near Dharavi. ${'x'.repeat(1900)}`,
    });
    assertEqual(justUnder.status, 201, 'raw_text just under the limit is accepted');

    // Coordinate validation
    for (const bad of [91, -91, 'abc']) {
      const r = await s.postJson('/api/submissions/text', { raw_text: 'Water issue reported.', latitude: bad });
      assertEqual(r.status, 400, `Invalid latitude ${JSON.stringify(bad)} rejected with 400`);
    }
    for (const bad of [181, -181]) {
      const r = await s.postJson('/api/submissions/text', { raw_text: 'Water issue reported.', longitude: bad });
      assertEqual(r.status, 400, `Invalid longitude ${bad} rejected with 400`);
    }

    // 100kb JSON body cap (SECURITY.md §12.2)
    const huge = await s.postJson('/api/submissions/text', { raw_text: 'b'.repeat(150 * 1024) });
    assertEqual(huge.status, 413, 'Payload above the 100kb body cap rejected with 413');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('5. Admin endpoint authentication');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const noKey = await s.postJson('/api/admin/recompute', {});
    assertEqual(noKey.status, 401, 'Missing admin key rejected with 401');
    assert(!/civicpulse-admin-dev-key/.test(await noKey.text()),
      'Error message does not leak the development key');

    const wrongKey = await s.postJson('/api/admin/recompute', {}, { 'x-admin-key': 'wrong-key' });
    assertEqual(wrongKey.status, 401, 'Incorrect admin key rejected with 401');

    const emptyKey = await s.postJson('/api/admin/recompute', {}, { 'x-admin-key': '   ' });
    assertEqual(emptyKey.status, 401, 'Blank admin key rejected with 401');

    const correct = await s.postJson('/api/admin/recompute', {}, { 'x-admin-key': 'test-admin-key-abc123' });
    assertEqual(correct.status, 200, 'Correct admin key accepted with 200');
    assertEqual((await correct.json()).result.success, true, 'Recompute reports success');

    const bearer = await s.postJson('/api/admin/recompute', {}, { Authorization: 'Bearer test-admin-key-abc123' });
    assertEqual(bearer.status, 200, 'Bearer token accepted as an alternative to x-admin-key');

    // Prefix of the real key must not be accepted
    const prefix = await s.postJson('/api/admin/recompute', {}, { 'x-admin-key': 'test-admin-key-abc12' });
    assertEqual(prefix.status, 401, 'Truncated key prefix rejected with 401');
  } finally {
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('6. Admin auth fails closed when unconfigured');
/* ------------------------------------------------------------------ */

{
  // Simulate a production deployment with ADMIN_API_KEY removed
  delete process.env.ADMIN_API_KEY;
  const s = await startTestServer();
  try {
    const res = await s.postJson('/api/admin/recompute', {}, { 'x-admin-key': 'anything' });
    assertEqual(res.status, 503, 'Unconfigured admin key locks the route (503) rather than accepting anything');
    assertEqual((await res.json()).success, false, 'Locked route returns success:false');
  } finally {
    await s.close();
    process.env.ADMIN_API_KEY = 'test-admin-key-abc123';
  }
}

/* ------------------------------------------------------------------ */
group('7. Tiered rate limiting (strict mode)');
/* ------------------------------------------------------------------ */

{
  // RATE_LIMIT_STRICT forces enforcement on loopback, and the budgets are
  // lowered so the limiter can be verified without 10k requests.
  const s = await startTestServer(() => {
    process.env.RATE_LIMIT_STRICT = 'true';
    process.env.RATE_LIMIT_MAX_GENERAL = '5';
    process.env.RATE_LIMIT_MAX_INTAKE = '3';
  });
  try {
    const first = await s.get('/api/health');
    assertEqual(first.status, 200, 'First request under strict rate limiting succeeds');
    assert(Boolean(first.headers.get('ratelimit-limit') || first.headers.get('ratelimit')),
      'RateLimit-* headers are exposed to clients');
    assertEqual(first.headers.get('ratelimit-policy') !== null, true, 'RateLimit-Policy header present');

    // Exhaust the general budget (5)
    let limited = false;
    for (let i = 0; i < 20; i++) {
      const r = await s.get('/api/health');
      if (r.status === 429) { limited = true; break; }
    }
    assert(limited, 'General rate limiter returns 429 once the window budget is exhausted');

    const rl = await s.get('/api/health');
    assertEqual(rl.status, 429, 'Subsequent requests stay rate limited');
    const rlBody = await rl.json();
    assertEqual(rlBody.success, false, 'Rate limit body carries success:false');
    assert(/too many requests/i.test(rlBody.error), 'Rate limit body explains the cause');
  } finally {
    delete process.env.RATE_LIMIT_STRICT;
    delete process.env.RATE_LIMIT_MAX_GENERAL;
    delete process.env.RATE_LIMIT_MAX_INTAKE;
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('7b. Intake limiter is stricter than the general limiter');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer(() => {
    process.env.RATE_LIMIT_STRICT = 'true';
    process.env.RATE_LIMIT_MAX_GENERAL = '100';
    process.env.RATE_LIMIT_MAX_INTAKE = '2';
  });
  try {
    const a = await s.postJson('/api/submissions/text', { raw_text: 'Road damage near Dharavi junction.' });
    assertEqual(a.status, 201, 'First citizen submission accepted');
    const b = await s.postJson('/api/submissions/text', { raw_text: 'Water pipeline burst near Sitabuldi.' });
    assertEqual(b.status, 201, 'Second citizen submission accepted');
    const c = await s.postJson('/api/submissions/text', { raw_text: 'Transformer sparking near the school.' });
    assertEqual(c.status, 429, 'Third citizen submission blocked by the stricter intake limiter');
  } finally {
    delete process.env.RATE_LIMIT_STRICT;
    delete process.env.RATE_LIMIT_MAX_GENERAL;
    delete process.env.RATE_LIMIT_MAX_INTAKE;
    await s.close();
  }
}

/* ------------------------------------------------------------------ */
group('8. Information disclosure');
/* ------------------------------------------------------------------ */

{
  const s = await startTestServer();
  try {
    const notFound = await s.get('/api/this-route-does-not-exist');
    assertEqual(notFound.status, 404, 'Unknown /api route returns 404');
    const nfBody = await notFound.json();
    assertEqual(nfBody.success, false, '404 body carries success:false');
    assert(Boolean(nfBody.error), '404 body includes an error message');

    const root = await s.get('/');
    assertEqual(root.status, 404, 'Unmapped root path returns 404 instead of hanging');

    const health = await (await s.get('/api/health')).json();
    assert(!('SUPABASE_SERVICE_ROLE_KEY' in health), 'Health check does not leak env var names/values');
    assert(!JSON.stringify(health).includes('service_role'), 'Health check does not leak the service role key');
  } finally {
    await s.close();
  }
}

summary('Security');
