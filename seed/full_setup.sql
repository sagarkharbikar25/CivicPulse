-- ==============================================================================
-- CivicPulse: One-Click Supabase Schema & Seed Script
-- Project URL: https://xzeolgdpavpudxtiiqrl.supabase.co
-- Paste this script into your Supabase Dashboard SQL Editor and click RUN
-- ==============================================================================

-- 1. Enable PostGIS Extension
create extension if not exists postgis;

-- 2. Create Core Tables
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  raw_input_type text check (raw_input_type in ('voice', 'text', 'chat')),
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

create table if not exists region_index (
  id uuid primary key default gen_random_uuid(),
  region_name text unique,
  latitude float8,
  longitude float8,
  population int,
  infra_gap_score float8,
  past_investment_amount numeric,
  last_updated timestamptz default now()
);

create table if not exists priority_projects (
  id uuid primary key default gen_random_uuid(),
  region_name text,
  category text,
  submission_count int,
  avg_urgency float8,
  final_priority_rank int,
  recommended_action text,
  generated_at timestamptz default now()
);

-- 3. Performance Indexes
create index if not exists idx_submissions_region on submissions(region_name);
create index if not exists idx_submissions_category on submissions(category);
create index if not exists idx_submissions_status on submissions(status);
create index if not exists idx_submissions_urgency on submissions(urgency_score desc);
create index if not exists idx_submissions_created_at on submissions(created_at desc);
create index if not exists idx_priority_projects_rank on priority_projects(final_priority_rank);

-- 4. Enable Row Level Security (RLS)
alter table submissions enable row level security;
alter table region_index enable row level security;
alter table priority_projects enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Public can read submissions" on submissions;
drop policy if exists "Public can insert citizen complaints" on submissions;
drop policy if exists "Public can read regions" on region_index;
drop policy if exists "Service role can modify regions" on region_index;
drop policy if exists "Public can read priority projects" on priority_projects;
drop policy if exists "Service role can modify priority projects" on priority_projects;

-- Submissions policies
create policy "Public can read submissions"
  on submissions for select
  using (true);

create policy "Public can insert citizen complaints"
  on submissions for insert
  with check (
    status in ('new', 'reviewed', 'prioritized', 'needs_review') and
    raw_input_type in ('voice', 'text', 'chat')
  );

-- Region index policies
create policy "Public can read regions"
  on region_index for select
  using (true);

create policy "Service role can modify regions"
  on region_index for all
  using (auth.role() = 'service_role');

-- Priority projects policies
create policy "Public can read priority projects"
  on priority_projects for select
  using (true);

create policy "Service role can modify priority projects"
  on priority_projects for all
  using (auth.role() = 'service_role');

-- 5. Seed 12 Municipal Wards
insert into region_index (region_name, latitude, longitude, population, infra_gap_score, past_investment_amount)
values
  ('Ward 12 - Dharavi / Shahu Nagar', 19.0402, 72.8508, 850000, 92.4, 1850000),
  ('Ward 9 - Kurla West / LBS Marg', 19.0688, 72.8797, 620000, 86.8, 2400000),
  ('Ward 15 - Chembur North / Govandi', 19.0560, 72.9090, 540000, 81.5, 3100000),
  ('Ward 8 - Andheri East / MIDC Industrial', 19.1176, 72.8631, 780000, 74.2, 5900000),
  ('Ward 7 - Shivaji Nagar / Mankhurd', 19.0583, 72.9312, 490000, 89.1, 1420000),
  ('Ward 4 - Bandra West / Hill Road', 19.0596, 72.8295, 310000, 31.8, 12800000),
  ('Ward 1 - Colaba / Fort Financial District', 18.9220, 72.8347, 185000, 24.5, 16400000),
  ('Ward 22 - Hinjewadi IT Corridor', 18.5913, 73.7389, 410000, 68.3, 7200000),
  ('Ward 18 - Kothrud / Karve Road', 18.5074, 73.8077, 395000, 42.1, 8900000),
  ('Ward 3 - Whitefield Tech Zone', 12.9698, 77.7500, 530000, 65.0, 9400000),
  ('Ward 5 - Indiranagar / Halasuru', 12.9784, 77.6408, 280000, 34.2, 11200000),
  ('Ward 11 - Old City / Charminar Heritage', 17.3616, 78.4747, 680000, 83.7, 2600000)
on conflict (region_name) do update 
set 
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  population = excluded.population,
  infra_gap_score = excluded.infra_gap_score,
  past_investment_amount = excluded.past_investment_amount,
  last_updated = now();

-- 6. Seed Baseline Complaints
insert into submissions (raw_input_type, raw_text, language_detected, translated_text, category, latitude, longitude, region_name, urgency_score, status, created_at)
values
  (
    'voice',
    'Main pipeline burst near 90 Feet Road, clean drinking water flowing into open drain for 3 days now. Whole chawl has zero water.',
    'en',
    'Main pipeline burst near 90 Feet Road, clean drinking water flowing into open drain for 3 days now. Whole chawl has zero water.',
    'water',
    19.0418,
    72.8524,
    'Ward 12 - Dharavi / Shahu Nagar',
    94.5,
    'new',
    now() - interval '2 hours'
  ),
  (
    'text',
    'High voltage transformer spark and oil leakage outside Urdu high school. Danger of electrocution during school hours.',
    'en',
    'High voltage transformer spark and oil leakage outside Urdu high school. Danger of electrocution during school hours.',
    'electricity',
    19.0435,
    72.8510,
    'Ward 12 - Dharavi / Shahu Nagar',
    91.2,
    'prioritized',
    now() - interval '5 hours'
  ),
  (
    'voice',
    'LBS Marg bridge approach has massive 2-foot sinkhole after water main collapse. Buses and ambulances getting stuck.',
    'en',
    'LBS Marg bridge approach has massive 2-foot sinkhole after water main collapse. Buses and ambulances getting stuck.',
    'roads',
    19.0712,
    72.8812,
    'Ward 9 - Kurla West / LBS Marg',
    88.7,
    'prioritized',
    now() - interval '8 hours'
  ),
  (
    'text',
    'Garbage compactor has not visited Baiganwadi sector 4 in 11 days. Piles spilling onto road blocking traffic.',
    'en',
    'Garbage compactor has not visited Baiganwadi sector 4 in 11 days. Piles spilling onto road blocking traffic.',
    'sanitation',
    19.0601,
    72.9345,
    'Ward 7 - Shivaji Nagar / Mankhurd',
    86.3,
    'new',
    now() - interval '14 hours'
  ),
  (
    'voice',
    'Water contaminated with sewage line overflow in Govandi transit camp block C. Several children falling ill with dysentery.',
    'en',
    'Water contaminated with sewage line overflow in Govandi transit camp block C. Several children falling ill with dysentery.',
    'water',
    19.0575,
    72.9120,
    'Ward 15 - Chembur North / Govandi',
    93.8,
    'prioritized',
    now() - interval '3 hours'
  );
