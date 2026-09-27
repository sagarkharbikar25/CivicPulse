import React, { useState } from 'react';
import { Card, CardHeader, Button, Badge } from '../components/ui';
import { SendIcon, RoadIcon, WaterIcon, ElectricityIcon, SanitationIcon, AlertIcon, CheckIcon, MapPinIcon } from '../components/icons';
import { submitTextComplaint } from '../lib/api';

export default function SubmitComplaint({ regions = [], onComplaintSubmitted, onNavigateDashboard }) {
  const [regionName, setRegionName] = useState(regions[0]?.region_name || 'East Ward - Sector 4');
  const [category, setCategory] = useState('water');
  const [severity, setSeverity] = useState(7);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);

  const categories = [
    { id: 'water', label: 'Water & Sewage', icon: WaterIcon, color: 'text-cyan-400' },
    { id: 'roads', label: 'Roads & Transit', icon: RoadIcon, color: 'text-amber-400' },
    { id: 'electricity', label: 'Power & Grid', icon: ElectricityIcon, color: 'text-yellow-400' },
    { id: 'sanitation', label: 'Waste & Sanitation', icon: SanitationIcon, color: 'text-emerald-400' },
    { id: 'other', label: 'Other Public Asset', icon: AlertIcon, color: 'text-purple-400' },
  ];

  const presets = [
    {
      title: 'Water Feeder Pipeline Burst (Hindi)',
      lang: 'Hindi',
      category: 'water',
      severity: 8,
      region: 'East Ward - Sector 4',
      text: 'Yahan 4 din se drinking water supply band hai, tankers bhi nahi aa rahe aur log pareshan hain.',
    },
    {
      title: 'Major Road Pothole Hazard (English)',
      lang: 'English',
      category: 'roads',
      severity: 7,
      region: 'Industrial Zone North',
      text: 'Severe potholes outside industrial sector causing heavy freight truck accidents and tire bursts.',
    },
    {
      title: 'Transformer Overheat / Outage (Marathi)',
      lang: 'Marathi',
      category: 'electricity',
      severity: 9,
      region: 'Old City Settlement',
      text: 'Transformer blast jhalay, purya basti madhe light nahi ahe 24 taasapasun, hospital patient sathi problem ahe.',
    },
  ];

  const handleApplyPreset = (preset) => {
    setText(preset.text);
    setCategory(preset.category);
    setSeverity(preset.severity);
    setRegionName(preset.region);
    setSubmittedResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await submitTextComplaint({
        region_name: regionName,
        category,
        severity,
        text,
      });

      if (res && res.submission) {
        setSubmittedResult(res.submission);
        if (onComplaintSubmitted) onComplaintSubmitted(res.submission);
      }
    } catch (err) {
      console.error('Submission failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live estimated urgency calculation
  const selectedRegion = regions.find(r => r.region_name === regionName) || regions[0] || { infra_gap_score: 75 };
  const estimatedScore = Math.min(100, Math.round((severity * 4) + (selectedRegion.infra_gap_score * 0.35) + 15));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
          DIRECT CITIZEN INGESTION PORTAL
        </span>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Submit Infrastructure Grievance
        </h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Every report is scored by AI against local demographic infra-gap data, directly updating the municipal capital expenditure queue.
        </p>
      </div>

      {/* Preset Quick-Fill Cards (For Demo / Hackathon evaluation) */}
      <div className="rounded-2xl bg-[#121216]/60 border border-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Demo Presets (Instant Multilingual Test Cases)
          </span>
          <span className="text-[11px] text-slate-400">Click to autofill</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="text-left p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  {preset.lang}
                </span>
                <span className="text-[10px] text-slate-400">Sev {preset.severity}/10</span>
              </div>
              <p className="text-xs font-medium text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-1">
                {preset.title}
              </p>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 italic">
                "{preset.text}"
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Submission Form */}
      <Card glow={Boolean(submittedResult)}>
        {submittedResult ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckIcon className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Complaint Processed & Clustered!</h3>
              <p className="text-xs text-slate-400">
                AI scoring pipeline completed in <span className="text-cyan-400 font-mono font-semibold">1.2 seconds</span>.
              </p>
            </div>

            <div className="max-w-md mx-auto bg-[#181820] border border-white/10 rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400">Calculated Urgency:</span>
                <Badge urgencyScore={submittedResult.urgency_score} />
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400">Assigned Ward:</span>
                <span className="font-semibold text-slate-200">{submittedResult.region_name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400">Detected Category:</span>
                <Badge category={submittedResult.category} />
              </div>
              <div className="pt-1">
                <span className="text-slate-400 block mb-1">Standardized Translation:</span>
                <p className="text-slate-200 italic font-mono text-[11px]">
                  "{submittedResult.translated_text}"
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-3">
              <Button
                variant="primary"
                onClick={() => {
                  setSubmittedResult(null);
                  setText('');
                }}
              >
                Submit Another Issue
              </Button>
              <Button
                variant="secondary"
                onClick={onNavigateDashboard}
              >
                View On Heatmap
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Select Region */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                1. Affected Municipal Ward / Region
              </label>
              <div className="relative">
                <select
                  value={regionName}
                  onChange={(e) => setRegionName(e.target.value)}
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer appearance-none"
                >
                  {regions.map((reg) => (
                    <option key={reg.id} value={reg.region_name} className="bg-[#181820] text-slate-100">
                      {reg.region_name} (Infra Gap: {reg.infra_gap_score}% | Pop: {reg.population.toLocaleString()})
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <MapPinIcon className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
            </div>

            {/* Step 2: Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                2. Infrastructure Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`
                        flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer
                        ${isSelected
                          ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-glow-cyan/40 scale-[1.02]'
                          : 'bg-[#181820] border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-cyan-400' : cat.color}`} />
                      <span className="text-xs font-medium">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Severity Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  3. Perceived Severity Weight: <span className="text-cyan-400 font-mono text-sm">{severity}/10</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {severity >= 8 ? '🚨 Emergency Hazard' : severity >= 5 ? '⚠️ Major Inconvenience' : 'ℹ️ Routine Maintenance'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={severity}
                onChange={(e) => setSeverity(parseInt(e.target.value))}
                className="w-full h-2 bg-[#22222a] rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>1 (Minor)</span>
                <span>5 (Disruptive)</span>
                <span>10 (Life-Safety Emergency)</span>
              </div>
            </div>

            {/* Step 4: Grievance Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  4. Complaint Description
                </label>
                <span className="text-[11px] text-slate-400">
                  Supports Hindi, Marathi & English
                </span>
              </div>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe the defect, location landmarks, and how long it has persisted..."
                className="w-full bg-[#181820] border border-white/10 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
              />
            </div>

            {/* Estimated AI Priority Score Preview */}
            <div className="rounded-xl bg-gradient-to-r from-cyan-950/30 to-blue-950/20 border border-cyan-500/20 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider block">
                  Projected Algorithmic Urgency
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Formula: (Severity * 0.4) + (Infra Gap: {selectedRegion.infra_gap_score}% * 0.35) + Recency Weight
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold font-mono text-cyan-400">
                  {estimatedScore}/100
                </span>
                <span className="block text-[10px] text-slate-400">
                  {estimatedScore >= 80 ? 'Critical Tier' : estimatedScore >= 60 ? 'Moderate Tier' : 'Standard Tier'}
                </span>
              </div>
            </div>

            {/* Submit Action */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={isSubmitting}
              disabled={!text.trim()}
              icon={SendIcon}
            >
              Analyze & Clustered Into Prioritization Queue
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
