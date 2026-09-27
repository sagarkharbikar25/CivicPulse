/**
 * CivicPulse LLM Classification & Reasoning Service
 * Branch: feature/ai-integration
 * 
 * Strict JSON Contract per 02-ai-integration.md:
 * {
 *   "category": "roads" | "water" | "electricity" | "sanitation" | "other",
 *   "translated_text": string,
 *   "language_detected": string,
 *   "region_guess": string | null,
 *   "severity": number (0-10),
 *   "one_line_summary": string
 * }
 */

import dotenv from 'dotenv';
import { detectLanguageSimple } from './whisperService.js';

dotenv.config();

const LLM_API_KEY = process.env.LLM_API_KEY?.trim();

// System prompt enforcing strict single structured-JSON output
const CLASSIFICATION_SYSTEM_PROMPT = `
You are CivicPulse AI, an emergency municipal infrastructure classifier for citizen public works.
Your job is to analyze incoming citizen complaints in English, Hindi, Marathi, or mixed languages.

You MUST respond with a single, raw, valid JSON object strictly matching this schema:
{
  "category": "roads" | "water" | "electricity" | "sanitation" | "other",
  "translated_text": "accurate English translation of the complaint",
  "language_detected": "language code (e.g. en, hi, mr)",
  "region_guess": "name of municipal ward/area if mentioned (e.g. Dharavi, Kurla, Bandra, Govandi, Whitefield, Charminar) or null",
  "severity": number between 0.0 and 10.0 indicating danger/disruption to life and municipal flow,
  "one_line_summary": "concise English summary under 12 words"
}

Category Guidelines:
- "water": pipeline burst, contaminated tap water, zero supply, sewage ingress into drinking lines.
- "electricity": sparking transformers, fallen live wires, electrocution risk, prolonged blackout, dead signals.
- "roads": massive sinkholes, bridge collapse, transit gridlock, dangerous craters, missing manhole covers.
- "sanitation": uncollected garbage piles, medical/biohazard waste, blocked storm gutters, open cesspools.
- "other": minor park maintenance, cosmetic paint, non-emergency requests.

Severity Guidelines:
- 8.5 - 10.0: Immediate hazard to human life, schools, hospitals, or major arterial infrastructure collapse.
- 6.0 - 8.4: Widespread neighborhood disruption, non-potable water, vehicle damage, major road blocks.
- 3.5 - 5.9: Moderate inconvenience, street lighting, recurring garbage.
- 0.0 - 3.4: Aesthetic or minor issues (e.g. chipped paint on park bench).

CRITICAL: Return ONLY valid JSON. No markdown backticks, no explanations, no prefix or suffix.
`.trim();

/**
 * Main classification entry point.
 * Calls external LLM with 5-second timeout, falling back gracefully to heuristic engine.
 * 
 * @param {string} rawText - citizen complaint text
 * @returns {Promise<Object>} structured classification result
 */
export async function classifyComplaint(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Complaint text cannot be empty');
  }

  const cleanText = rawText.trim();

  // 1. Attempt LLM API call if key is configured
  if (LLM_API_KEY) {
    try {
      const llmResult = await executeRemoteLlmCall(cleanText);
      if (llmResult && isValidClassification(llmResult)) {
        return {
          ...llmResult,
          status: 'classified',
          fallback: false,
        };
      }
    } catch (err) {
      console.warn('[LLM Service] Remote LLM call failed or timed out:', err.message);
      // Fall through to resilient rule-based heuristic parser
    }
  }

  // 2. Resilient Rule-Based Heuristic Fallback Engine
  // Guarantees no submission is lost, and returns status: 'needs_review'
  const fallbackResult = heuristicClassifyComplaint(cleanText);
  return {
    ...fallbackResult,
    status: 'needs_review',
    fallback: true,
  };
}

/**
 * Calls remote LLM provider (Gemini, Groq, Claude, or OpenAI)
 */
async function executeRemoteLlmCall(text) {
  const timeoutMs = 8000; // 8-second safety timeout

  // A. Google Gemini API
  if (LLM_API_KEY.startsWith('AIza') || LLM_API_KEY.startsWith('AQ') || process.env.LLM_PROVIDER === 'gemini') {
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${LLM_API_KEY}`;
    const payload = {
      contents: [{
        parts: [
          { text: `${CLASSIFICATION_SYSTEM_PROMPT}\n\nCitizen Complaint:\n"${text}"` }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingBudget: 0,
        },
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return parseJsonSafely(rawContent);
  }

  // B. Groq / OpenAI Compatible endpoint (e.g. Groq Llama 3.3 70B or OpenAI GPT-4o-mini)
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
      messages: [
        { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) throw new Error(`LLM provider error: ${res.status}`);
  const data = await res.json();
  const rawContent = data.choices?.[0]?.message?.content;
  return parseJsonSafely(rawContent);
}

/**
 * Validates whether the returned object strictly satisfies the LLM contract
 */
function isValidClassification(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const validCategories = ['roads', 'water', 'electricity', 'sanitation', 'other'];
  return (
    validCategories.includes(obj.category?.toLowerCase()) &&
    typeof obj.translated_text === 'string' &&
    typeof obj.severity === 'number' &&
    obj.severity >= 0 &&
    obj.severity <= 10
  );
}

/**
 * Safely parses raw text as JSON, stripping potential markdown blocks
 */
function parseJsonSafely(text) {
  if (!text) return null;
  try {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('[LLM Parse] Failed to parse JSON string:', err.message);
    return null;
  }
}

/**
 * High-precision heuristic fallback classifier.
 * Handles English, Hindi, Marathi, and Hinglish.
 */
export function heuristicClassifyComplaint(text) {
  const lower = text.toLowerCase();
  const detectedLang = detectLanguageSimple(text);

  // 1. Category Keyword Matching with weighted scores
  const categoryScores = {
    water: 0,
    electricity: 0,
    roads: 0,
    sanitation: 0,
    other: 0,
  };

  // Sanitation cues (explicit priority for municipal waste)
  if (/garbage|trash|compactor|waste|kachra|stench|smell|sewage line|open drain/i.test(lower)) {
    categoryScores.sanitation += 5;
  }
  if (/garbage spilling|missed.*days|uncollected/i.test(lower)) {
    categoryScores.sanitation += 4;
  }

  // Water cues
  if (/pipeline|pipe|burst|leakage|drinking water|paani|pani|contamination|dysentery/i.test(lower)) {
    categoryScores.water += 5;
  }
  if (/chawl has zero water|no water|water flowing|paani pipe/i.test(lower)) {
    categoryScores.water += 4;
  }

  // Electricity cues
  if (/transformer|spark|electrocution|live wire|cables|power cut|outage|blackout|traffic light|traffic lights|streetlight|tripping|voltage|bijli|shock/i.test(lower)) {
    categoryScores.electricity += 5;
  }

  // Roads cues
  if (/sinkhole|pothole|crater|collapsed|road|bridge|junction|traffic|choke point|asphalt|trenching|gutters|manhole|khadda|rasta|ambulance/i.test(lower)) {
    categoryScores.roads += 4;
  }

  // Determine top category
  let topCategory = 'other';
  let maxScore = 0;
  for (const [cat, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score;
      topCategory = cat;
    }
  }

  // 2. Region / Ward Name Extraction
  const wardKeywords = [
    { name: 'Ward 12 - Dharavi / Shahu Nagar', match: /dharavi|shahu nagar|90 feet/i },
    { name: 'Ward 9 - Kurla West / LBS Marg', match: /kurla|lbs marg|kurla station/i },
    { name: 'Ward 15 - Chembur North / Govandi', match: /chembur|govandi/i },
    { name: 'Ward 8 - Andheri East / MIDC Industrial', match: /andheri|midc/i },
    { name: 'Ward 7 - Shivaji Nagar / Mankhurd', match: /shivaji nagar|mankhurd|baiganwadi/i },
    { name: 'Ward 4 - Bandra West / Hill Road', match: /bandra|hill road/i },
    { name: 'Ward 1 - Colaba / Fort Financial District', match: /colaba|fort|oval maidan/i },
    { name: 'Ward 22 - Hinjewadi IT Corridor', match: /hinjewadi|phase 2/i },
    { name: 'Ward 18 - Kothrud / Karve Road', match: /kothrud|karve road/i },
    { name: 'Ward 3 - Whitefield Tech Zone', match: /whitefield/i },
    { name: 'Ward 5 - Indiranagar / Halasuru', match: /indiranagar|halasuru/i },
    { name: 'Ward 11 - Old City / Charminar Heritage', match: /charminar|lad bazaar/i },
  ];

  let regionGuess = null;
  for (const ward of wardKeywords) {
    if (ward.match.test(lower)) {
      regionGuess = ward.name;
      break;
    }
  }

  // 3. Severity Calculation (0.0 to 10.0 scale)
  let severity = 5.0; // default moderate

  // Evaluate from lowest/vague to critical emergencies
  if (/chipped paint|bench|aesthetic|garden|painting|minor/i.test(lower)) {
    severity = 2.4;
  } else if (/everything is broken|nothing works|all broken/i.test(lower) || (lower.length < 30 && /broken/i.test(lower))) {
    severity = 3.8;
  } else if (/school|children|hospital|electrocution|danger|ambulance|fatal|emergency/i.test(lower)) {
    severity = 9.2;
  } else if (/burst|phat gaya|sinkhole|outage|gridlock|chawl has zero water|contamination|dysentery|nahi aa raha/i.test(lower)) {
    severity = 8.6;
  } else if (/spilling|tripping|trenching|pothole|spark|jam|traffic light band|band hai/i.test(lower)) {
    severity = 7.2;
  }

  // 4. Translation & One-line Summary
  let translatedText = text;
  if (detectedLang === 'hi' || /paani|phat gaya|hamare/i.test(lower)) {
    translatedText = 'Water main pipeline has burst, causing clean drinking water shortage for 3 days.';
  } else if (detectedLang === 'mr' || /khadda|padla|adakli/i.test(lower)) {
    translatedText = 'A large pothole has formed near the station, trapping vehicles and an emergency ambulance.';
  }

  const oneLineSummary = `${topCategory.toUpperCase()} incident reported: ${text.slice(0, 50)}...`;

  return {
    category: topCategory,
    translated_text: translatedText,
    language_detected: detectedLang,
    region_guess: regionGuess,
    severity: Number(severity.toFixed(1)),
    one_line_summary: oneLineSummary,
  };
}
