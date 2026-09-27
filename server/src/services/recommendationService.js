/**
 * CivicPulse Policy Recommendation Service
 * Branch: feature/ai-integration
 * 
 * Generates concise, high-impact 1-sentence municipal policy recommendations
 * for top-ranked priority projects.
 * Caches recommendations in-memory to prevent redundant LLM invocations.
 */

import dotenv from 'dotenv';
dotenv.config();

const LLM_API_KEY = process.env.LLM_API_KEY?.trim();

// In-memory cache: key -> { action: string, timestamp: number }
const recommendationCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generates a one-sentence public works policy recommendation for a project.
 * 
 * @param {Object} project - priority_projects record
 * @returns {Promise<string>} one-sentence actionable policy recommendation
 */
export async function generatePolicyRecommendation(project) {
  if (!project) return 'Initiate municipal field inspection and assess infrastructure gap.';

  const cacheKey = `${project.region_name}::${project.category}::${project.submission_count}`;
  const now = Date.now();

  if (recommendationCache.has(cacheKey)) {
    const cached = recommendationCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.action;
    }
  }

  // 1. Try remote LLM generation if key is present and not running in automated test mode
  if (LLM_API_KEY && process.env.NODE_ENV !== 'test') {
    try {
      const prompt = `As a municipal public works director, provide EXACTLY ONE direct, actionable, technical sentence instructing contractors on how to fix this civic emergency:
Ward: ${project.region_name}
Category: ${project.category}
Citizen Complaint Count: ${project.submission_count}
Average Urgency: ${project.avg_urgency}/100.
Do not include any greeting or explanation. Exactly one sentence.`;

      const response = await callLightweightLlm(prompt);
      if (response && response.length > 15) {
        recommendationCache.set(cacheKey, { action: response, timestamp: now });
        return response;
      }
    } catch (err) {
      console.warn('[Recommendation Service] Remote LLM recommendation failed, using deterministic strategy:', err.message);
    }
  }

  // 2. Deterministic high-impact policy recommendations
  const actionTemplates = {
    water: `Deploy emergency pipeline repair crew and install secondary 50,000L potable distribution manifold in ${project.region_name}.`,
    electricity: `Dispatch rapid-response grid technicians for transformer replacement and overhead high-voltage cable clearance in ${project.region_name}.`,
    roads: `Authorize immediate cold-mix asphalt pothole repair and structural road surface grading along arterial corridors in ${project.region_name}.`,
    sanitation: `Mobilize 3 mechanized solid-waste compactors and sanitize the open drainage perimeter across ${project.region_name}.`,
    transport: `Reconfigure transit feeder bus frequency and clear high-density traffic choke points in ${project.region_name}.`,
    other: `Dispatch municipal field assessment team for on-site diagnostic review and structural risk appraisal in ${project.region_name}.`,
  };

  const selectedAction = actionTemplates[project.category?.toLowerCase()] || actionTemplates.other;
  recommendationCache.set(cacheKey, { action: selectedAction, timestamp: now });
  return selectedAction;
}

/**
 * Lightweight LLM call wrapper
 */
async function callLightweightLlm(prompt) {
  if (LLM_API_KEY.startsWith('AIza') || LLM_API_KEY.startsWith('AQ') || process.env.LLM_PROVIDER === 'gemini') {
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${LLM_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 60 },
      }),
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  }

  const isGroq = LLM_API_KEY.startsWith('gsk_') || process.env.LLM_PROVIDER === 'groq';
  const url = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  const model = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 60,
    }),
    signal: AbortSignal.timeout(3000),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim();
}
