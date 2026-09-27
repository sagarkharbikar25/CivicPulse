# CivicPulse — AI-Powered Citizen Infrastructure Prioritization Platform
### BRICS Innovation Track 1 — Solo Build, 4-Day Timeline

> **Assumption stated up front:** This plan targets **Track 1 (AI for Digital Public Infrastructure & Innovation)** since it was your top-scoring option for a solo AI-agent-assisted build. If you meant a different track, tell me and I'll re-scope this doc — the architecture pattern below transfers with light changes.

---

## 1. The One-Line Pitch

**CivicPulse** ingests citizen infrastructure complaints via **voice, text, and chat** in multiple languages, uses AI to cluster and score them against real demographic/infrastructure-gap data, and surfaces a **live prioritized heatmap** that tells policymakers exactly where to spend next — turning fragmented citizen noise into a ranked, defensible investment plan.

---

## 2. WOW Feature (what wins the demo)

**"Speak it. See it prioritized in 5 seconds."**

Live on stage: judge speaks a civic complaint in Hindi/Marathi/English into the mic ("Yahan streetlight kharab hai, 3 mahine se" / "This road has been flooded for weeks") →

1. Whisper transcribes + auto-detects language
2. LLM translates + classifies category (roads, water, electricity, sanitation, etc.) + extracts location entities
3. Urgency score computed against a pre-loaded demographic/infra-gap dataset for that area
4. Point drops onto a live heatmap in **under 5 seconds**, re-ranking the top-10 priority list in real time

This is the entire demo in one motion — input → AI reasoning → visible geographic impact. Judges *feel* the AI working instead of reading about it.

**Why this is buildable in 4 days:** Whisper API + an LLM call + a weighted scoring formula + a map re-render is 3 well-understood integrations, not new research. The complexity is in orchestration, not invention — ideal for AI-agent-assisted solo building.

---

## 3. Tech Stack (deployable, as specified)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) + Tailwind CSS | Fast build, matches your stack, easy to theme dark/glassmorphic per your reference |
| Backend | Node.js + Express.js | REST API, matches your stack, trivial to deploy |
| Database | Supabase (Postgres + PostGIS extension) | Relational + geospatial queries for heatmap clustering, built-in auth if needed later, realtime subscriptions for live map updates |
| AI — Speech | Whisper API (OpenAI) or Groq Whisper (faster/cheaper) | Multilingual STT, no fine-tuning needed |
| AI — Reasoning | Claude or Gemini API (single LLM call per submission) | Classification + translation + entity extraction in one structured-JSON prompt |
| Realtime | Supabase Realtime (Postgres change subscriptions) | Powers the live heatmap re-render without building your own WebSocket layer |
| Icons | Custom SVG only (no icon libraries) | Per your requirement — hand-authored/AI-generated SVGs, stored as reusable React components |
| Deployment — Frontend | Vercel | Zero-config React deploys, free tier fine for a hackathon |
| Deployment — Backend | Render | Free/cheap Node hosting, easy env var management |
| Deployment — DB | Supabase Cloud | Already hosted, no separate deploy step |

**No PHP/MySQL here** — this track's realtime + geospatial needs fit Supabase/Postgres far better than your PHP stack, and Express keeps your Node skills front and center.

---

## 4. Architecture

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
                                   │  - demographics_seed  │
                                   │  - priority_scores     │
                                   └────────────────────┘
```

---

## 5. Database Schema (Supabase / Postgres)

```sql
-- Core citizen submissions
create table submissions (
  id uuid primary key default gen_random_uuid(),
  raw_input_type text check (raw_input_type in ('voice','text','chat')),
  raw_text text,                      -- transcribed/original text
  language_detected text,
  translated_text text,
  category text,                      -- roads | water | electricity | sanitation | other
  latitude float8,
  longitude float8,
  region_name text,
  urgency_score float8,               -- computed 0-100
  status text default 'new',          -- new | reviewed | prioritized
  created_at timestamptz default now()
);

-- Seed dataset: demographic + infra gap index per region (mocked from public data)
create table region_index (
  id uuid primary key default gen_random_uuid(),
  region_name text unique,
  latitude float8,
  longitude float8,
  population int,
  infra_gap_score float8,             -- higher = more underserved
  past_investment_amount numeric,
  last_updated timestamptz default now()
);

-- Aggregated, ranked output policymakers actually see
create table priority_projects (
  id uuid primary key default gen_random_uuid(),
  region_name text,
  category text,
  submission_count int,
  avg_urgency float8,
  final_priority_rank int,
  recommended_action text,            -- LLM-generated 1-liner recommendation
  generated_at timestamptz default now()
);

-- enable PostGIS if doing real geo-clustering
create extension if not exists postgis;
```

**Urgency scoring formula (simple, explainable — judges like transparency over black-box):**
```
urgency_score = (complaint_severity_weight * 0.4)
              + (region.infra_gap_score * 0.35)
              + (complaint_recency_decay * 0.15)
              + (submission_density_in_area * 0.10)
```

---

## 6. API Endpoints (Express)

```
POST   /api/submissions/voice        -- multipart audio upload → full AI pipeline
POST   /api/submissions/text         -- direct text submission
GET    /api/submissions               -- list, filterable by region/category/status
GET    /api/priority                 -- ranked priority list (drives dashboard)
GET    /api/priority/heatmap         -- geojson-style points for map rendering
GET    /api/regions                  -- seeded region_index data
POST   /api/admin/recompute           -- manually trigger re-scoring (demo safety net)
```

---

## 7. Folder Structure

```
civicpulse/
├── client/                       # React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── icons/            # hand-authored SVG components, one file per icon
│   │   │   ├── ui/                # Button, Card, Badge — reusable primitives
│   │   │   ├── map/                # HeatmapView, MapMarker
│   │   │   └── voice/              # VoiceRecorder, TranscriptPreview
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── SubmitComplaint.jsx
│   │   │   └── PolicymakerView.jsx
│   │   ├── lib/supabaseClient.js
│   │   ├── hooks/useRealtimeSubmissions.js
│   │   └── App.jsx
│   └── vite.config.js
├── server/                       # Express app
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── whisperService.js
│   │   │   ├── llmClassifyService.js
│   │   │   └── scoringEngine.js
│   │   ├── db/supabaseAdmin.js
│   │   └── index.js
│   └── package.json
├── seed/
│   └── region_index_seed.sql      # mocked demographic/infra data
├── plan.md                        # this file
├── SECURITY.md                    # security architecture & DPI safeguards
└── README.md
```

---

## 8. Four-Day Execution Timeline

### Day 1 — Foundation (core-backend branch)
- Supabase project + schema + seed `region_index` with realistic mocked data (10–15 regions, real city names)
- Express skeleton, DB connection, all routes stubbed and returning mock JSON
- Deploy skeleton to Render immediately (deploy early, not last — avoids Day 4 panic)
- Scoring engine as a pure function, unit-testable in isolation

### Day 2 — AI Integration (feature/ai-integration branch)
- Whisper integration for voice → text
- LLM prompt engineering: single structured-JSON call that returns `{category, translated_text, region_guess, severity}` — spend real time here, this prompt is your core IP
- Wire scoring engine to real submissions → `priority_projects` table
- Test with 15–20 varied sample inputs (different languages, vague complaints, edge cases) — this is what breaks in front of judges if skipped

### Day 3 — Frontend (feature/frontend-ui branch)
- Dashboard shell, dark theme matching your reference (deep black/charcoal, gradient glows, serif+sans pairing like "Success" in the reference)
- Custom SVG icon set (10–12 icons: mic, map-pin, category icons, status badges)
- Reusable `Card`, `Button`, `Badge` components
- Static map view wired to `/api/priority/heatmap` (non-realtime first — get it rendering with real data before adding live updates)

### Day 4 — WOW Feature + Polish (feature/wow-feature branch)
- Morning: wire Supabase Realtime subscription so new submissions animate onto the map live
- Midday: voice recorder UI → full pipeline demo, rehearse the exact live-mic flow 5+ times
- Afternoon: merge all branches into `main` in order (core-backend → ai-integration → frontend-ui → wow-feature), fix merge conflicts, redeploy final build
- Evening: record a 90-second backup demo video (in case live mic/wifi fails on stage — **always have this**), write submission README, prep pitch narrative

---

## 9. Branch Plan (matches your 4-branch requirement)

| Branch | Owns | Merges when |
|---|---|---|
| `feature/core-backend` | Supabase schema, seed data, Express routes, scoring engine | End of Day 1, must run cleanly standalone |
| `feature/ai-integration` | Whisper service, LLM classification service, wiring into submissions pipeline | End of Day 2, tested against 15+ sample inputs |
| `feature/frontend-ui` | React app, SVG icon components, reusable UI primitives, static dashboard | End of Day 3, connects to live API not mocks |
| `feature/wow-feature` | Realtime map subscription, voice-to-map live demo flow | Day 4, isolated so if it's not fully stable you still ship a working `main` without it |

Commit frequently within each branch (aim for 5–8 commits/day minimum) — solo submissions get scrutinized on commit history to verify real, incremental work rather than a single end-of-deadline dump.

---

## 10. Risks & Fallbacks

| Risk | Mitigation |
|---|---|
| LLM/Whisper API rate limits or latency during live demo | Cache 3–4 pre-tested example inputs as an instant fallback path if live mic fails |
| Realtime map feels gimmicky without real data | Seed with real city/ward names + plausible complaint volumes, not "Region A/B/C" |
| Scope creep on the "multilingual" claim | Support 2–3 languages well (English + Hindi + one regional) rather than claiming "all languages" and failing on stage |
| Supabase free tier limits | Fine for hackathon scale (hundreds of rows), no action needed |
| Running out of time on wow-feature | It's isolated in its own branch — `main` stays demo-ready without it per the merge order above |

---

## 11. Demo & Pitch Strategy

1. **Open with the problem** (10 sec): "Governments get thousands of complaints, no way to know what actually matters."
2. **Live demo the WOW moment** (30 sec): speak a complaint, watch it appear ranked on the map in seconds.
3. **Show the policymaker view** (20 sec): ranked priority list with AI-generated one-line recommendations — this is the "so what," not just a pretty map.
4. **Close on scalability** (10 sec): mention the Digital Public Good framing — multilingual, region-agnostic schema, exactly what the BRICS brief asks for.

Keep total demo under 90 seconds. Judges reward clarity and a working live moment over feature-count.

---

## 12. Security Architecture & Digital Public Infrastructure (DPI) Safeguards

CivicPulse handles public citizen submissions and municipal policymaker prioritization. As a Digital Public Good, security, privacy, and integrity are foundational design pillars:

1. **Edge & Transport Defense:**
   - Strict HTTP security headers (`Helmet`, HSTS, X-Content-Type-Options, X-Frame-Options, CSP).
   - Strict CORS origin whitelisting matching deployed frontend clients.
2. **Abuse & DoS Mitigation:**
   - Multi-tier rate limiting via `express-rate-limit` (General API limiter: 100 req / 15 min; Citizen Intake limiter: 15 req / 15 min per IP to prevent spam bot flooding).
   - Request body size limits (100kb payload caps) to prevent memory exhaustion and large payload exploits.
3. **Citizen Privacy & PII Masking:**
   - Automatic anonymization of citizen identifiers; exact addresses generalized to ward/sector levels before public heatmap broadcast.
4. **Data Layer Integrity & Row Level Security (RLS):**
   - PostgreSQL Row Level Security enabled on all core tables (`submissions`, `region_index`, `priority_projects`).
   - Read-only public policies, restricted write policies, and service-role / authenticated access for administrative recalculation.
5. **Administrative Access Control:**
   - Protected `/api/admin/*` endpoints requiring secure key/token validation to prevent unauthorized re-scoring manipulation.
6. **Detailed Specification:**
   - See [SECURITY.md](file:///d:/GitHub/CivicPulse/SECURITY.md) for the complete vulnerability policy, threat model, RLS SQL policies, and implementation guidelines.
