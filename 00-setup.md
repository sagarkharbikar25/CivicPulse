# 00 — Setup & Shared Reference
### CivicPulse — hand this to your AI agent at the start of EVERY branch session, alongside that branch's own doc (01/02/03/04)

This file exists because the 4 branch docs are intentionally scoped narrow so your AI agent isn't overloaded with irrelevant context — but a few things are genuinely shared across all branches and belong in exactly one place, not duplicated 4 times.

---

## 1. Architecture (full picture — every branch should see this once)

```
┌─────────────┐     voice/text      ┌──────────────┐
│   React UI   │ ──────────────────▶│  Express API  │
│ (Vercel)     │                     │  (Render)     │
└──────┬───────┘                     └──────┬────────┘
       │ Supabase Realtime                  │
       │ subscription (live map)            ▼
       │                          ┌────────────────────┐
       │                          │  AI Orchestration    │
       │                          │  1. Whisper (STT)     │
       │                          │  2. LLM (classify+geo)│
       │                          │  3. Scoring engine     │
       │                          └──────────┬─────────┘
       │                                     ▼
       │                          ┌────────────────────┐
       └─────────────────────────▶│  Supabase (Postgres  │
                                   │  + PostGIS)          │
                                   │  - submissions        │
                                   │  - region_index        │
                                   │  - priority_projects    │
                                   └────────────────────┘
```

Which branch owns which box:
- **React UI** → `feature/frontend-ui` (static) + `feature/wow-feature` (realtime/voice)
- **Express API + Supabase schema** → `feature/core-backend`
- **AI Orchestration** → `feature/ai-integration`

---

## 2. Environment Variables

Create `.env` files in both `client/` and `server/` — **never commit these**, add both to `.gitignore` on Day 1 before your first commit.

### `server/.env`
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key      # server-side only, full DB access
WHISPER_API_KEY=your_whisper_or_groq_key
LLM_API_KEY=your_claude_or_gemini_key
PORT=5000
```

### `client/.env`
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_anon_public_key           # client-side, restricted by RLS
VITE_API_BASE_URL=your_deployed_render_url            # or http://localhost:5000 for local dev
```

**Keep variable names identical across every branch.** This is the #1 source of merge-time bugs on solo multi-branch builds — if `feature/ai-integration` invents `OPENAI_KEY` while `core-backend` expects `WHISPER_API_KEY`, you'll debug a silent failure at midnight on Day 3. Lock these names now, before any branch starts coding.

---

## 3. Git Workflow (exact commands)

```bash
# One-time setup
git init civicpulse
cd civicpulse
git add .gitignore
git commit -m "chore: initial commit with .gitignore"

# Day 1 — core-backend
git checkout -b feature/core-backend
# ... work, commit frequently ...
git add .
git commit -m "feat: supabase schema + region_index seed"
# repeat commits through the day (aim 5-8)
git checkout main
git merge feature/core-backend
git push origin main

# Day 2 — ai-integration (branches off updated main)
git checkout -b feature/ai-integration
# ... work, commit frequently ...
git checkout main
git merge feature/ai-integration
git push origin main

# Day 3 — frontend-ui
git checkout -b feature/frontend-ui
# ... work, commit frequently ...
git checkout main
git merge feature/frontend-ui
git push origin main

# Day 4 — wow-feature (last, most isolated)
git checkout -b feature/wow-feature
# ... work, commit frequently ...
git checkout main
git merge feature/wow-feature
git push origin main
```

**Merge order is fixed:** `core-backend` → `ai-integration` → `frontend-ui` → `wow-feature`. Each merge should leave `main` in a deployable state — never merge a broken branch just to stay on schedule; fix or hold it back instead.

---

## 4. Full Risk Table

| Risk | Mitigation | Owning branch |
|---|---|---|
| LLM/Whisper API rate limits or latency during live demo | Cache 3–4 pre-tested example inputs as instant fallback | `wow-feature` |
| Realtime map feels gimmicky without real data | Seed with real city/ward names + plausible complaint volumes, not "Region A/B/C" | `core-backend` |
| Scope creep on "multilingual" claim | Support 2–3 languages well rather than claiming "all languages" and failing on stage | `ai-integration` |
| Supabase free-tier limits (connection/row limits) | Fine at hackathon scale (hundreds of rows) — no action needed, but don't seed 100k+ rows for "realism" | `core-backend` |
| Env var name mismatch between branches | Locked naming convention in §2 above, set before Day 1 starts | all branches |
| Merge conflicts eating Day 4 time | Merge `core-backend` and `ai-integration` early (end of Day 1/2), don't let 3 branches pile up unmerged until Day 4 | all branches |
| Live mic/wifi failure on stage | Pre-recorded 90-second backup demo video, rehearsed fallback clips | `wow-feature` |

---

## 5. Session Checklist (paste this + the relevant 01/02/03/04 doc to your AI agent each session)

- [ ] Confirm which branch you're on (`git branch --show-current`)
- [ ] Confirm `.env` vars match the naming in §2 — don't let the agent invent new names
- [ ] Confirm previous branch is merged into `main` if this branch depends on it
- [ ] Work only within this branch's scoped doc — resist pulling in tasks from other branches
- [ ] Commit in small increments, not one giant end-of-session commit
