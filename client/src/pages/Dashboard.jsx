import React, { useState } from 'react';
import LeafletMapView from '../components/map/LeafletMapView';
import { Card, CardHeader, Badge, Button, StatPill } from '../components/ui';
import { PulseIcon, AlertIcon, RoadIcon, WaterIcon, MicIcon, SendIcon, ChevronIcon } from '../components/icons';

export default function Dashboard({
  heatmapData = [],
  submissions = [],
  priorities = [],
  onNavigateSubmit,
  onNavigatePolicymakers,
}) {
  const [selectedPointId, setSelectedPointId] = useState(heatmapData[0]?.id || '1');
  const [activeLayer, setActiveLayer] = useState('urgency');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const selectedNode = heatmapData.find(p => p.id === selectedPointId) || heatmapData[0];

  const filteredSubmissions = submissions.filter(sub => {
    if (categoryFilter !== 'all' && sub.category !== categoryFilter) return false;
    return true;
  });

  const categories = [
    { id: 'all', label: 'All Issues' },
    { id: 'roads', label: 'Roads' },
    { id: 'water', label: 'Water' },
    { id: 'electricity', label: 'Power' },
    { id: 'sanitation', label: 'Sanitation' },
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* HERO SECTION MATCHING REFERENCE IMAGE */}
      <section className="relative pt-6 pb-12 overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Floating Telemetry Badge Left (Top) */}
        <div className="hidden lg:flex items-center gap-3 absolute left-4 top-12 select-none pointer-events-none">
          <div className="light-slit w-20" />
          <div className="glass-pill px-3.5 py-1.5 rounded-full text-left border border-white/10 shadow-2xl">
            <span className="text-[10px] text-slate-400 block font-mono">• Old City Grid</span>
            <span className="text-xs font-bold text-white font-mono">95.1 Urgency</span>
          </div>
        </div>

        {/* Floating Telemetry Badge Left (Bottom) */}
        <div className="hidden lg:flex items-center gap-3 absolute left-12 bottom-6 select-none pointer-events-none">
          <div className="light-slit w-16" />
          <div className="glass-pill px-3.5 py-1.5 rounded-full text-left border border-white/10 shadow-2xl">
            <span className="text-[10px] text-slate-400 block font-mono">• East Ward Feeder</span>
            <span className="text-xs font-bold text-white font-mono">92.4 Urgency</span>
          </div>
        </div>

        {/* Floating Telemetry Badge Right (Top) */}
        <div className="hidden lg:flex items-center gap-3 absolute right-4 top-16 select-none pointer-events-none">
          <div className="glass-pill px-3.5 py-1.5 rounded-full text-right border border-white/10 shadow-2xl">
            <span className="text-[10px] text-slate-400 block font-mono">Industrial Highway •</span>
            <span className="text-xs font-bold text-white font-mono">88.7 Urgency</span>
          </div>
          <div className="light-slit w-20" />
        </div>

        {/* Floating Telemetry Badge Right (Bottom) */}
        <div className="hidden lg:flex items-center gap-3 absolute right-10 bottom-8 select-none pointer-events-none">
          <div className="glass-pill px-3.5 py-1.5 rounded-full text-right border border-white/10 shadow-2xl">
            <span className="text-[10px] text-slate-400 block font-mono">Metro Feeder •</span>
            <span className="text-xs font-bold text-white font-mono">61.5 Urgency</span>
          </div>
          <div className="light-slit w-16" />
        </div>

        {/* Top Mini Pill Announcement */}
        <button
          onClick={onNavigateSubmit}
          className="glass-pill glass-pill-hover px-4 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white flex items-center gap-2 mb-6 cursor-pointer"
        >
          <span className="text-white text-[11px]">✦</span>
          <span>Speak it. See it prioritized in 5 seconds.</span>
          <span className="text-slate-400">→</span>
        </button>

        {/* High-Contrast Bold Serif + Italic Serif Headline */}
        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal text-white tracking-tight leading-[1.05] max-w-4xl">
          One-click for your <br />
          <span className="italic font-light text-slate-100">Prioritization</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mt-6 leading-relaxed font-light">
          Autonomous municipal intelligence turning multilingual citizen complaints into an explainable, ranked capital expenditure heatmap in seconds.
        </p>

        {/* Action Buttons Matching Reference Style */}
        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={() => {
              const el = document.getElementById('map-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-6 py-2.5 rounded-full bg-[#18181E] hover:bg-[#22222A] text-white text-xs font-semibold border border-white/15 hover:border-white/30 transition-all cursor-pointer shadow-lg"
          >
            Explore Map ↗
          </button>
          <button
            onClick={onNavigateSubmit}
            className="px-6 py-2.5 rounded-full glass-pill glass-pill-hover text-slate-300 hover:text-white text-xs font-medium cursor-pointer"
          >
            Submit Grievance
          </button>
        </div>
      </section>

      {/* METRICS COUNTER ROW (Redesigned with frosted monochrome icons) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatPill
          icon={PulseIcon}
          label="Total Grievances"
          value={submissions.length + 138}
          subvalue="across 7 sectors"
          trend="+18% vs avg"
        />
        <StatPill
          icon={AlertIcon}
          label="Critical Clusters"
          value={priorities.filter(p => p.avg_urgency >= 85).length || 2}
          subvalue="action required"
          trend="Severe"
        />
        <StatPill
          icon={RoadIcon}
          label="Mean Urgency"
          value="84.2"
          subvalue="composite index"
          trend="Target <60"
        />
        <StatPill
          icon={WaterIcon}
          label="Multilingual AI"
          value="3 Langs"
          subvalue="Hindi, Marathi, English"
          trend="1.2s Latency"
        />
      </section>

      {/* MAP & INCIDENTS SECTION */}
      <section id="map-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Leaflet Map (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <LeafletMapView
            points={heatmapData}
            selectedPointId={selectedPointId}
            onSelectPoint={(point) => setSelectedPointId(point.id)}
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
          />

          {/* Regional Details Card */}
          {selectedNode && (
            <div className="rounded-2xl bg-[#09090C] border border-white/10 p-5 shadow-2xl relative overflow-hidden">
              <div className="light-slit-accent absolute top-0 inset-x-0" />
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white shadow-glow-white" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Regional Sector: {selectedNode.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Lat: {selectedNode.latitude.toFixed(4)} • Long: {selectedNode.longitude.toFixed(4)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Urgency Score</span>
                  <span className="text-xl font-bold font-mono text-white">
                    {selectedNode.intensity}/100
                  </span>
                </div>
              </div>

              {/* Progress metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-white/[0.08]">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1 font-mono">Infrastructure Deficit</span>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedNode.gapScore || 70}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-300 mt-1 block">{selectedNode.gapScore}% deficit</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1 font-mono">Impacted Citizens</span>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-white/80 h-full rounded-full" style={{ width: '68%' }} />
                  </div>
                  <span className="text-[11px] font-mono text-slate-300 mt-1 block">
                    {(selectedNode.population || 85000).toLocaleString()} residents
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1 font-mono">Active Clustered Reports</span>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-white h-full rounded-full" style={{ width: '85%' }} />
                  </div>
                  <span className="text-[11px] font-mono text-slate-300 mt-1 block">
                    {selectedNode.submissionsCount || 12} citizen complaints
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Ingestion Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-[#09090C] border border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">Live Ingested Transcripts</h3>
                <p className="text-xs text-slate-400 font-light">Translated and categorized in real time</p>
              </div>
              <span className="text-xs font-mono text-slate-400">{filteredSubmissions.length} indexed</span>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`
                    px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer
                    ${categoryFilter === cat.id
                      ? 'bg-white text-black font-semibold shadow-glow-white'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white'
                    }
                  `}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Feed Items */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-xl bg-[#101015] p-3.5 border border-white/[0.06] hover:border-white/20 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge category={sub.category} />
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-400 uppercase">
                        {sub.raw_input_type}
                      </span>
                      {sub.language_detected && (
                        <span className="text-[10px] font-mono text-slate-300 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/10">
                          {sub.language_detected}
                        </span>
                      )}
                    </div>
                    <Badge urgencyScore={sub.urgency_score} />
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-light">
                    "{sub.translated_text}"
                  </p>

                  {sub.language_detected && sub.language_detected.toLowerCase() !== 'english' && (
                    <div className="text-[11px] text-slate-400 italic bg-black/40 p-2 rounded-lg border border-white/5 font-light">
                      <span className="text-slate-400 not-italic mr-1 text-[10px] uppercase font-mono">Original:</span>
                      "{sub.raw_text}"
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-white/[0.04] font-mono">
                    <span className="truncate text-slate-400">{sub.region_name}</span>
                    <span className="text-[10px]">
                      {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
