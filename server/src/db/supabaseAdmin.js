/**
 * Supabase Admin Client & Database Abstraction
 * Uses service role key for full server-side access to submissions, region_index, and priority_projects.
 * Includes transparent fallback to localStore if credentials are not yet configured.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { localStore } from './localStore.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)?.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl.startsWith('http') && 
  supabaseServiceKey && 
  supabaseServiceKey.length > 10
);

let supabaseClient = null;

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
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('region_index')
        .select('*')
        .order('infra_gap_score', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) return data;
    } catch (err) {
      console.warn('[DB] Supabase getRegions failed, falling back:', err.message);
    }
  }
  return localStore.getRegions();
}

/**
 * Fetch submissions with filtering
 */
export async function getSubmissions({ region, category, status, limit = 50, sort = 'newest' } = {}) {
  if (supabaseClient) {
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

      query = query.limit(Number(limit));

      const { data, error } = await query;
      if (error) throw error;
      if (data) return data;
    } catch (err) {
      console.warn('[DB] Supabase getSubmissions failed, falling back:', err.message);
    }
  }

  return localStore.getSubmissions({ region, category, status, limit, sort });
}

/**
 * Create a new submission
 */
export async function createSubmission(submissionData) {
  if (supabaseClient) {
    try {
      const row = {
        raw_input_type: submissionData.raw_input_type || 'text',
        raw_text: submissionData.raw_text,
        language_detected: submissionData.language_detected || 'en',
        translated_text: submissionData.translated_text || submissionData.raw_text,
        category: submissionData.category || 'other',
        latitude: Number(submissionData.latitude) || 19.0402,
        longitude: Number(submissionData.longitude) || 72.8508,
        region_name: submissionData.region_name || 'Ward 12 - Dharavi / Shahu Nagar',
        urgency_score: Number(submissionData.urgency_score) || 75,
        status: submissionData.status || 'classified',
      };

      const { data, error } = await supabaseClient
        .from('submissions')
        .insert([row])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        localStore.addSubmission(data);
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
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('priority_projects')
        .select('*')
        .order('final_priority_rank', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) return data;
    } catch (err) {
      console.warn('[DB] Supabase getPriorityProjects failed, falling back:', err.message);
    }
  }

  return localStore.getPriorityProjects();
}

/**
 * Persist or recompute priority projects
 */
export async function syncPriorityProjects(projects) {
  if (supabaseClient && projects.length > 0) {
    try {
      const sanitized = projects.map(p => {
        const row = {
          region_name: p.region_name,
          category: p.category,
          submission_count: Number(p.submission_count) || 1,
          avg_urgency: Number(p.avg_urgency) || 75,
          final_priority_rank: Number(p.final_priority_rank) || 1,
          recommended_action: p.recommended_action || 'Public works intervention required.',
        };
        if (p.id && typeof p.id === 'string' && p.id.length === 36 && p.id.includes('-')) {
          row.id = p.id;
        }
        return row;
      });

      // Clear and re-insert priority projects
      await supabaseClient.from('priority_projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { data, error } = await supabaseClient.from('priority_projects').insert(sanitized).select();
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[DB] Supabase syncPriorityProjects failed, falling back:', err.message);
    }
  }

  return localStore.priorityProjects;
}

/**
 * Trigger recompute across store
 */
export async function recomputeAll() {
  const regions = await getRegions();
  const submissions = await getSubmissions({ limit: 1000 });
  
  if (Array.isArray(regions) && regions.length > 0) {
    localStore.regions = regions;
  }
  if (Array.isArray(submissions) && submissions.length > 0) {
    localStore.submissions = submissions;
  }

  const result = localStore.recomputeScores();

  if (supabaseClient) {
    try {
      await syncPriorityProjects(result.topProject ? localStore.priorityProjects : []);
    } catch (e) {
      console.warn('[DB] Recompute sync error:', e.message);
    }
  }

  return result;
}
