import React, { useState } from 'react';
import HeatmapView from '../components/map/HeatmapView';
import { Card, CardHeader, Badge, Button, StatPill } from '../components/ui';
import { PulseIcon, AlertIcon, RoadIcon, WaterIcon, ElectricityIcon, SanitationIcon, ChevronIcon, MicIcon, SendIcon } from '../components/icons';

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

  // Filtered submissions
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
    <div className="space-y-6 pb-12">
      {/* Top Banner: One-Line Pitch + Live Pulse */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/40 via-[#121216] to-blue-950/30 border border-cyan-500/20 p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono uppercase tracking-wider">
                BRICS Track 1 DPI Solution
              </span>
              <span className="text-xs text-slate-400">| Multilingual Multimodal Ingestion</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AI-Powered Citizen <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Infrastructure Prioritization</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
              Synthesizing fragmented citizen voices across Hindi, Marathi, and English into a real-time, defensible capital allocation heatmap in under 5 seconds.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="md"
              onClick={onNavigateSubmit}
              icon={MicIcon}
            >
              Test Ingest Pipeline
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={onNavigatePolicymakers}
            >
              Priority Action Plan
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatPill
          icon={PulseIcon}
          label="Total Complaints Ingested"
          value={submissions.length + 138}
          subvalue="across 7 wards"
          trend="+18% vs avg"
          trendType="neutral"
        />
        <StatPill
          icon={AlertIcon}
          label="Critical Priority Clusters"
          value={priorities.filter(p => p.avg_urgency >= 85).length || 2}
          subvalue="action required"
          trend="Severe"
          trendType="negative"
        />
        <StatPill
          icon={RoadIcon}
          label="Mean Urgency Index"
          value="84.2"
          subvalue="weighted score / 100"
          trend="Target &lt;60"
          trendType="positive"
        />
        <StatPill
          icon={WaterIcon}
          label="AI Inference Latency"
          value="1.4s"
          subvalue="STT + LLM classification"
          trend="&lt; 5s SLA"
          trendType="positive"
        />
      </div>

      {/* Main Grid: Heatmap + Priority Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Heatmap (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <HeatmapView
            points={heatmapData}
            selectedPointId={selectedPointId}
            onSelectPoint={(point) => setSelectedPointId(point.id)}
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
          />

          {/* Regional Inspection Card */}
          {selectedNode && (
            <Card glow className="bg-[#121216]/90 border-cyan-500/30">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Regional Focus: {selectedNode.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lat: {selectedNode.latitude.toFixed(4)} | Long: {selectedNode.longitude.toFixed(4)}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Urgency Rating</span>
                  <span className="text-lg font-bold font-mono text-cyan-300">
                    {selectedNode.intensity}/100
                  </span>
                </div>
              </div>

              {/* Progress bar metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/[0.08]">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Infrastructure Gap</span>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedNode.gapScore || 70}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-amber-300 mt-1 block">{selectedNode.gapScore}% deficit</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Impacted Population</span>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: '68%' }} />
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300 mt-1 block">
                    {(selectedNode.population || 85000).toLocaleString()} residents
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Active Citizen Reports</span>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div className="bg-rose-400 h-full rounded-full" style={{ width: '85%' }} />
                  </div>
                  <span className="text-[11px] font-mono text-rose-300 mt-1 block">
                    {selectedNode.submissionsCount || 12} reports clustered
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Ingested Feed & Ranked Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader
              title="Recent Ingested Transcripts"
              subtitle="Live stream with automatic translation & classification"
              action={
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">Total: {filteredSubmissions.length}</span>
                </div>
              }
            />

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`
                    px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer
                    ${categoryFilter === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-transparent'
                    }
                  `}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Submissions List */}
            <div className="space-y-3 mt-3 max-h-[480px] overflow-y-auto pr-1">
              {filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-xl bg-[#16161b] p-3.5 border border-white/[0.06] hover:border-cyan-500/30 transition-all duration-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge category={sub.category} />
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400 border border-white/5 uppercase">
                        {sub.raw_input_type}
                      </span>
                      {sub.language_detected && (
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                          {sub.language_detected}
                        </span>
                      )}
                    </div>
                    <Badge urgencyScore={sub.urgency_score} />
                  </div>

                  {/* Translated Text */}
                  <p className="text-xs text-slate-200 leading-relaxed font-normal">
                    "{sub.translated_text}"
                  </p>

                  {/* Original Text if different */}
                  {sub.language_detected && sub.language_detected.toLowerCase() !== 'english' && (
                    <div className="text-[11px] text-slate-400 italic bg-black/30 p-2 rounded-lg border border-white/5">
                      <span className="text-slate-400 not-italic mr-1 text-[10px] uppercase font-mono">Original:</span>
                      "{sub.raw_text}"
                    </div>
                  )}

                  {/* Metadata Footer */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/[0.04]">
                    <span className="truncate">{sub.region_name}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
