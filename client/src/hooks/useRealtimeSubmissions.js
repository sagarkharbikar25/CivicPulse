import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseLive } from '../lib/supabaseClient';
import { getSubmissions } from '../lib/api';

/**
 * Custom React hook for live Realtime Submissions sync
 * Subscribes to Supabase postgres_changes on table 'submissions'
 * with intelligent fallback polling when offline or in standalone mode.
 */
export function useRealtimeSubmissions({ onInsert, pollInterval = 30000 } = {}) {
  const [submissions, setSubmissions] = useState([]);
  const [latestSubmission, setLatestSubmission] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const seenIdsRef = useRef(new Set());
  const onInsertRef = useRef(onInsert);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    onInsertRef.current = onInsert;
  }, [onInsert]);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    let isMounted = true;
    let channel = null;

    // Fetch baseline submissions once on mount
    getSubmissions({ limit: 50, sort: 'newest' })
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          setSubmissions(data);
          data.forEach((s) => seenIdsRef.current.add(s.id));
          setConnectionStatus('connected');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[Realtime Hook] Initial load fallback:', err.message);
        setConnectionStatus('error');
      });

    // 1. Setup Supabase Realtime WebSocket if configured
    if (isSupabaseLive && supabase) {
      try {
        channel = supabase
          .channel('public:submissions')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'submissions' },
            (payload) => {
              if (isMounted && payload?.new?.id) {
                if (seenIdsRef.current.has(payload.new.id)) return;
                seenIdsRef.current.add(payload.new.id);

                const enriched = {
                  ...payload.new,
                  isNewLive: true,
                  arrivedAt: Date.now(),
                };

                setLatestSubmission(enriched);
                setSubmissions((prev) => [enriched, ...prev]);

                if (typeof onInsertRef.current === 'function') {
                  onInsertRef.current(enriched);
                }
              }
            }
          )
          .subscribe((status) => {
            if (!isMounted) return;
            if (status === 'SUBSCRIBED') {
              setIsLive(true);
              setConnectionStatus('live_websocket');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setIsLive(false);
              setConnectionStatus('fallback_polling');
            }
          });
      } catch (err) {
        console.warn('[Supabase Realtime] Subscription error:', err.message);
      }
    }

    // 2. Slow Polling Fallback (runs every 30s)
    const interval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const latest = await getSubmissions({ limit: 10, sort: 'newest' });
        if (Array.isArray(latest) && isMounted) {
          latest.forEach((item) => {
            if (item && item.id && !seenIdsRef.current.has(item.id)) {
              seenIdsRef.current.add(item.id);
              const enriched = { ...item, isNewLive: true, arrivedAt: Date.now() };
              setLatestSubmission(enriched);
              setSubmissions((prev) => [enriched, ...prev]);
              if (typeof onInsertRef.current === 'function') {
                onInsertRef.current(enriched);
              }
            }
          });
        }
      } catch {
        // Silent error suppression
      }
    }, pollInterval || 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    submissions,
    latestSubmission,
    isLive,
    connectionStatus,
  };
}

export default useRealtimeSubmissions;
