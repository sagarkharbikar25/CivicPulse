-- ==============================================================================
-- CivicPulse: Database Schema
-- Branch: feature/core-backend
-- Tables: submissions, region_index, priority_projects
-- Extensions: postgis
-- ==============================================================================

-- 1. Enable PostGIS extension for geospatial operations and clustering
create extension if not exists postgis;

-- 2. Core citizen submissions table
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

-- 3. Region index: Demographic & Infrastructure Gap dataset per ward/region
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

-- 4. Priority projects: Ranked infrastructure actions generated from clusters
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

-- Indexes for performance
create index if not exists idx_submissions_region on submissions(region_name);
create index if not exists idx_submissions_category on submissions(category);
create index if not exists idx_submissions_status on submissions(status);
create index if not exists idx_submissions_urgency on submissions(urgency_score desc);
create index if not exists idx_submissions_created_at on submissions(created_at desc);
create index if not exists idx_priority_projects_rank on priority_projects(final_priority_rank);
