-- ==============================================================================
-- CivicPulse: Initial Submissions Seed Data
-- Branch: feature/core-backend
-- Realistic citizen complaints across municipal wards
-- ==============================================================================

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
  ),
  (
    'chat',
    'Heavy commercial trailers broke underground fiber and storm water slab in MIDC Street 14. Flooding industrial gates.',
    'en',
    'Heavy commercial trailers broke underground fiber and storm water slab in MIDC Street 14. Flooding industrial gates.',
    'roads',
    19.1190,
    72.8655,
    'Ward 8 - Andheri East / MIDC Industrial',
    76.4,
    'reviewed',
    now() - interval '1 day'
  ),
  (
    'text',
    'Phase 2 main junction traffic lights non-functional for 48 hours causing 2-hour gridlock during peak shift change.',
    'en',
    'Phase 2 main junction traffic lights non-functional for 48 hours causing 2-hour gridlock during peak shift change.',
    'electricity',
    18.5930,
    73.7410,
    'Ward 22 - Hinjewadi IT Corridor',
    71.2,
    'new',
    now() - interval '6 hours'
  ),
  (
    'voice',
    'Heritage gate stone masonry crumbling near Lad Bazaar street lights due to illegal underground cable trenching.',
    'en',
    'Heritage gate stone masonry crumbling near Lad Bazaar street lights due to illegal underground cable trenching.',
    'roads',
    17.3625,
    78.4735,
    'Ward 11 - Old City / Charminar Heritage',
    82.0,
    'prioritized',
    now() - interval '10 hours'
  ),
  (
    'text',
    'Tree branch fallen on low-hanging overhead cables near Hill Road junction. Streetlight circuit tripping repeatedly.',
    'en',
    'Tree branch fallen on low-hanging overhead cables near Hill Road junction. Streetlight circuit tripping repeatedly.',
    'electricity',
    19.0588,
    72.8310,
    'Ward 4 - Bandra West / Hill Road',
    42.1,
    'reviewed',
    now() - interval '2 days'
  ),
  (
    'chat',
    'Stormwater gutter cover displaced near Oval Maidan walking track, potential tripping hazard for senior citizens.',
    'en',
    'Stormwater gutter cover displaced near Oval Maidan walking track, potential tripping hazard for senior citizens.',
    'roads',
    18.9245,
    72.8330,
    'Ward 1 - Colaba / Fort Financial District',
    35.6,
    'new',
    now() - interval '3 days'
  );
