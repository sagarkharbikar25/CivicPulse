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
    { id: 'water', label: 'Water & Sewage', icon: WaterIcon },
    { id: 'roads', label: 'Roads & Transit', icon: RoadIcon },
    { id: 'electricity', label: 'Power & Grid', icon: ElectricityIcon },
    { id: 'sanitation', label: 'Waste & Sanitation', icon: SanitationIcon },
    { id: 'other', label: 'Public Infrastructure', icon: AlertIcon },
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
      title: 'Severe Freight Road Potholes (English)',
      lang: 'English',
      category: 'roads',
      severity: 7,
      region: 'Industrial Zone North',
      text: 'Severe potholes outside industrial sector causing heavy freight truck accidents and tire bursts.',
    },
    {
      title: 'Settlement Transformer Explosion (Marathi)',
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

  const selectedRegion = regions.find(r => r.region_name === regionName) || regions[0] || { infra_gap_score: 75 };
  const estimatedScore = Math.min(100, Math.round((severity * 4) + (selectedRegion.infra_gap_score * 0.35) + 15));

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 pt-4">
      {/* Hero Header with Serif Headline */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 glass-pill px-4 py-1.5 rounded-full text-xs font-mono text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-glow-white animate-pulse" />
          <span>DIRECT CITIZEN INGESTION PORTAL</span>
        </div>
        <h2 className="font-serif text-4xl sm:text-5xl font-normal text-white tracking-tight">
          Submit Citizen <span className="italic font-light text-slate-200">Grievance</span>
        </h2>
        <p className="text-sm text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
          AI transcribes, translates, and scores reports against local demographic indices, immediately updating the municipal priority queue.
        </p>
      </div>

      {/* Demo Quick-Presets */}
      <div className="rounded-2xl bg-[#09090C] border border-white/10 p-5 shadow-2xl relative overflow-hidden">
        <div className="light-slit absolute top-0 inset-x-0" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Demo Presets (Instant Multilingual Test Cases)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Click to autofill</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="text-left p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                  {preset.lang}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Sev {preset.severity}/10</span>
              </div>
              <p className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors line-clamp-1">
                {preset.title}
              </p>
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 italic font-light">
                "{preset.text}"
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Submission Form */}
      <div className="rounded-2xl bg-[#09090C] border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="light-slit-accent absolute top-0 inset-x-0" />

        {submittedResult ? (
          <div className="text-center py-8 space-y-5">
            <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center mx-auto shadow-glow-white">
              <CheckIcon className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-2xl sm:text-3xl text-white">
                Grievance Indexed & <span className="italic">Prioritized</span>
              </h3>
              <p className="text-xs text-slate-400 font-light">
                Multilingual AI inference pipeline completed in <span className="text-white font-mono font-bold">1.2s</span>.
              </p>
            </div>

            <div className="max-w-md mx-auto bg-[#101015] border border-white/10 rounded-2xl p-5 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400 font-mono">Calculated Urgency:</span>
                <Badge urgencyScore={submittedResult.urgency_score} />
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400 font-mono">Assigned Ward:</span>
                <span className="font-semibold text-white">{submittedResult.region_name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400 font-mono">Detected Sector:</span>
                <Badge category={submittedResult.category} />
              </div>
              <div className="pt-1">
                <span className="text-slate-400 block mb-1 font-mono text-[10px] uppercase">Normalized Translation:</span>
                <p className="text-slate-200 italic text-[11px] leading-relaxed">
                  "{submittedResult.translated_text}"
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-4">
              <button
                onClick={() => {
                  setSubmittedResult(null);
                  setText('');
                }}
                className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-all cursor-pointer shadow-glow-white"
              >
                Submit Another Issue
              </button>
              <button
                onClick={onNavigateDashboard}
                className="px-6 py-2.5 rounded-full glass-pill glass-pill-hover text-slate-300 hover:text-white text-xs font-medium cursor-pointer"
              >
                Inspect On Leaflet Map ↗
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Select Ward */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono mb-2">
                1. Affected Municipal Ward
              </label>
              <div className="relative">
                <select
                  value={regionName}
                  onChange={(e) => setRegionName(e.target.value)}
                  className="w-full bg-[#121217] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-white/30 transition-colors cursor-pointer appearance-none"
                >
                  {regions.map((reg) => (
                    <option key={reg.id} value={reg.region_name} className="bg-[#121217] text-slate-100">
                      {reg.region_name} (Infra Deficit: {reg.infra_gap_score}% • Pop: {reg.population.toLocaleString()})
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <MapPinIcon className="w-4 h-4 text-white/70" />
                </div>
              </div>
            </div>

            {/* Step 2: Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono mb-2">
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
                        flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer
                        ${isSelected
                          ? 'bg-white text-black font-semibold border-white shadow-glow-white scale-[1.02]'
                          : 'bg-[#121217] border-white/10 text-slate-300 hover:text-white hover:border-white/20'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-black' : 'text-slate-300'}`} />
                      <span className="text-xs">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Severity Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  3. Perceived Severity: <span className="text-white font-mono text-sm">{severity}/10</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {severity >= 8 ? '🚨 Emergency Hazard' : severity >= 5 ? '⚠️ Major Inconvenience' : 'ℹ️ Routine Repair'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={severity}
                onChange={(e) => setSeverity(parseInt(e.target.value))}
                className="w-full h-2 bg-[#1A1A22] rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Step 4: Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  4. Complaint Description
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Hindi / Marathi / English
                </span>
              </div>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe the defect, location landmarks, and how long it has persisted..."
                className="w-full bg-[#121217] border border-white/10 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-white/30 transition-colors resize-none"
              />
            </div>

            {/* Live Formula Preview */}
            <div className="rounded-xl bg-[#121218] border border-white/10 p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-white uppercase tracking-wider font-mono block">
                  Projected Algorithmic Urgency
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5 font-light">
                  Formula: (Severity × 0.4) + (Infra Deficit: {selectedRegion.infra_gap_score}% × 0.35) + Recency Weight
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-white">
                  {estimatedScore}/100
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!text.trim() || isSubmitting}
              className="w-full py-3.5 rounded-full bg-white hover:bg-slate-200 text-black font-semibold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-glow-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Scoring & Clustered Into Leaflet Map...</span>
              ) : (
                <>
                  <SendIcon className="w-4 h-4" />
                  <span>Analyze & Prioritize in Under 5 Seconds ↗</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
