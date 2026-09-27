# Branch: `feature/ai-integration`
### CivicPulse — Day 2 scope

**Goal:** Wire real Whisper + LLM calls into the submission pipeline so `POST /api/submissions/voice` and `/text` go from raw input to a scored, categorized row in `submissions`. Branch off `feature/core-backend` once it's merged — you need the real schema and scoring function in place first.

---

## Tasks
1. Integrate Whisper (or Groq Whisper) for voice → text, handling at least 2–3 languages
2. Write the core LLM prompt — single structured-JSON call, no multi-turn chains (keeps latency low for the live demo)
3. Wire the LLM output into `scoringEngine.js` from `core-backend`, write result to `submissions`
4. Trigger `priority_projects` recompute after each new submission (or on a short interval)
5. Test against 15–20 varied sample inputs — vague complaints, multi-issue complaints, mixed language, background noise on voice — this is what actually breaks live on stage if skipped
6. Add graceful fallback: if the LLM call fails or times out, still save the raw submission with `status: 'needs_review'` rather than losing it

---

## Endpoints completed in this branch

```
POST   /api/submissions/voice   -- multipart audio → Whisper → LLM classify → score → save
POST   /api/submissions/text    -- text → LLM classify → score → save
```

## LLM prompt contract (keep this strict — structured JSON only)

```
Input: raw complaint text (already translated to English if needed)
Output (JSON only, no prose):
{
  "category": "roads" | "water" | "electricity" | "sanitation" | "other",
  "translated_text": string,
  "language_detected": string,
  "region_guess": string,          // best-guess area name from text, or null
  "severity": number,               // 0-10, used as complaint_severity_weight input
  "one_line_summary": string
}
```

If you built the second "wow" moment (policy recommendation), add a second lightweight LLM call here that takes the top-ranked `priority_projects` row and generates `recommended_action` — keep it to one sentence, cache it, don't regenerate on every request.

## Services owned by this branch
```
server/src/services/
├── whisperService.js
├── llmClassifyService.js
└── (optional) recommendationService.js
```

## Done when
- 15+ test submissions (mixed language, mixed clarity) produce sensible categories and scores
- A failed/timeout LLM call does not crash the request or lose the submission
- Voice-to-scored-submission round trip completes in under ~5 seconds on a normal connection
- 5+ commits showing incremental progress (Whisper wired → prompt v1 → prompt refined against test cases → fallback handling)
