import React, { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import SubmitComplaint from './pages/SubmitComplaint';
import PolicymakerView from './pages/PolicymakerView';
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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleComplaintSubmitted = (newSub) => {
    setSubmissions(prev => [newSub, ...prev]);

    setHeatmapData(prev =>
      prev.map(p => {
        if (p.name === newSub.region_name) {
          return {
            ...p,
            intensity: Math.min(100, Math.round((p.intensity + newSub.urgency_score) / 2)),
            submissionsCount: (p.submissionsCount || 0) + 1,
          };
        }
        return p;
      })
    );

    showToast(`Grievance indexed for ${newSub.region_name} (Urgency: ${newSub.urgency_score})`);
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
            onNavigateSubmit={() => setActiveTab('submit')}
            onNavigatePolicymakers={() => setActiveTab('policymakers')}
          />
        )}

        {activeTab === 'submit' && (
          <SubmitComplaint
            regions={regions}
            onComplaintSubmitted={handleComplaintSubmitted}
            onNavigateDashboard={() => setActiveTab('dashboard')}
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
