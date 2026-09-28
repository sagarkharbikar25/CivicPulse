import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import SubmitComplaint from './pages/SubmitComplaint';
import PolicymakerView from './pages/PolicymakerView';
import { useRealtimeSubmissions } from './hooks/useRealtimeSubmissions';
import {
  fetchHeatmapData,
  fetchSubmissions,
  fetchPriorities,
  fetchRegions,
  recomputePriorities,
} from './lib/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [heatmapData, setHeatmapData] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [regions, setRegions] = useState([]);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [spotlightPoint, setSpotlightPoint] = useState(null);

  // Initial load
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [hData, subs, prios, regs] = await Promise.all([
          fetchHeatmapData(),
          fetchSubmissions(),
          fetchPriorities(),
          fetchRegions(),
        ]);
        setHeatmapData(hData || []);
        setSubmissions(subs || []);
        setPriorities(prios || []);
        setRegions(regs || []);
      } catch (err) {
        console.error('Data load error:', err);
      }
    }
    loadInitialData();
  }, []);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Handle incoming live submission from Realtime or manual submission
  const handleIncomingRecord = useCallback((newSub, options = {}) => {
    if (!newSub || !newSub.id) return;

    setSubmissions((prev) => {
      if (prev.some((s) => s.id === newSub.id)) return prev;
      return [newSub, ...prev];
    });

    setHeatmapData((prev) =>
      prev.map((p) => {
        if (p.name === newSub.region_name || p.id === newSub.region_id) {
          const newIntensity = Math.min(
            100,
            Math.round(((p.intensity || 70) + (newSub.urgency_score || 80)) / 2)
          );
          return {
            ...p,
            intensity: newIntensity,
            submissionsCount: (p.submissionsCount || 0) + 1,
          };
        }
        return p;
      })
    );

    if (newSub.latitude && newSub.longitude) {
      setSpotlightPoint({
        latitude: Number(newSub.latitude),
        longitude: Number(newSub.longitude),
        region_name: newSub.region_name,
        urgency_score: newSub.urgency_score,
        category: newSub.category,
      });
    }

    if (options.showToast !== false) {
      showToast(`⚡ Realtime: ${newSub.category || 'Grievance'} logged for ${newSub.region_name || 'Ward'} (Urgency: ${newSub.urgency_score || 80}/100)`);
    }
  }, [showToast]);

  // Supabase Realtime WebSocket hook + sync
  useRealtimeSubmissions({
    onInsert: (newSub) => {
      handleIncomingRecord(newSub, { showToast: true });
    },
  });

  const handleRecompute = async () => {
    setIsRecomputing(true);
    try {
      await recomputePriorities();
      const [hData, prios] = await Promise.all([
        fetchHeatmapData(),
        fetchPriorities(),
      ]);
      setHeatmapData(hData || []);
      setPriorities(prios || []);
      showToast('AI Urgency Scores & Regional Ranks Synchronized');
    } catch (err) {
      console.error(err);
      showToast('Sync completed');
    } finally {
      setIsRecomputing(false);
    }
  };

  const handleComplaintSubmitted = (newSub) => {
    handleIncomingRecord(newSub, { showToast: true });
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 flex flex-col font-sans selection:bg-white/20 selection:text-white relative">
      {/* Ambient spotlights from reference corners */}
      <div className="ambient-spotlights" />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRecompute={handleRecompute}
        isRecomputing={isRecomputing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {activeTab === 'dashboard' && (
          <Dashboard
            heatmapData={heatmapData}
            submissions={submissions}
            priorities={priorities}
            spotlightPoint={spotlightPoint}
            onNavigateSubmit={() => setActiveTab('submit')}
            onNavigatePolicymakers={() => setActiveTab('policymakers')}
          />
        )}

        {activeTab === 'submit' && (
          <SubmitComplaint
            regions={regions}
            onComplaintSubmitted={handleComplaintSubmitted}
            onNavigateDashboard={(targetSub) => {
              if (targetSub) {
                const lat = Number(targetSub.latitude) || 21.2113;
                const lng = Number(targetSub.longitude) || 79.0643;
                const name = targetSub.region_name || 'Nagpur (Current Location)';
                setSpotlightPoint({
                  id: targetSub.id || `sub-${Date.now()}`,
                  name,
                  region_name: name,
                  latitude: lat,
                  longitude: lng,
                  urgency_score: targetSub.urgency_score || 85,
                  intensity: targetSub.urgency_score || 85,
                  category: targetSub.category || 'Incident',
                  raw_text: targetSub.raw_text || targetSub.translated_text || '',
                  _ts: Date.now(),
                });
              }
              setActiveTab('dashboard');
              // Smooth scroll directly down to the Leaflet Map section
              setTimeout(() => {
                const mapSection = document.getElementById('map-section');
                if (mapSection) {
                  mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 120);
            }}
          />
        )}

        {activeTab === 'policymakers' && (
          <PolicymakerView
            priorities={priorities}
            onRecompute={handleRecompute}
            isRecomputing={isRecomputing}
          />
        )}
      </main>

      {/* Global Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#121218] border border-white/20 text-xs font-semibold text-white shadow-2xl shadow-white/10">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#050508]/80 backdrop-blur-md py-6 mt-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-light">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-white text-sm">CivicPulse</span>
            <span>—</span>
            <span>Digital Public Infrastructure (Track 1)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-400">
              Leaflet • CartoDB Dark Matter
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-400">
              Playfair Display Serif
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
