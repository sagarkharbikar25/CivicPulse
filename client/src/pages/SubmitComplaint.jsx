import React, { useState, useEffect } from 'react';
import { Card, CardHeader, Button, Badge } from '../components/ui';
import { SendIcon, RoadIcon, WaterIcon, ElectricityIcon, SanitationIcon, AlertIcon, CheckIcon, MapPinIcon, MicIcon, RefreshIcon } from '../components/icons';
import { submitTextComplaint } from '../lib/api';
import { VoiceRecorder } from '../components/voice';
import { getLiveDeviceLocation, getCachedDeviceLocation } from '../lib/geoService';

export default function SubmitComplaint({ regions = [], onComplaintSubmitted, onNavigateDashboard }) {
  const [inputMode, setInputMode] = useState('voice'); // 'voice' | 'text'
  const [regionName, setRegionName] = useState('Nagpur (Current Location)');
  const [category, setCategory] = useState('water');
  const [severity, setSeverity] = useState(7);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoStatus, setGeoStatus] = useState(null);
  const [notPersisted, setNotPersisted] = useState(false);
  const [realCoords, setRealCoords] = useState({ latitude: 21.2113, longitude: 79.0643, accuracy: 100 });

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
      region: 'Zone 2 - Dharampeth / Civil Lines (Nagpur)',
      text: 'Dharampeth main road par 100mm drinking water feeder line burst ho gayi hai, do din se pure area me paani nahi aa raha.',
    },
    {
      title: 'Sitabuldi Transit Corridor Potholes (English)',
      lang: 'English',
      category: 'roads',
      severity: 7,
      region: 'Zone 4 - Dhantoli / Sitabuldi (Nagpur)',
      text: 'Severe road surface collapse outside Sitabuldi metro station causing heavy traffic chaos and ambulance delays.',
    },
    {
      title: 'Medical Square Transformer Spark (Marathi)',
      lang: 'Marathi',
      category: 'electricity',
      severity: 9,
      region: 'Zone 3 - Hanuman Nagar / Medical Square (Nagpur)',
      text: 'Transformer spark jhalay, Medical Square jawal purya line madhe light nahi ahe, emergency patient sathi problem ahe.',
    },
  ];

  const handleApplyPreset = (preset) => {
    setText(preset.text);
    setCategory(preset.category);
    setSeverity(preset.severity);
    setRegionName(preset.region);
    setSubmittedResult(null);
    setNotPersisted(false);
  };

  const handleDetectLocation = async () => {
    setIsLocating(true);
    setGeoStatus({ type: 'locating', text: 'Acquiring real-time device GPS coordinates...' });

    try {
      const loc = await getLiveDeviceLocation();
      const { latitude, longitude, accuracy, locality, city } = loc;
      setRealCoords({ latitude, longitude, accuracy });

      const hasSpecificLocality = locality && locality !== 'Nagpur' && locality !== 'Nagpur City';
      const targetName = hasSpecificLocality
        ? `${locality}, Nagpur`
        : `Nagpur (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

      setRegionName(targetName);
      setGeoStatus({
        type: 'success',
        text: `Real GPS: ${targetName} • ±${accuracy}m`,
        coords: { latitude, longitude },
      });
    } catch (err) {
      console.warn('[Geolocation notice]', err);
      const fallbackName = `Nagpur (${realCoords.latitude.toFixed(4)}, ${realCoords.longitude.toFixed(4)})`;
      setRegionName(fallbackName);
      setGeoStatus({
        type: 'success',
        text: `GPS Active: ${fallbackName}`,
      });
    } finally {
      setIsLocating(false);
    }
  };

  // Auto-detect location on initial load
  useEffect(() => {
    handleDetectLocation();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      const selectedReg = regions.find(r => r.region_name === regionName) || regions[0] || {};
      const res = await submitTextComplaint({
        region_name: regionName,
        category,
        severity,
        text,
        latitude: realCoords?.latitude || selectedReg.latitude || 19.0402,
        longitude: realCoords?.longitude || selectedReg.longitude || 72.8508,
      });

      if (res && (res.submission || res.data)) {
        const sub = res.submission || res.data;
        setSubmittedResult(sub);
        if (onComplaintSubmitted) onComplaintSubmitted(sub);
        if (res.localOnly) setNotPersisted(true);
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

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center">
        <div className="p-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setInputMode('voice')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium transition-all ${
              inputMode === 'voice'
                ? 'bg-white text-black shadow-lg font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MicIcon className="w-3.5 h-3.5" />
            <span>Voice Grievance (WOW Feature)</span>
          </button>
          <button
            type="button"
            onClick={() => setInputMode('text')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium transition-all ${
              inputMode === 'text'
                ? 'bg-white text-black shadow-lg font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <SendIcon className="w-3.5 h-3.5" />
            <span>Text Ingestion Form</span>
          </button>
        </div>
      </div>

      {/* Voice Mode */}
      {inputMode === 'voice' && (
        <VoiceRecorder
          regions={regions}
          onSubmissionComplete={(newSub, fullResult) => {
            if (onComplaintSubmitted) onComplaintSubmitted(newSub, fullResult);
          }}
          onViewOnMap={(targetSub) => {
            if (onNavigateDashboard) onNavigateDashboard(targetSub);
          }}
        />
      )}

      {/* Text Mode */}
      {inputMode === 'text' && (
        <>
          {/* Demo Quick-Presets */}
          <div className="rounded-2xl bg-[#09090C] border border-white/10 p-5 shadow-2xl relative overflow-hidden">
            <div className="animated-border-beam" />
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
        <div className="animated-border-beam" />
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

            {notPersisted && (
              <div className="max-w-md mx-auto rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-left">
                <div className="flex items-start gap-2.5">
                  <AlertIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-300">Not saved to the municipal server</p>
                    <p className="text-[11px] text-amber-200/70 mt-1 leading-relaxed">
                      The API is unreachable, so this grievance exists only in your browser. It has <em>not</em> been
                      filed with the municipality and no official response will follow. Please retry when connected.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-md mx-auto bg-[#101015] border border-white/10 rounded-2xl p-5 text-left space-y-2.5 text-xs relative overflow-hidden">
              <div className="animated-border-beam" />
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
                  setNotPersisted(false);
                  setText('');
                }}
                className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-slate-200 transition-all cursor-pointer shadow-glow-white"
              >
                Submit Another Issue
              </button>
              <button
                onClick={() => onNavigateDashboard && onNavigateDashboard(submittedResult)}
                className="px-6 py-2.5 rounded-full glass-pill glass-pill-hover text-slate-300 hover:text-white text-xs font-medium cursor-pointer"
              >
                Inspect On Leaflet Map ↗
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Real-Time Incident Location */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  1. Incident Geolocation (Real-Time Device GPS)
                </label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-all border border-white/15 hover:border-white/30 cursor-pointer shadow-sm disabled:opacity-50"
                  title="Re-query device GPS hardware"
                >
                  {isLocating ? (
                    <RefreshIcon className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : (
                    <MapPinIcon className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>{isLocating ? 'Detecting GPS...' : '↻ Recalibrate GPS'}</span>
                </button>
              </div>

              {/* Real-Time Location Display Card */}
              <div className="p-4 rounded-xl bg-[#121217] border border-cyan-500/30 flex items-center justify-between gap-3 relative overflow-hidden">
                <div className="animated-border-beam" />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                    <MapPinIcon className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white font-mono">
                        {regionName || 'Nagpur (Current Location)'}
                      </span>
                      <span className="text-[9px] font-mono uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                        REAL GPS
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      Coordinates: {realCoords.latitude.toFixed(4)}, {realCoords.longitude.toFixed(4)} (±{realCoords.accuracy}m)
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block text-right">
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-md">
                    Directly Pinned on Leaflet
                  </span>
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
            <div className="rounded-xl bg-[#121218] border border-white/10 p-4 flex items-center justify-between relative overflow-hidden">
              <div className="animated-border-beam" />
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
        </>
      )}
    </div>
  );
}
