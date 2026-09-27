# Branch: `feature/core-backend`
### CivicPulse — Day 1 scope

**Goal:** Working Express API + Supabase schema, deployed and returning real (seeded) data, before any AI logic touches it. This branch must run cleanly standalone — everything else builds on top of it.

---

## Tasks
1. Create Supabase project, enable `postgis` extension
2. Run the schema below, seed `region_index` with 10–15 real regions (use actual city/ward names, not "Region A/B")
3. Scaffold Express app (`server/`), connect to Supabase via service role key
4. Implement all routes below — return real DB data, no AI wiring yet
5. Implement `scoringEngine.js` as a pure, testable function (no API calls inside it)
6. Deploy to Render immediately — confirm live URL responds before moving to Day 2

---

## Database Schema

```sql
create table submissions (
  id uuid primary key default gen_random_uuid(),
  raw_input_type text check (raw_input_type in ('voice','text','chat')),
  raw_text text,
  language_detected text,
  translated_text text,
  category text,
  latitude float8,
  longitude float8,
  region_name text,
  urgency_score float8,
  status text default 'new',
  created_at timestamptz default now()
);

create table region_index (
  id uuid primary key default gen_random_uuid(),
  region_name text unique,
  latitude float8,
  longitude float8,
  population int,
  infra_gap_score float8,
  past_investment_amount numeric,
  last_updated timestamptz default now()
);

create table priority_projects (
  id uuid primary key default gen_random_uuid(),
  region_name text,
  category text,
  submission_count int,
  avg_urgency float8,
  final_priority_rank int,
  recommended_action text,
  generated_at timestamptz default now()
);

create extension if not exists postgis;
```

## API Endpoints (this branch)

```
GET    /api/submissions              -- list, filterable by region/category/status
GET    /api/priority                 -- ranked priority list
GET    /api/priority/heatmap         -- geojson-style points
GET    /api/regions                  -- seeded region_index data
POST   /api/admin/recompute          -- manually trigger re-scoring
```
(`POST /api/submissions/voice` and `/text` are stubbed here, fully wired in `feature/ai-integration`)

## Scoring Formula

```
urgency_score = (complaint_severity_weight * 0.4)
              + (region.infra_gap_score * 0.35)
              + (complaint_recency_decay * 0.15)
              + (submission_density_in_area * 0.10)
```

## Folder scope for this branch
```
server/
├── src/
│   ├── routes/
│   ├── services/scoringEngine.js
│   ├── db/supabaseAdmin.js
│   └── index.js
└── package.json
seed/region_index_seed.sql
```

## Done when
- Live Render URL responds to all 5 endpoints with real seeded data
- `scoringEngine.js` has been run against at least 3 manual test cases with expected output verified
- 5+ commits showing incremental progress (schema → routes → seed → deploy)
