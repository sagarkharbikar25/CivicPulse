import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseLive = Boolean(
  supabaseUrl && 
  supabaseUrl.startsWith('http') && 
  supabaseAnonKey && 
  supabaseAnonKey.length > 10
);

let client = null;

if (isSupabaseLive) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    console.log('[Supabase Client] Connected to live Supabase project:', supabaseUrl);
  } catch (err) {
    console.warn('[Supabase Client] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('[Supabase Client] Running in standalone demo mode with fast local polling.');
}

export const supabase = client;
