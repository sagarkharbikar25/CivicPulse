import { MOCK_REGIONS, MOCK_SUBMISSIONS, MOCK_PRIORITIES } from './mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// In-memory state for local fallback mode
let localSubmissions = [...MOCK_SUBMISSIONS];
let localPriorities = [...MOCK_PRIORITIES];

export async function fetchSubmissions(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.region) params.append('region', filters.region);
    if (filters.status) params.append('status', filters.status);

    const res = await fetch(`${BASE_URL}/api/submissions?${params.toString()}`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('API failed');
    return await res.json();
  } catch {
    // Fallback to local data
    let filtered = [...localSubmissions];
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(s => s.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(s => s.status.toLowerCase() === filters.status.toLowerCase());
    }
    return filtered;
  }
}

export async function fetchPriorities() {
  try {
    const res = await fetch(`${BASE_URL}/api/priority`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('API failed');
    return await res.json();
  } catch {
    return localPriorities;
  }
}

export async function fetchHeatmapData() {
  try {
    const res = await fetch(`${BASE_URL}/api/priority/heatmap`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('API failed');
    return await res.json();
  } catch {
    // Return geo-points derived from regions & submissions
    return MOCK_REGIONS.map(r => {
      const related = localSubmissions.filter(s => s.region_name === r.region_name);
      const intensity = related.length > 0
        ? related.reduce((acc, curr) => acc + curr.urgency_score, 0) / related.length
        : r.infra_gap_score;
      return {
        id: r.id,
        name: r.region_name,
        latitude: r.latitude,
        longitude: r.longitude,
        intensity: Math.min(100, Math.round(intensity)),
        submissionsCount: related.length || 3,
        population: r.population,
        gapScore: r.infra_gap_score,
      };
    });
  }
}

export async function fetchRegions() {
  try {
    const res = await fetch(`${BASE_URL}/api/regions`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('API failed');
    return await res.json();
  } catch {
    return MOCK_REGIONS;
  }
}

export async function submitTextComplaint(data) {
  try {
    const res = await fetch(`${BASE_URL}/api/submissions/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error('API failed');
    return await res.json();
  } catch {
    // Generate intelligent simulation in fallback mode
    const region = MOCK_REGIONS.find(r => r.region_name === data.region_name) || MOCK_REGIONS[0];
    const category = data.category || 'roads';
    const severity = data.severity || 7;
    const urgency = Math.min(100, Math.round((severity * 4) + (region.infra_gap_score * 0.35) + 15));

    const newSub = {
      id: `sub-${Date.now()}`,
      raw_input_type: 'text',
      raw_text: data.text,
      language_detected: 'English',
      translated_text: data.text,
      category: category,
      latitude: region.latitude + (Math.random() - 0.5) * 0.01,
      longitude: region.longitude + (Math.random() - 0.5) * 0.01,
      region_name: region.region_name,
      urgency_score: urgency,
      status: 'prioritized',
      created_at: new Date().toISOString(),
    };

    localSubmissions.unshift(newSub);
    return { success: true, submission: newSub };
  }
}

export async function recomputePriorities() {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/recompute`, {
      method: 'POST',
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error('API failed');
    return await res.json();
  } catch {
    return { success: true, count: localPriorities.length, timestamp: new Date().toISOString() };
  }
}

// Aliases for compatibility
export const getSubmissions = fetchSubmissions;
export const getPriorityHeatmap = fetchHeatmapData;

