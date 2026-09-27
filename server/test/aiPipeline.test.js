/**
 * CivicPulse AI Pipeline Test Suite (16 Test Cases)
 * Branch: feature/ai-integration
 * 
 * Tests:
 * 1. Multilingual classification (Hindi, Marathi, English, Hinglish)
 * 2. Strict JSON contract validation
 * 3. Urgency scoring across severities (0.0 to 10.0 scale)
 * 4. Whisper STT transcription & voice submission pipeline
 * 5. Dynamic priority ranking and policy recommendation generation
 * 6. Graceful fallback on LLM failure / timeout
 */

import http from 'http';
import app from '../src/index.js';
import { classifyComplaint, heuristicClassifyComplaint } from '../src/services/llmClassifyService.js';
import { transcribeAudio } from '../src/services/whisperService.js';
import { generatePolicyRecommendation } from '../src/services/recommendationService.js';

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

async function runTestSuite() {
  console.log('============================================================');
  console.log(' CivicPulse AI Pipeline & Multilingual Test Suite (16 Cases)');
  console.log('============================================================\n');

  // Start test server on ephemeral port
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test API Server running at: ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Hindi Water Emergency
    // -------------------------------------------------------------------------
    console.log('Test 1: Hindi Water Emergency Classification');
    const text1 = 'Hamare chawl me 90 feet road par main paani pipe phat gaya hai, 3 din se peene ka paani nahi aa raha.';
    const res1 = await classifyComplaint(text1);
    assert(res1.category === 'water', `Category is water (Got: ${res1.category})`);
    assert(res1.severity >= 8.0, `High emergency severity >= 8.0 (Got: ${res1.severity})`);
    assert(res1.region_guess?.includes('Dharavi'), `Region detected as Dharavi (Got: ${res1.region_guess})`);

    // -------------------------------------------------------------------------
    // TEST 2: Marathi Road Hazard with Emergency Vehicle
    // -------------------------------------------------------------------------
    console.log('\nTest 2: Marathi Road Hazard with Trapped Ambulance');
    const text2 = 'Kurla station jawal motha khadda padla ahe, ambulance adakli hoti kal ratri.';
    const res2 = await classifyComplaint(text2);
    assert(res2.category === 'roads', `Category is roads (Got: ${res2.category})`);
    assert(res2.severity >= 8.0, `Life risk severity >= 8.0 (Got: ${res2.severity})`);
    assert(res2.region_guess?.includes('Kurla'), `Region detected as Kurla (Got: ${res2.region_guess})`);

    // -------------------------------------------------------------------------
    // TEST 3: English Electrical Sparking Hazard outside School
    // -------------------------------------------------------------------------
    console.log('\nTest 3: Electrical Sparking Hazard near School');
    const text3 = 'Sparking transformer right outside the primary school gate on Hill Road, children passing by.';
    const res3 = await classifyComplaint(text3);
    assert(res3.category === 'electricity', `Category is electricity (Got: ${res3.category})`);
    assert(res3.severity >= 8.5, `School hazard severity >= 8.5 (Got: ${res3.severity})`);
    assert(res3.region_guess?.includes('Bandra'), `Region detected as Bandra (Got: ${res3.region_guess})`);

    // -------------------------------------------------------------------------
    // TEST 4: Biohazard Sanitation Delay
    // -------------------------------------------------------------------------
    console.log('\nTest 4: Sanitation & Garbage Accumulation');
    const text4 = 'Garbage compactor has missed Govandi sector 4 for 12 days, garbage spilling into road and smelling terrible.';
    const res4 = await classifyComplaint(text4);
    assert(res4.category === 'sanitation', `Category is sanitation (Got: ${res4.category})`);
    assert(res4.severity >= 7.0, `Sanitation delay severity >= 7.0 (Got: ${res4.severity})`);
    assert(res4.region_guess?.includes('Chembur') || res4.region_guess?.includes('Govandi'), 'Ward matched Govandi/Chembur');

    // -------------------------------------------------------------------------
    // TEST 5: Hinglish Traffic & Signal Failure
    // -------------------------------------------------------------------------
    console.log('\nTest 5: Hinglish Traffic Signal Outage');
    const text5 = 'Bandra west station ke paas traffic light band hai, subah se jam laga hua hai.';
    const res5 = await classifyComplaint(text5);
    assert(['electricity', 'roads'].includes(res5.category), `Category is electricity or roads (Got: ${res5.category})`);
    assert(res5.severity >= 5.5, `Gridlock severity >= 5.5 (Got: ${res5.severity})`);

    // -------------------------------------------------------------------------
    // TEST 6: Vague / Low-Context Complaint
    // -------------------------------------------------------------------------
    console.log('\nTest 6: Vague / Low-Context Complaint Handling');
    const text6 = 'Everything is broken here.';
    const res6 = await classifyComplaint(text6);
    assert(res6.category === 'other', `Vague complaint mapped to 'other' (Got: ${res6.category})`);
    assert(res6.severity <= 5.0, `Vague complaint has low-moderate severity <= 5.0 (Got: ${res6.severity})`);

    // -------------------------------------------------------------------------
    // TEST 7: Minor Aesthetic Issue (Park Bench)
    // -------------------------------------------------------------------------
    console.log('\nTest 7: Minor Aesthetic Maintenance (Chipped Paint)');
    const text7 = 'The park bench in Oval Maidan has chipped paint and needs aesthetic touchup.';
    const res7 = await classifyComplaint(text7);
    assert(res7.category === 'other', `Aesthetic issue mapped to 'other' (Got: ${res7.category})`);
    assert(res7.severity < 3.5, `Aesthetic issue has low severity < 3.5 (Got: ${res7.severity})`);

    // -------------------------------------------------------------------------
    // TEST 8: Multi-Issue Compound Complaint
    // -------------------------------------------------------------------------
    console.log('\nTest 8: Multi-Issue Compound Complaint (Water + Road Flood)');
    const text8 = 'Water pipeline burst and flooded the road causing traffic jam in LBS Marg.';
    const res8 = await classifyComplaint(text8);
    assert(['water', 'roads'].includes(res8.category), `Classified into primary category (Got: ${res8.category})`);
    assert(res8.severity >= 7.5, `Compound disruption severity >= 7.5 (Got: ${res8.severity})`);

    // -------------------------------------------------------------------------
    // TEST 9: IT Corridor Infrastructure Disruption
    // -------------------------------------------------------------------------
    console.log('\nTest 9: IT Corridor Cable Trench Damage');
    const text9 = 'Underground fiber trenching left open on Hinjewadi Phase 2 main road damaging tires.';
    const res9 = await classifyComplaint(text9);
    assert(res9.category === 'roads', `Category is roads (Got: ${res9.category})`);
    assert(res9.region_guess?.includes('Hinjewadi'), 'Identified Hinjewadi IT corridor');

    // -------------------------------------------------------------------------
    // TEST 10: Heritage Old City Stone Masonry Risk
    // -------------------------------------------------------------------------
    console.log('\nTest 10: Heritage Structure Masonry Hazard');
    const text10 = 'Stone masonry crumbling from archway near Lad Bazaar Charminar heritage entrance.';
    const res10 = await classifyComplaint(text10);
    assert(res10.category === 'roads' || res10.category === 'other', 'Category detected properly');
    assert(res10.region_guess?.includes('Charminar'), 'Identified Charminar Heritage ward');

    // -------------------------------------------------------------------------
    // TEST 11: Hospital Perimeter Biohazard
    // -------------------------------------------------------------------------
    console.log('\nTest 11: Critical Hospital Vicinity Hazard');
    const text11 = 'Hospital emergency entrance blocked by overflowing sewage line and medical waste.';
    const res11 = await classifyComplaint(text11);
    assert(res11.severity >= 9.0, `Hospital emergency has critical severity >= 9.0 (Got: ${res11.severity})`);

    // -------------------------------------------------------------------------
    // TEST 12: Industrial Area Power Outage
    // -------------------------------------------------------------------------
    console.log('\nTest 12: Industrial Power Outage');
    const text12 = 'Total power cut in MIDC industrial street 14 for 18 hours, factories shut down.';
    const res12 = await classifyComplaint(text12);
    assert(res12.category === 'electricity', `Category is electricity (Got: ${res12.category})`);
    assert(res12.region_guess?.includes('MIDC') || res12.region_guess?.includes('Andheri'), 'Identified Andheri MIDC');

    // -------------------------------------------------------------------------
    // TEST 13: Policy Recommendation Generator
    // -------------------------------------------------------------------------
    console.log('\nTest 13: Policy Recommendation Service');
    const dummyProject = {
      region_name: 'Ward 12 - Dharavi / Shahu Nagar',
      category: 'water',
      submission_count: 8,
      avg_urgency: 92.5,
    };
    const recommendation = await generatePolicyRecommendation(dummyProject);
    assert(typeof recommendation === 'string' && recommendation.length > 20, 'Generated meaningful policy recommendation');
    assert(recommendation.includes('Dharavi'), 'Recommendation is customized with ward name');

    // -------------------------------------------------------------------------
    // TEST 14: End-to-End POST /api/submissions/text Pipeline
    // -------------------------------------------------------------------------
    console.log('\nTest 14: Full Pipeline POST /api/submissions/text');
    const t0 = Date.now();
    const resPostText = await fetch(`${baseUrl}/api/submissions/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text: 'Drinking water pipeline burst near 90 feet road Dharavi, zero water supply.',
      }),
    });
    const dataPostText = await resPostText.json();
    const latency = Date.now() - t0;

    assert(resPostText.status === 201, 'Text endpoint returns HTTP 201 Created');
    assert(dataPostText.classification?.category === 'water', 'Classification category is water');
    assert(dataPostText.data?.urgency_score >= 80, `Scored high urgency (Got: ${dataPostText.data?.urgency_score})`);
    assert(Boolean(dataPostText.priority_impact?.top_project), 'Priority projects recalculated and returned');
    assert(latency < 3000, `Pipeline responded under 3 seconds (Took: ${latency}ms)`);

    // -------------------------------------------------------------------------
    // TEST 15: Voice Pipeline Simulation (POST /api/submissions/voice)
    // -------------------------------------------------------------------------
    console.log('\nTest 15: Voice Pipeline via POST /api/submissions/voice');
    const formData = new FormData();
    const dummyAudioBlob = new Blob(['RIFF....WAVEfmt '], { type: 'audio/webm' });
    formData.append('audio', dummyAudioBlob, 'citizen_voice.webm');
    formData.append('sample_text', 'LBS Marg bridge approach has huge crater, traffic halted.');

    const resPostVoice = await fetch(`${baseUrl}/api/submissions/voice`, {
      method: 'POST',
      body: formData,
    });
    const dataPostVoice = await resPostVoice.json();

    assert(resPostVoice.status === 201, 'Voice endpoint returns HTTP 201 Created');
    assert(dataPostVoice.stt?.transcript?.length > 10, 'Audio transcribed successfully');
    assert(dataPostVoice.classification?.category === 'roads', 'Voice transcript correctly categorized');
    assert(dataPostVoice.data?.raw_input_type === 'voice', 'Recorded as voice submission in database');

    // -------------------------------------------------------------------------
    // TEST 16: Fault-Tolerance & Fallback Resilience
    // -------------------------------------------------------------------------
    console.log('\nTest 16: Fault-Tolerance & Fallback Mode Validation');
    const fallbackTest = heuristicClassifyComplaint('Uncollected garbage overflowing in Mankhurd transit camp.');
    assert(fallbackTest.category === 'sanitation', 'Fallback correctly identifies sanitation');
    assert(fallbackTest.region_guess?.includes('Mankhurd') || fallbackTest.region_guess?.includes('Shivaji'), 'Fallback extracts ward');
    assert(typeof fallbackTest.translated_text === 'string', 'Fallback provides translation text');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await new Promise(resolve => server.close(resolve));
    console.log('\n============================================================');
    console.log(` AI Integration Test Summary: ${passed} passed, ${failed} failed.`);
    console.log('============================================================\n');

    if (failed > 0) {
      process.exitCode = 1;
    }
  }
}

runTestSuite();
