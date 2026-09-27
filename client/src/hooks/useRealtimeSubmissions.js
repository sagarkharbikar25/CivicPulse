import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseLive } from '../lib/supabaseClient';
import { getSubmissions, getPriorityHeatmap } from '../lib/api';

/**
 * Custom React hook for live Realtime Submissions sync
 * Subscribes to Supabase postgres_changes on table 'submissions'
 * with intelligent fallback polling when offline or in standalone mode.
 */
export function useRealtimeSubmissions({ onInsert, pollInterval = 5000 } = {}) {
  const [submissions, setSubmissions] = useState([]);
  const [latestSubmission, setLatestSubmission] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const seenIdsRef = useRef(new Set());

  // Fetch baseline submissions
  const loadSubmissions = useCallback(async () => {
    try {
      const data = await getSubmissions({ limit: 50, sort: 'newest' });
      if (Array.isArray(data) && data.length > 0) {
        setSubmissions(data);
        data.forEach(s => seenIdsRef.current.add(s.id));
        setConnectionStatus('connected');
      }
    } catch (err) {
      console.warn('[Realtime Hook] Initial load fallback:', err.message);
      setConnectionStatus('error');
    }
  }, []);

  // Handle incoming new submission
  const handleNewRecord = useCallback((newRecord) => {
    if (!newRecord || !newRecord.id) return;
    if (seenIdsRef.current.has(newRecord.id)) return;

    seenIdsRef.current.add(newRecord.id);
    const enriched = {
      ...newRecord,
      isNewLive: true,
      arrivedAt: Date.now(),
    };

    setLatestSubmission(enriched);
    setSubmissions(prev => [enriched, ...prev]);

    if (typeof onInsert === 'function') {
      onInsert(enriched);
    }
  }, [onInsert]);

  useEffect(() => {
    loadSubmissions();

    let channel = null;

    // 1. Setup Supabase Realtime WebSocket if configured
    if (isSupabaseLive && supabase) {
      try {
        channel = supabase
          .channel('public:submissions')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'submissions' },
            (payload) => {
              console.log('[Supabase Realtime] Live submission inserted:', payload.new);
              setIsLive(true);
              handleNewRecord(payload.new);
            }
          )
          .subscribe((status) => {
            console.log('[Supabase Realtime] Channel status:', status);
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

    // 2. Intelligent Polling Fallback to ensure updates never freeze
    const interval = setInterval(async () => {
      try {
        const latest = await getSubmissions({ limit: 10, sort: 'newest' });
        if (Array.isArray(latest)) {
          let foundNew = false;
          latest.forEach(item => {
            if (!seenIdsRef.current.has(item.id)) {
              handleNewRecord(item);
              foundNew = true;
            }
          });
          if (foundNew) {
            console.log('[Sync] New live submission received via sync');
          }
        }
      } catch (err) {
        // Silent error suppression on background sync
      }
    }, pollInterval);

    return () => {
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadSubmissions, handleNewRecord, pollInterval]);

  return {
    submissions,
    latestSubmission,
    isLive,
    connectionStatus,
    refresh: loadSubmissions,
    addLocalSubmission: handleNewRecord,
  };
}

export default useRealtimeSubmissions;
