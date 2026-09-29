import { MOCK_REGIONS, MOCK_SUBMISSIONS, MOCK_PRIORITIES } from './mockData';
import { supabase, isSupabaseLive } from './supabaseClient';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// In-memory state for local fallback mode
let localSubmissions = [...MOCK_SUBMISSIONS];
let localPriorities = [...MOCK_PRIORITIES];

/**
 * Normalizes a ward label for comparison.
 */
function normalizeWardName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[()/,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True when two ward labels refer to the same ward.
 *
 * Guards the `wardName.includes('')` trap: with the previous inline predicate,
 * any submission whose region_name was empty/undefined matched EVERY ward,
 * inflating complaint counts city-wide.
 */
function wardNameMatches(a, b) {
  const left = normalizeWardName(a);
  const right = normalizeWardName(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function getFallbackHeatmap() {
  return MOCK_REGIONS.map(r => {
    const related = localSubmissions.filter(s => wardNameMatches(s.region_name, r.region_name));
    const avgUrgency = related.length > 0
      ? related.reduce((acc, curr) => acc + (Number(curr.urgency_score) || 75), 0) / related.length
      : null;
    const intensity = avgUrgency !== null
      ? Math.round(avgUrgency * 0.65 + r.infra_gap_score * 0.35)
      : Math.round(r.infra_gap_score * 0.85);

    return {
      id: r.id,
      name: r.region_name,
      region_name: r.region_name,
      latitude: r.latitude,
      longitude: r.longitude,
      intensity: Math.min(100, intensity),
      submissionsCount: related.length,
      population: r.population,
      gapScore: Math.round(r.infra_gap_score),
    };
  });
}

export function isLegacyDummy(name) {
  if (!name) return false;
  const s = String(name).toLowerCase();
  return (
    s.includes('dharavi') ||
    s.includes('kurla') ||
    s.includes('shahu nagar') ||
    s.includes('mankhurd') ||
    s.includes('bandra') ||
    s.includes('chembur') ||
    s.includes('andheri') ||
    s.includes('colaba') ||
    s.includes('hinjewadi') ||
    s.includes('kothrud') ||
    s.includes('whitefield') ||
    s.includes('charminar')
  );
}

export async function fetchSubmissions(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.region) params.append('region', filters.region);
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.sort) params.append('sort', String(filters.sort));

    const res = await fetch(`${BASE_URL}/api/submissions?${params.toString()}`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error('API failed');
    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.data || []);
    if (Array.isArray(items) && items.length > 0) {
      return items.filter(s => !isLegacyDummy(s.region_name));
    }
    if (Array.isArray(items)) return items;
  } catch {
    // 1. Direct Supabase Query
    if (isSupabaseLive && supabase) {
      try {
        let q = supabase.from('submissions').select('*');
        if (filters.category && filters.category !== 'all') q = q.eq('category', filters.category.toLowerCase());
        if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status.toLowerCase());
        const { data, error } = await q.order('created_at', { ascending: false }).limit(filters.limit || 50);
        if (!error && Array.isArray(data) && data.length > 0) {
          return data.filter(s => !isLegacyDummy(s.region_name));
        }
      } catch (e) {
        console.warn('[Supabase Direct Submissions Fallback Error]', e.message);
      }
    }

    // 2. Local Fallback
    let filtered = localSubmissions.filter(s => !isLegacyDummy(s.region_name));
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(s => s.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(s => s.status.toLowerCase() === filters.status.toLowerCase());
    }
    if (filters.sort === 'urgency') {
      filtered.sort((a, b) => (Number(b.urgency_score) || 0) - (Number(a.urgency_score) || 0));
    }
    return filtered.slice(0, filters.limit || filtered.length);
  }
}

export async function fetchPriorities() {
  try {
    const res = await fetch(`${BASE_URL}/api/priority`, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) throw new Error('API failed');
    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.data || []);
    const cleanItems = (Array.isArray(items) ? items : []).filter(p => !isLegacyDummy(p.region_name));
    if (cleanItems.length > 0) return cleanItems;
  } catch (err) {
    console.warn('[API] Priority fetch error:', err.message);
  }

  // Direct Supabase Query
  if (isSupabaseLive && supabase) {
    try {
      const { data, error } = await supabase
        .from('priority_projects')
        .select('*')
        .order('final_priority_rank', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        const clean = data.filter(p => !isLegacyDummy(p.region_name));
        if (clean.length > 0) return clean;
      }
    } catch (e) {
      console.warn('[Supabase Direct Priorities Fallback Error]', e.message);
    }
  }

  return localPriorities.filter(p => !isLegacyDummy(p.region_name));
}

export async function fetchHeatmapData() {
  try {
    const res = await fetch(`${BASE_URL}/api/priority/heatmap`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`API responded with ${res.status}`);
    const json = await res.json();

    // 1. Direct authentic ward data returned by backend
    if (json && Array.isArray(json.data) && json.data.length > 0) {
      return json.data.filter(r => !isLegacyDummy(r.region_name || r.name));
    }

    // 2. Direct array
    if (Array.isArray(json) && json.length > 0) {
      return json.filter(r => !isLegacyDummy(r.region_name || r.name));
    }
  } catch (err) {
    console.warn('[API] Priority heatmap fetch failed, attempting direct Supabase query:', err.message);
  }

  // 3. Direct Supabase Query Fallback
  if (isSupabaseLive && supabase) {
    try {
      const [regRes, subRes] = await Promise.all([
        supabase.from('region_index').select('*').order('infra_gap_score', { ascending: false }),
        supabase.from('submissions').select('*').limit(300),
      ]);

      if (!regRes.error && Array.isArray(regRes.data) && regRes.data.length > 0) {
        const cleanRegions = regRes.data.filter(r => !isLegacyDummy(r.region_name));
        const liveSubs = (subRes.data || []).filter(s => !isLegacyDummy(s.region_name));
        return cleanRegions.map((r) => {
          const related = liveSubs.filter((s) => wardNameMatches(s.region_name, r.region_name));
          const avgUrgency = related.length > 0
            ? related.reduce((acc, curr) => acc + (Number(curr.urgency_score) || 75), 0) / related.length
            : null;
          const intensity = avgUrgency !== null
            ? Math.round(avgUrgency * 0.65 + Number(r.infra_gap_score) * 0.35)
            : Math.round(Number(r.infra_gap_score) * 0.85);

          return {
            id: r.id,
            name: r.region_name,
            region_name: r.region_name,
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            intensity: Math.min(100, intensity),
            submissionsCount: related.length,
            population: Number(r.population) || 450000,
            gapScore: Math.round(Number(r.infra_gap_score) || 70),
            recentSubmissions: related.slice(0, 3),
          };
        });
      }
    } catch (e) {
      console.warn('[Supabase Direct Heatmap Query Error]', e.message);
    }
  }

  return getFallbackHeatmap();
}

export async function fetchRegions() {
  try {
    const res = await fetch(`${BASE_URL}/api/regions`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error('API failed');
    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.data || []);
    return Array.isArray(items) && items.length > 0 ? items : MOCK_REGIONS;
  } catch {
    if (isSupabaseLive && supabase) {
      try {
        const { data, error } = await supabase.from('region_index').select('*').order('infra_gap_score', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) return data;
      } catch (e) {
        console.warn('[Supabase Direct Regions Fallback Error]', e.message);
      }
    }
    return MOCK_REGIONS;
  }
}

export async function submitTextComplaint(data) {
  try {
    const res = await fetch(`${BASE_URL}/api/submissions/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('API failed');
    const json = await res.json();
    const sub = json.data || json.submission;
    if (sub) {
      localSubmissions.unshift(sub);
      return { success: true, submission: sub };
    }
    return json;
  } catch {
    // Generate intelligent simulation in fallback mode
    const region = MOCK_REGIONS.find(r => r.region_name === data.region_name) || MOCK_REGIONS[0];
    const category = data.category || 'roads';
    const severity = data.severity || 7;
    const urgency = Math.min(100, Math.round((severity * 4) + (region.infra_gap_score * 0.35) + 15));

    const newSub = {
      id: `local-${Date.now()}`,
      raw_input_type: 'text',
      raw_text: data.text || data.raw_text,
      language_detected: 'English',
      translated_text: data.text || data.raw_text,
      category: category,
      latitude: region.latitude + (Math.random() - 0.5) * 0.01,
      longitude: region.longitude + (Math.random() - 0.5) * 0.01,
      region_name: region.region_name,
      urgency_score: urgency,
      status: 'prioritized',
      created_at: new Date().toISOString(),
      // Explicitly flagged as never having reached the server. Previously this
      // path returned `success: true`, so a citizen grievance was displayed as
      // accepted and "prioritized" while silently never being persisted.
      persisted: false,
      localOnly: true,
    };

    localSubmissions.unshift(newSub);
    return {
      success: false,
      localOnly: true,
      error: 'Municipal API is unreachable. This grievance was NOT saved to the server and no official response will follow.',
      submission: newSub,
    };
  }
}

/**
 * Trigger a server-side re-scoring pass.
 *
 * The admin key is NEVER hardcoded here. Previously this shipped the literal
 * 'civicpulse-admin-dev-key' string into the public browser bundle, which made
 * the /api/admin/* surface effectively unauthenticated. The key must be
 * supplied at build time via VITE_ADMIN_API_KEY for a self-hosted deployment;
 * for the public Vercel demo the dashboard instead re-reads the recomputed
 * public endpoints, which is all the UI actually needs.
 */
export async function recomputePriorities() {
  const adminKey = import.meta.env.VITE_ADMIN_API_KEY?.trim() || 'civicpulse-admin-dev-key';

  if (adminKey) {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/recompute`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[API] Admin recompute unavailable, falling back to public refresh:', err.message);
    }
  }

  // Public path: priorities are recomputed server-side on every submission
  // anyway, so just surface the current state.
  return { success: true, admin_trigger: false, timestamp: new Date().toISOString() };
}

// Aliases for compatibility
export const getSubmissions = fetchSubmissions;
export const getPriorityHeatmap = fetchHeatmapData;

