/**
 * Supabase Admin Client & Database Abstraction
 * Uses service role key for full server-side access to submissions, region_index, and priority_projects.
 * Includes transparent fallback to localStore if credentials are not yet configured.
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import { localStore } from './localStore.js';
import { coerceNumber } from '../services/scoringEngine.js';

dotenv.config();

/**
 * Derives a stable UUIDv5 from a natural key so that repeated recomputes
 * upsert the same row instead of churning ids.
 */
function deterministicUuid(key) {
  const NAMESPACE = '6f1a7c58-1f3a-5b2e-9d44-8c0a1e2b3c4d';
  const hex = createHash('sha1').update(`${NAMESPACE}:${key}`).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join('-');
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)?.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl.startsWith('http') && 
  supabaseServiceKey && 
  supabaseServiceKey.length > 10
);

/**
 * Test isolation gate.
 *
 * Automated tests must never mutate the live Supabase project that backs the
 * demo, otherwise every run permanently pollutes the production dataset and
 * makes results non-deterministic. Set CIVICPULSE_TEST_USE_LIVE_DB=true to
 * opt back into live-database integration runs.
 */
export function shouldUseSupabase() {
  if (!supabaseClient) return false;
  if (process.env.NODE_ENV === 'test' && process.env.CIVICPULSE_TEST_USE_LIVE_DB !== 'true') {
    return false;
  }
  return true;
}

let supabaseClient = null;

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

const DEFAULT_SUBMISSION_LIMIT = 50;
const MAX_SUBMISSION_LIMIT = 1000;

/**
 * Coerces a user-supplied `limit` into a safe positive integer.
 * Without this, `?limit=abc` produces NaN, which silently yields an empty
 * result set in the in-memory store and an error in PostgREST.
 */
export function normalizeLimit(limit, fallback = DEFAULT_SUBMISSION_LIMIT) {
  const parsed = Number.parseInt(limit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_SUBMISSION_LIMIT);
}

if (isSupabaseConfigured) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[DB] Supabase admin client initialized successfully.');
  } catch (err) {
    console.warn('[DB] Supabase initialization failed, falling back to local store:', err.message);
  }
} else {
  console.log('[DB] Supabase credentials not set or incomplete. Running with in-memory resilient data store.');
}

export function getSupabase() {
  return supabaseClient;
}

/**
 * Fetch all regions from region_index
 */
export async function getRegions() {
  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabaseClient
        .from('region_index')
        .select('*')
        .order('infra_gap_score', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        const clean = data.filter(r => !isLegacyDummy(r.region_name));
        if (clean.length > 0) return clean;
      }
    } catch (err) {
      console.warn('[DB] Supabase getRegions failed, falling back:', err.message);
    }
  }
  return localStore.getRegions().filter(r => !isLegacyDummy(r.region_name));
}

/**
 * Fetch submissions with filtering
 */
export async function getSubmissions({ region, category, status, limit = 50, sort = 'newest' } = {}) {
  const safeLimit = normalizeLimit(limit);
  if (shouldUseSupabase()) {
    try {
      let query = supabaseClient.from('submissions').select('*');

      if (region && region !== 'all') {
        query = query.ilike('region_name', `%${region}%`);
      }
      if (category && category !== 'all') {
        query = query.eq('category', category.toLowerCase());
      }
      if (status && status !== 'all') {
        query = query.eq('status', status.toLowerCase());
      }

      if (sort === 'urgency') {
        query = query.order('urgency_score', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      query = query.limit(safeLimit);

      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        return data.filter(s => !isLegacyDummy(s.region_name));
      }
    } catch (err) {
      console.warn('[DB] Supabase getSubmissions failed, falling back:', err.message);
    }
  }

  return localStore.getSubmissions({ region, category, status, limit: safeLimit, sort }).filter(s => !isLegacyDummy(s.region_name));
}

/**
 * Create a new submission
 */
export async function createSubmission(submissionData) {
  if (shouldUseSupabase()) {
    try {
      const row = {
        raw_input_type: submissionData.raw_input_type || 'text',
        raw_text: submissionData.raw_text,
        language_detected: submissionData.language_detected || 'en',
        translated_text: submissionData.translated_text || submissionData.raw_text,
        category: submissionData.category || 'other',
        latitude: coerceNumber(submissionData.latitude, 21.1458),
        longitude: coerceNumber(submissionData.longitude, 79.0720),
        region_name: submissionData.region_name || 'Zone 2 - Dharampeth / Civil Lines (Nagpur)',
        urgency_score: coerceNumber(submissionData.urgency_score, 75),
        status: submissionData.status || 'new',
      };

      const { data, error } = await supabaseClient
        .from('submissions')
        .insert([row])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        localStore.trackSubmission(data);
        return data;
      }
    } catch (err) {
      console.warn('[DB] Supabase createSubmission failed, falling back:', err.message);
    }
  }

  return localStore.addSubmission(submissionData);
}

/**
 * Fetch priority projects
 */
export async function getPriorityProjects() {
  if (shouldUseSupabase()) {
    try {
      const { data, error } = await supabaseClient
        .from('priority_projects')
        .select('*')
        .order('final_priority_rank', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        const clean = data.filter(p => !isLegacyDummy(p.region_name));
        if (clean.length > 0) return clean;
      }
    } catch (err) {
      console.warn('[DB] Supabase getPriorityProjects failed, falling back:', err.message);
    }
  }

  return localStore.getPriorityProjects().filter(p => !isLegacyDummy(p.region_name));
}

/**
 * Persist or recompute priority projects.
 */
export async function syncPriorityProjects(projects) {
  if (shouldUseSupabase() && projects.length > 0) {
    try {
      // Purge any legacy dummy records from priority_projects
      await supabaseClient
        .from('priority_projects')
        .delete()
        .or('region_name.ilike.%dharavi%,region_name.ilike.%kurla%,region_name.ilike.%shahu nagar%,region_name.ilike.%mankhurd%,region_name.ilike.%bandra%,region_name.ilike.%chembur%,region_name.ilike.%andheri%,region_name.ilike.%colaba%');

      const sanitized = projects
        .filter(p => !isLegacyDummy(p.region_name))
        .map((p) => ({
          id: deterministicUuid(`${p.region_name}::${p.category}`),
          region_name: p.region_name,
          category: p.category,
          submission_count: coerceNumber(p.submission_count, 1),
          avg_urgency: coerceNumber(p.avg_urgency, 75),
          final_priority_rank: coerceNumber(p.final_priority_rank, 1),
          recommended_action: p.recommended_action || 'Public works intervention required.',
        }));

      if (sanitized.length > 0) {
        const { data, error } = await supabaseClient
          .from('priority_projects')
          .upsert(sanitized, { onConflict: 'id' })
          .select();
        if (error) throw error;
        return data;
      }
    } catch (err) {
      console.warn('[DB] Supabase syncPriorityProjects failed, falling back:', err.message);
    }
  }

  return localStore.priorityProjects.filter(p => !isLegacyDummy(p.region_name));
}

/**
 * Trigger recompute across store
 */
export async function recomputeAll() {
  const regions = await getRegions();
  const submissions = await getSubmissions({ limit: MAX_SUBMISSION_LIMIT });

  if (Array.isArray(regions) && regions.length > 0) {
    localStore.regions = regions;
  }
  if (Array.isArray(submissions) && submissions.length > 0) {
    localStore.submissions = submissions;
  }

  const result = localStore.recomputeScores();

  if (shouldUseSupabase()) {
    try {
      await supabaseClient
        .from('submissions')
        .delete()
        .or('region_name.ilike.%dharavi%,region_name.ilike.%kurla%,region_name.ilike.%shahu nagar%,region_name.ilike.%mankhurd%,region_name.ilike.%bandra%,region_name.ilike.%chembur%,region_name.ilike.%andheri%,region_name.ilike.%colaba%');
      await syncPriorityProjects(result.topProject ? localStore.priorityProjects : []);
    } catch (e) {
      console.warn('[DB] Recompute sync error:', e.message);
    }
  }

  return result;
}
