import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)?.trim();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase credentials missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const NAGPUR_REGIONS = [
  {
    region_name: 'Zone 2 - Dharampeth / Civil Lines (Nagpur)',
    latitude: 21.1458,
    longitude: 79.0720,
    population: 220000,
    infra_gap_score: 94.0,
    past_investment_amount: 1400000,
  },
  {
    region_name: 'Zone 4 - Dhantoli / Sitabuldi (Nagpur)',
    latitude: 21.1420,
    longitude: 79.0850,
    population: 210000,
    infra_gap_score: 91.5,
    past_investment_amount: 1100000,
  },
  {
    region_name: 'Zone 3 - Hanuman Nagar / Medical Square (Nagpur)',
    latitude: 21.1180,
    longitude: 79.0950,
    population: 260000,
    infra_gap_score: 88.0,
    past_investment_amount: 950000,
  },
  {
    region_name: 'MIHAN / Butibori Industrial Zone (Nagpur)',
    latitude: 21.0350,
    longitude: 79.0250,
    population: 180000,
    infra_gap_score: 85.0,
    past_investment_amount: 2100000,
  },
  {
    region_name: 'Zone 1 - Laxmi Nagar / Bajaj Nagar (Nagpur)',
    latitude: 21.1250,
    longitude: 79.0650,
    population: 245000,
    infra_gap_score: 78.5,
    past_investment_amount: 1650000,
  },
  {
    region_name: 'Zone 10 - Mangalwari / Sadar (Nagpur)',
    latitude: 21.1650,
    longitude: 79.0780,
    population: 250000,
    infra_gap_score: 72.0,
    past_investment_amount: 1800000,
  },
  {
    region_name: 'Zone 9 - Ashi Nagar / Jaripatka (Nagpur)',
    latitude: 21.1850,
    longitude: 79.0980,
    population: 290000,
    infra_gap_score: 86.0,
    past_investment_amount: 850000,
  },
  {
    region_name: 'Zone 6 - Gandhibagh / Itwari / Old City (Nagpur)',
    latitude: 21.1550,
    longitude: 79.1100,
    population: 310000,
    infra_gap_score: 82.5,
    past_investment_amount: 720000,
  },
];

const NAGPUR_SUBMISSIONS = [
  {
    raw_input_type: 'voice',
    raw_text: 'Dharampeth main road par 100mm drinking water feeder line burst ho gayi hai, do din se pure area me paani nahi aa raha.',
    language_detected: 'hi',
    translated_text: 'A 100mm drinking water feeder pipeline has burst on Dharampeth main road, completely disrupting drinking water supply for two days.',
    category: 'water',
    latitude: 21.1458,
    longitude: 79.0720,
    region_name: 'Zone 2 - Dharampeth / Civil Lines (Nagpur)',
    urgency_score: 96.0,
    status: 'prioritized',
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    raw_input_type: 'voice',
    raw_text: 'Civil Lines court road jawal drinking water pipeline leak ahe, rastyavar paani saachlay.',
    language_detected: 'mr',
    translated_text: 'Drinking water pipeline leaking near Civil Lines court road, clean water flooding the street.',
    category: 'water',
    latitude: 21.1480,
    longitude: 79.0690,
    region_name: 'Zone 2 - Dharampeth / Civil Lines (Nagpur)',
    urgency_score: 91.5,
    status: 'prioritized',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    raw_input_type: 'text',
    raw_text: 'Shankar Nagar square feeder valve damaged, contaminated water backflowing into residential taps.',
    language_detected: 'en',
    translated_text: 'Shankar Nagar square feeder valve damaged, contaminated water backflowing into residential taps.',
    category: 'water',
    latitude: 21.1390,
    longitude: 79.0630,
    region_name: 'Zone 2 - Dharampeth / Civil Lines (Nagpur)',
    urgency_score: 93.0,
    status: 'new',
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    raw_input_type: 'text',
    raw_text: 'Sitabuldi main market entrance road crater and exposed high-voltage cables causing severe road block and electrocution hazard.',
    language_detected: 'en',
    translated_text: 'Sitabuldi main market entrance road crater and exposed high-voltage cables causing severe road block and electrocution hazard.',
    category: 'roads',
    latitude: 21.1420,
    longitude: 79.0850,
    region_name: 'Zone 4 - Dhantoli / Sitabuldi (Nagpur)',
    urgency_score: 93.5,
    status: 'prioritized',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    raw_input_type: 'voice',
    raw_text: 'Sitabuldi metro station jawal motha khadda padla ahe, ambulance adakli hoti kal ratri.',
    language_detected: 'mr',
    translated_text: 'Large sinkhole formed near Sitabuldi metro station, ambulance was trapped last night.',
    category: 'roads',
    latitude: 21.1435,
    longitude: 79.0860,
    region_name: 'Zone 4 - Dhantoli / Sitabuldi (Nagpur)',
    urgency_score: 94.0,
    status: 'prioritized',
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    raw_input_type: 'voice',
    raw_text: 'Medical Square jawal high-voltage transformer spark hot ahe ani oil leak hot ahe, hospital ICU patient sathi khup dhoka ahe.',
    language_detected: 'mr',
    translated_text: 'High-voltage transformer sparking and leaking oil near Medical Square, high danger for hospital ICU patients.',
    category: 'electricity',
    latitude: 21.1180,
    longitude: 79.0950,
    region_name: 'Zone 3 - Hanuman Nagar / Medical Square (Nagpur)',
    urgency_score: 95.0,
    status: 'prioritized',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    raw_input_type: 'text',
    raw_text: 'Hanuman Nagar main transmission line short circuit repeatedly tripping government medical college trauma center grid.',
    language_detected: 'en',
    translated_text: 'Hanuman Nagar main transmission line short circuit repeatedly tripping government medical college trauma center grid.',
    category: 'electricity',
    latitude: 21.1195,
    longitude: 79.0920,
    region_name: 'Zone 3 - Hanuman Nagar / Medical Square (Nagpur)',
    urgency_score: 92.5,
    status: 'new',
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    raw_input_type: 'text',
    raw_text: 'MIHAN flyover approach road underground drainage overflow causing heavy vehicle skidding and severe sanitation issues.',
    language_detected: 'en',
    translated_text: 'MIHAN flyover approach road underground drainage overflow causing heavy vehicle skidding and severe sanitation issues.',
    category: 'sanitation',
    latitude: 21.0350,
    longitude: 79.0250,
    region_name: 'MIHAN / Butibori Industrial Zone (Nagpur)',
    urgency_score: 88.0,
    status: 'prioritized',
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    raw_input_type: 'text',
    raw_text: 'Laxmi Nagar 8-inch water pipe rupture flooding residential basements near water tank.',
    language_detected: 'en',
    translated_text: 'Laxmi Nagar 8-inch water pipe rupture flooding residential basements near water tank.',
    category: 'water',
    latitude: 21.1250,
    longitude: 79.0650,
    region_name: 'Zone 1 - Laxmi Nagar / Bajaj Nagar (Nagpur)',
    urgency_score: 85.0,
    status: 'new',
    created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
  },
  {
    raw_input_type: 'text',
    raw_text: 'Sadar residency road main junction streetlights completely blackout for 48 hours, high accident rate at night.',
    language_detected: 'en',
    translated_text: 'Sadar residency road main junction streetlights completely blackout for 48 hours, high accident rate at night.',
    category: 'electricity',
    latitude: 21.1650,
    longitude: 79.0780,
    region_name: 'Zone 10 - Mangalwari / Sadar (Nagpur)',
    urgency_score: 83.5,
    status: 'prioritized',
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
];

async function migrate() {
  console.log('🔄 Cleaning up dummy test data from Supabase...');

  // 1. Delete all non-Nagpur dummy submissions
  const dummyKeywords = ['Dharavi', 'Kurla', 'Mankhurd', 'Charminar', 'Bandra', 'Govandi', 'Andheri', 'Hinjewadi', 'Whitefield', 'Kothrud', 'Indiranagar', 'Colaba'];
  
  for (const kw of dummyKeywords) {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .ilike('region_name', `%${kw}%`);
    if (error) console.warn(`Error deleting ${kw}:`, error.message);
  }

  // 2. Also delete old priority_projects rows
  const { error: pError } = await supabase
    .from('priority_projects')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
  if (pError) console.warn('Error clearing priority_projects:', pError.message);

  // 3. Upsert authentic Nagpur regions into region_index
  for (const reg of NAGPUR_REGIONS) {
    const { error: regErr } = await supabase
      .from('region_index')
      .upsert(reg, { onConflict: 'region_name' });
    if (regErr) console.warn(`Error upserting ${reg.region_name}:`, regErr.message);
  }

  // 4. Insert authentic Nagpur submissions
  const { data: insertedSubs, error: insErr } = await supabase
    .from('submissions')
    .insert(NAGPUR_SUBMISSIONS)
    .select();
  if (insErr) {
    console.error('Error inserting Nagpur submissions:', insErr.message);
  } else {
    console.log(`✅ Seeded ${insertedSubs?.length || 0} authentic Nagpur submissions.`);
  }

  console.log('🎉 Cleanup and migration complete!');
  process.exit(0);
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
