-- ==============================================================================
-- CivicPulse: Region Index Seed Data
-- Branch: feature/core-backend
-- 12 Municipal Wards / Geographic Sectors with demographic and infra metrics
-- ==============================================================================

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
