/**
 * CivicPulse In-Memory Store & Fallback Layer
 * Pre-seeded with 12 authentic city wards and initial submissions.
 * Guarantees zero downtime and instant local development out-of-the-box.
 */

import { computeUrgencyScore, recomputePriorityProjects } from '../services/scoringEngine.js';

export const INITIAL_REGIONS = [
  {
    id: 'reg-13',
    region_name: 'Zone 2 - Dharampeth / Civil Lines (Nagpur)',
    latitude: 21.1458,
    longitude: 79.0720,
    population: 220000,
    infra_gap_score: 94.0,
    past_investment_amount: 1400000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-14',
    region_name: 'Zone 4 - Dhantoli / Sitabuldi (Nagpur)',
    latitude: 21.1420,
    longitude: 79.0850,
    population: 210000,
    infra_gap_score: 91.5,
    past_investment_amount: 1100000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-01',
    region_name: 'Ward 12 - Dharavi / Shahu Nagar',
    latitude: 19.0402,
    longitude: 72.8508,
    population: 850000,
    infra_gap_score: 92.4,
    past_investment_amount: 1850000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-02',
    region_name: 'Ward 9 - Kurla West / LBS Marg',
    latitude: 19.0688,
    longitude: 72.8797,
    population: 620000,
    infra_gap_score: 86.8,
    past_investment_amount: 2400000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-03',
    region_name: 'Ward 15 - Chembur North / Govandi',
    latitude: 19.0560,
    longitude: 72.9090,
    population: 540000,
    infra_gap_score: 81.5,
    past_investment_amount: 3100000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-04',
    region_name: 'Ward 8 - Andheri East / MIDC Industrial',
    latitude: 19.1176,
    longitude: 72.8631,
    population: 780000,
    infra_gap_score: 74.2,
    past_investment_amount: 5900000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-05',
    region_name: 'Ward 7 - Shivaji Nagar / Mankhurd',
    latitude: 19.0583,
    longitude: 72.9312,
    population: 490000,
    infra_gap_score: 89.1,
    past_investment_amount: 1420000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-06',
    region_name: 'Ward 4 - Bandra West / Hill Road',
    latitude: 19.0596,
    longitude: 72.8295,
    population: 310000,
    infra_gap_score: 31.8,
    past_investment_amount: 12800000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-07',
    region_name: 'Ward 1 - Colaba / Fort Financial District',
    latitude: 18.9220,
    longitude: 72.8347,
    population: 185000,
    infra_gap_score: 24.5,
    past_investment_amount: 16400000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-08',
    region_name: 'Ward 22 - Hinjewadi IT Corridor',
    latitude: 18.5913,
    longitude: 73.7389,
    population: 410000,
    infra_gap_score: 68.3,
    past_investment_amount: 7200000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-09',
    region_name: 'Ward 18 - Kothrud / Karve Road',
    latitude: 18.5074,
    longitude: 73.8077,
    population: 395000,
    infra_gap_score: 42.1,
    past_investment_amount: 8900000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-10',
    region_name: 'Ward 3 - Whitefield Tech Zone',
    latitude: 12.9698,
    longitude: 77.7500,
    population: 530000,
    infra_gap_score: 65.0,
    past_investment_amount: 9400000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-11',
    region_name: 'Ward 5 - Indiranagar / Halasuru',
    latitude: 12.9784,
    longitude: 77.6408,
    population: 280000,
    infra_gap_score: 34.2,
    past_investment_amount: 11200000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-12',
    region_name: 'Ward 11 - Old City / Charminar Heritage',
    latitude: 17.3616,
    longitude: 78.4747,
    population: 680000,
    infra_gap_score: 83.7,
    past_investment_amount: 2600000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-15',
    region_name: 'Zone 1 - Laxmi Nagar / Bajaj Nagar (Nagpur)',
    latitude: 21.1250,
    longitude: 79.0650,
    population: 245000,
    infra_gap_score: 68.5,
    past_investment_amount: 1650000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-16',
    region_name: 'Zone 3 - Hanuman Nagar / Medical Square (Nagpur)',
    latitude: 21.1180,
    longitude: 79.0950,
    population: 260000,
    infra_gap_score: 78.0,
    past_investment_amount: 950000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-17',
    region_name: 'Zone 6 - Gandhibagh / Itwari / Old City (Nagpur)',
    latitude: 21.1550,
    longitude: 79.1100,
    population: 310000,
    infra_gap_score: 85.5,
    past_investment_amount: 720000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-18',
    region_name: 'Zone 10 - Mangalwari / Sadar (Nagpur)',
    latitude: 21.1650,
    longitude: 79.0780,
    population: 250000,
    infra_gap_score: 65.0,
    past_investment_amount: 1800000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-19',
    region_name: 'Zone 9 - Ashi Nagar / Jaripatka (Nagpur)',
    latitude: 21.1850,
    longitude: 79.0980,
    population: 290000,
    infra_gap_score: 88.0,
    past_investment_amount: 850000,
    last_updated: new Date().toISOString(),
  },
  {
    id: 'reg-20',
    region_name: 'MIHAN / Butibori Industrial Zone (Nagpur)',
    latitude: 21.0350,
    longitude: 79.0250,
    population: 180000,
    infra_gap_score: 81.0,
    past_investment_amount: 2100000,
    last_updated: new Date().toISOString(),
  },
];

export const INITIAL_SUBMISSIONS = [
  {
    id: 'sub-ngp-001',
    raw_input_type: 'voice',
    raw_text: 'Dharampeth main road par 100mm drinking water feeder line burst ho gayi hai, do din se pure area me paani nahi aa raha.',
    language_detected: 'hi',
    translated_text: 'A 100mm drinking water feeder pipeline has burst on Dharampeth main road, completely disrupting drinking water supply for two days.',
    category: 'water',
    latitude: 21.1458,
    longitude: 79.0720,
    region_name: 'Zone 2 - Dharampeth / Civil Lines (Nagpur)',
    urgency_score: 96.0,
    status: 'new',
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: 'sub-ngp-002',
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
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'sub-001',
    raw_input_type: 'voice',
    raw_text: 'Main pipeline burst near 90 Feet Road, clean drinking water flowing into open drain for 3 days now. Whole chawl has zero water.',
    language_detected: 'en',
    translated_text: 'Main pipeline burst near 90 Feet Road, clean drinking water flowing into open drain for 3 days now. Whole chawl has zero water.',
    category: 'water',
    latitude: 19.0418,
    longitude: 72.8524,
    region_name: 'Ward 12 - Dharavi / Shahu Nagar',
    urgency_score: 94.5,
    status: 'new',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'sub-002',
    raw_input_type: 'text',
    raw_text: 'High voltage transformer spark and oil leakage outside Urdu high school. Danger of electrocution during school hours.',
    language_detected: 'en',
    translated_text: 'High voltage transformer spark and oil leakage outside Urdu high school. Danger of electrocution during school hours.',
    category: 'electricity',
    latitude: 19.0435,
    longitude: 72.8510,
    region_name: 'Ward 12 - Dharavi / Shahu Nagar',
    urgency_score: 91.2,
    status: 'prioritized',
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'sub-003',
    raw_input_type: 'voice',
    raw_text: 'LBS Marg bridge approach has massive 2-foot sinkhole after water main collapse. Buses and ambulances getting stuck.',
    language_detected: 'en',
    translated_text: 'LBS Marg bridge approach has massive 2-foot sinkhole after water main collapse. Buses and ambulances getting stuck.',
    category: 'roads',
    latitude: 19.0712,
    longitude: 72.8812,
    region_name: 'Ward 9 - Kurla West / LBS Marg',
    urgency_score: 88.7,
    status: 'prioritized',
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: 'sub-004',
    raw_input_type: 'text',
    raw_text: 'Garbage compactor has not visited Baiganwadi sector 4 in 11 days. Piles spilling onto road blocking traffic.',
    language_detected: 'en',
    translated_text: 'Garbage compactor has not visited Baiganwadi sector 4 in 11 days. Piles spilling onto road blocking traffic.',
    category: 'sanitation',
    latitude: 19.0601,
    longitude: 72.9345,
    region_name: 'Ward 7 - Shivaji Nagar / Mankhurd',
    urgency_score: 86.3,
    status: 'new',
    created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
  },
  {
    id: 'sub-005',
    raw_input_type: 'voice',
    raw_text: 'Water contaminated with sewage line overflow in Govandi transit camp block C. Several children falling ill with dysentery.',
    language_detected: 'en',
    translated_text: 'Water contaminated with sewage line overflow in Govandi transit camp block C. Several children falling ill with dysentery.',
    category: 'water',
    latitude: 19.0575,
    longitude: 72.9120,
    region_name: 'Ward 15 - Chembur North / Govandi',
    urgency_score: 93.8,
    status: 'prioritized',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'sub-006',
    raw_input_type: 'chat',
    raw_text: 'Heavy commercial trailers broke underground fiber and storm water slab in MIDC Street 14. Flooding industrial gates.',
    language_detected: 'en',
    translated_text: 'Heavy commercial trailers broke underground fiber and storm water slab in MIDC Street 14. Flooding industrial gates.',
    category: 'roads',
    latitude: 19.1190,
    longitude: 72.8655,
    region_name: 'Ward 8 - Andheri East / MIDC Industrial',
    urgency_score: 76.4,
    status: 'reviewed',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'sub-007',
    raw_input_type: 'text',
    raw_text: 'Phase 2 main junction traffic lights non-functional for 48 hours causing 2-hour gridlock during peak shift change.',
    language_detected: 'en',
    translated_text: 'Phase 2 main junction traffic lights non-functional for 48 hours causing 2-hour gridlock during peak shift change.',
    category: 'electricity',
    latitude: 18.5930,
    longitude: 73.7410,
    region_name: 'Ward 22 - Hinjewadi IT Corridor',
    urgency_score: 71.2,
    status: 'new',
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: 'sub-008',
    raw_input_type: 'voice',
    raw_text: 'Heritage gate stone masonry crumbling near Lad Bazaar street lights due to illegal underground cable trenching.',
    language_detected: 'en',
    translated_text: 'Heritage gate stone masonry crumbling near Lad Bazaar street lights due to illegal underground cable trenching.',
    category: 'roads',
    latitude: 17.3625,
    longitude: 78.4735,
    region_name: 'Ward 11 - Old City / Charminar Heritage',
    urgency_score: 82.0,
    status: 'prioritized',
    created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
  },
  {
    id: 'sub-009',
    raw_input_type: 'text',
    raw_text: 'Tree branch fallen on low-hanging overhead cables near Hill Road junction. Streetlight circuit tripping repeatedly.',
    language_detected: 'en',
    translated_text: 'Tree branch fallen on low-hanging overhead cables near Hill Road junction. Streetlight circuit tripping repeatedly.',
    category: 'electricity',
    latitude: 19.0588,
    longitude: 72.8310,
    region_name: 'Ward 4 - Bandra West / Hill Road',
    urgency_score: 42.1,
    status: 'reviewed',
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: 'sub-010',
    raw_input_type: 'chat',
    raw_text: 'Stormwater gutter cover displaced near Oval Maidan walking track, potential tripping hazard for senior citizens.',
    language_detected: 'en',
    translated_text: 'Stormwater gutter cover displaced near Oval Maidan walking track, potential tripping hazard for senior citizens.',
    category: 'roads',
    latitude: 18.9245,
    longitude: 72.8330,
    region_name: 'Ward 1 - Colaba / Fort Financial District',
    urgency_score: 35.6,
    status: 'new',
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
];

class LocalDataStore {
  constructor() {
    this.regions = [...INITIAL_REGIONS];
    this.submissions = [...INITIAL_SUBMISSIONS];
    this.priorityProjects = recomputePriorityProjects(this.submissions, this.regions);
  }

  getRegions() {
    return [...this.regions];
  }

  getRegionByName(name) {
    if (!name) return null;
    return this.regions.find(r => r.region_name.toLowerCase().includes(name.toLowerCase())) || null;
  }

  getSubmissions({ region, category, status, limit = 50, sort = 'newest' } = {}) {
    let result = [...this.submissions];

    if (region && region !== 'all') {
      result = result.filter(s => s.region_name && s.region_name.toLowerCase().includes(region.toLowerCase()));
    }
    if (category && category !== 'all') {
      result = result.filter(s => s.category && s.category.toLowerCase() === category.toLowerCase());
    }
    if (status && status !== 'all') {
      result = result.filter(s => s.status && s.status.toLowerCase() === status.toLowerCase());
    }

    if (sort === 'urgency') {
      result.sort((a, b) => (b.urgency_score || 0) - (a.urgency_score || 0));
    } else {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return result.slice(0, Number(limit));
  }

  addSubmission(submissionData) {
    const matchingRegion = this.getRegionByName(submissionData.region_name) || this.regions[0];
    
    // Auto-compute score using scoring engine
    const urgency = computeUrgencyScore({
      category: submissionData.category || 'other',
      infraGapScore: matchingRegion?.infra_gap_score || 50,
      createdAt: new Date(),
    });

    const newSubmission = {
      id: `sub-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      raw_input_type: submissionData.raw_input_type || 'text',
      raw_text: submissionData.raw_text || '',
      language_detected: submissionData.language_detected || 'en',
      translated_text: submissionData.translated_text || submissionData.raw_text || '',
      category: submissionData.category || 'other',
      latitude: Number(submissionData.latitude) || matchingRegion.latitude,
      longitude: Number(submissionData.longitude) || matchingRegion.longitude,
      region_name: submissionData.region_name || matchingRegion.region_name,
      urgency_score: urgency,
      status: submissionData.status || 'new',
      created_at: new Date().toISOString(),
    };

    this.submissions.unshift(newSubmission);
    // Refresh priority projects
    this.priorityProjects = recomputePriorityProjects(this.submissions, this.regions);
    return newSubmission;
  }

  getPriorityProjects() {
    return [...this.priorityProjects];
  }

  recomputeScores() {
    // Re-score every submission
    this.submissions = this.submissions.map(sub => {
      const reg = this.getRegionByName(sub.region_name);
      const updatedUrgency = computeUrgencyScore({
        category: sub.category,
        infraGapScore: reg?.infra_gap_score || 50,
        createdAt: sub.created_at,
      });
      return { ...sub, urgency_score: updatedUrgency };
    });

    this.priorityProjects = recomputePriorityProjects(this.submissions, this.regions);
    return {
      success: true,
      submissionsCount: this.submissions.length,
      projectsCount: this.priorityProjects.length,
      topProject: this.priorityProjects[0] || null,
      recomputed_at: new Date().toISOString(),
    };
  }
}

export const localStore = new LocalDataStore();
