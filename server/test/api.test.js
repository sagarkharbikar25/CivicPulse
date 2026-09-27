/**
 * CivicPulse API Integration Test Suite
 * Tests all 5 core endpoints + health and stubs against Express server.
 */

import http from 'http';
import app from '../src/index.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('============================================================');
  console.log(' CivicPulse API Integration Test Suite');
  console.log('============================================================');

  // Start test server on ephemeral port
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}\n`);

  try {
    // 1. Health check & Security Headers
    console.log('Test 1: Health Check & Security Headers (GET /api/health)');
    const resHealth = await fetch(`${baseUrl}/api/health`);
    const dataHealth = await resHealth.json();
    assert(resHealth.status === 200, 'Health endpoint returns 200 OK');
    assert(dataHealth.status === 'ok', 'Status is "ok"');
    assert(dataHealth.branch === 'feature/core-backend', 'Reports correct branch');
    assert(resHealth.headers.get('x-frame-options') === 'DENY', 'Security Header: X-Frame-Options is DENY');
    assert(resHealth.headers.get('x-content-type-options') === 'nosniff', 'Security Header: X-Content-Type-Options is nosniff');

    // 2. Regions
    console.log('\nTest 2: Regions Data (GET /api/regions)');
    const resRegions = await fetch(`${baseUrl}/api/regions`);
    const dataRegions = await resRegions.json();
    assert(resRegions.status === 200, 'Regions endpoint returns 200 OK');
    assert(dataRegions.success === true, 'Response marked success');
    assert(Array.isArray(dataRegions.data) && dataRegions.data.length >= 10, `Loaded ${dataRegions.count} authentic wards (>= 10)`);
    assert(dataRegions.data[0].infra_gap_score !== undefined, 'Contains infra_gap_score');

    // 3. Submissions (list + filters)
    console.log('\nTest 3: Submissions List & Filters (GET /api/submissions)');
    const resSubmissions = await fetch(`${baseUrl}/api/submissions`);
    const dataSubmissions = await resSubmissions.json();
    assert(resSubmissions.status === 200, 'Submissions endpoint returns 200 OK');
    assert(dataSubmissions.count > 0, `Returned ${dataSubmissions.count} submissions`);
    
    // Test filtering by category
    const resWater = await fetch(`${baseUrl}/api/submissions?category=water`);
    const dataWater = await resWater.json();
    assert(dataWater.data.every(s => s.category === 'water'), 'Filtering by category=water returns only water issues');

    // 4. Priority Ranked Projects
    console.log('\nTest 4: Priority Projects (GET /api/priority)');
    const resPriority = await fetch(`${baseUrl}/api/priority`);
    const dataPriority = await resPriority.json();
    assert(resPriority.status === 200, 'Priority endpoint returns 200 OK');
    assert(Array.isArray(dataPriority.data) && dataPriority.data.length > 0, 'Returns non-empty priority projects');
    assert(dataPriority.data[0].final_priority_rank === 1, 'Top item has final_priority_rank = 1');
    assert(Boolean(dataPriority.data[0].recommended_action), 'Project includes recommended action');

    // 5. Priority Heatmap GeoJSON
    console.log('\nTest 5: Heatmap GeoJSON (GET /api/priority/heatmap)');
    const resHeatmap = await fetch(`${baseUrl}/api/priority/heatmap`);
    const dataHeatmap = await resHeatmap.json();
    assert(resHeatmap.status === 200, 'Heatmap endpoint returns 200 OK');
    assert(dataHeatmap.type === 'FeatureCollection', 'Returns GeoJSON FeatureCollection');
    assert(Array.isArray(dataHeatmap.features), 'Contains features array');
    if (dataHeatmap.features.length > 0) {
      const feat = dataHeatmap.features[0];
      assert(feat.geometry.type === 'Point', 'Feature geometry is Point');
      assert(feat.properties.weight >= 0 && feat.properties.weight <= 1.0, 'Weight is normalized between 0.0 and 1.0');
    }

    // 6. Text Submission POST & XSS Sanitization
    console.log('\nTest 6: Submit Text Complaint & XSS Sanitization (POST /api/submissions/text)');
    const resPostText = await fetch(`${baseUrl}/api/submissions/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text: "<script>alert('xss')</script>Severely damaged storm drainage overflowing near Kurla station platform 1.",
        category: 'water',
        region_name: 'Ward 9 - Kurla West / LBS Marg',
      }),
    });
    const dataPostText = await resPostText.json();
    assert(resPostText.status === 201, 'Text submission returns 201 Created');
    assert(dataPostText.data.urgency_score > 0, `Auto-calculated urgency score: ${dataPostText.data?.urgency_score}`);
    assert(!dataPostText.data.raw_text.includes('<script>'), 'XSS Sanitization: Script tag stripped from raw_text');

    // 7. Input Validation Rejection
    console.log('\nTest 7: Input Validation on Empty Content');
    const resPostEmpty = await fetch(`${baseUrl}/api/submissions/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: '   ' }),
    });
    assert(resPostEmpty.status === 400, 'Empty raw_text is rejected with 400 Bad Request');

    // 8. Voice Submission Pipeline (POST /api/submissions/voice)
    console.log('\nTest 8: Voice Submission Pipeline (POST /api/submissions/voice)');
    const resPostVoice = await fetch(`${baseUrl}/api/submissions/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_text: 'High voltage transformer spark and oil leakage outside school.' }),
    });
    const dataPostVoice = await resPostVoice.json();
    assert(resPostVoice.status === 201, 'Voice pipeline returns 201 Created');
    assert(dataPostVoice.success === true, 'Voice pipeline reports success');
    assert(Boolean(dataPostVoice.stt?.transcript), 'Voice pipeline includes STT transcript');

    // 9. Admin Security Guard & Recompute POST
    console.log('\nTest 9: Admin Endpoint Authentication Guard');
    const resRecomputeUnauth = await fetch(`${baseUrl}/api/admin/recompute`, { method: 'POST' });
    assert(resRecomputeUnauth.status === 401, 'Admin recompute rejects request without x-admin-key (401 Unauthorized)');

    const resRecomputeAuth = await fetch(`${baseUrl}/api/admin/recompute`, {
      method: 'POST',
      headers: { 'x-admin-key': 'civicpulse-admin-dev-key' },
    });
    const dataRecomputeAuth = await resRecomputeAuth.json();
    assert(resRecomputeAuth.status === 200, 'Admin recompute succeeds with valid x-admin-key (200 OK)');
    assert(dataRecomputeAuth.result?.success === true, 'Recompute reports success');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log('\n============================================================');
    console.log(` API Tests Summary: ${passed} passed, ${failed} failed.`);
    console.log('============================================================\n');
    if (failed > 0) {
      process.exitCode = 1;
    }
  }
}

runTests();
