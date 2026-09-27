import React, { useState, useMemo } from 'react';
import { MapPinIcon, LayersIcon, AlertIcon } from '../icons';

export default function HeatmapView({
  points = [],
  selectedPointId,
  onSelectPoint,
  activeLayer = 'urgency', // 'urgency' | 'infra_gap' | 'submissions'
  onLayerChange,
  className = '',
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Compute normalized bounding box for rendering points nicely across the map canvas
  const { normalizedPoints, bounds } = useMemo(() => {
    if (!points || points.length === 0) return { normalizedPoints: [], bounds: null };

    const lats = points.map(p => p.latitude);
    const lngs = points.map(p => p.longitude);

    const minLat = Math.min(...lats) - 0.015;
    const maxLat = Math.max(...lats) + 0.015;
    const minLng = Math.min(...lngs) - 0.02;
    const maxLng = Math.max(...lngs) + 0.02;

    const latSpan = maxLat - minLat || 0.05;
    const lngSpan = maxLng - minLng || 0.05;

    const norm = points.map(p => {
      // Map coordinates to percentage (0% to 100%)
      const x = ((p.longitude - minLng) / lngSpan) * 80 + 10;
      const y = (1 - (p.latitude - minLat) / latSpan) * 75 + 12;

      return {
        ...p,
        posX: Math.max(8, Math.min(92, x)),
        posY: Math.max(10, Math.min(90, y)),
      };
    });

    return { normalizedPoints: norm, bounds: { minLat, maxLat, minLng, maxLng } };
  }, [points]);

  const getColor = (point) => {
    if (activeLayer === 'infra_gap') {
      if (point.gapScore >= 80) return 'from-rose-500/80 to-amber-500/80 border-rose-400 text-rose-400';
      if (point.gapScore >= 60) return 'from-amber-500/80 to-yellow-500/80 border-amber-400 text-amber-400';
      return 'from-cyan-500/80 to-blue-500/80 border-cyan-400 text-cyan-400';
    }
    // Urgency heatmap default
    if (point.intensity >= 85) return 'from-rose-500 to-rose-600 border-rose-400 text-rose-400 ring-rose-500/40';
    if (point.intensity >= 65) return 'from-amber-500 to-yellow-600 border-amber-400 text-amber-400 ring-amber-500/40';
    return 'from-cyan-500 to-blue-500 border-cyan-400 text-cyan-400 ring-cyan-500/40';
  };

  return (
    <div className={`relative w-full rounded-2xl bg-[#0d0d10] border border-white/[0.08] overflow-hidden select-none ${className}`}>
      {/* Top Map Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-[#121215]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-semibold text-white tracking-wide">LIVE GEOSPATIAL CLUSTERS</span>
          <span className="text-xs text-slate-500">|</span>
          <span className="text-xs text-slate-400 font-mono">{points.length} nodes active</span>
        </div>

        {/* Layer Selector */}
        <div className="pointer-events-auto flex items-center bg-[#121215]/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg text-xs">
          <button
            onClick={() => onLayerChange && onLayerChange('urgency')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${activeLayer === 'urgency' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Urgency Heatmap
          </button>
          <button
            onClick={() => onLayerChange && onLayerChange('infra_gap')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${activeLayer === 'infra_gap' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Infra Gap Index
          </button>
        </div>
      </div>

      {/* Map Graphic Background Canvas */}
      <div className="relative w-full h-[440px] bg-[#0A0A0B] overflow-hidden">
        {/* Subtle grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0A0A0B" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect width="100%" height="100%" fill="url(#mapGlow)" />
        </svg>

        {/* Abstract Stylized Geographic Sector Contours */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 800 440">
          <path d="M 120 180 Q 240 100 400 160 T 680 140" fill="none" stroke="#00D2FF" strokeWidth="1.5" strokeDasharray="4 8" />
          <path d="M 80 320 Q 280 260 480 340 T 740 280" fill="none" stroke="#00D2FF" strokeWidth="1.5" strokeDasharray="4 8" />
          <path d="M 320 60 Q 360 220 380 400" fill="none" stroke="#F59E0B" strokeWidth="1" strokeDasharray="2 6" />
          <circle cx="400" cy="220" r="140" fill="none" stroke="rgba(0, 210, 255, 0.15)" strokeWidth="1" />
          <circle cx="400" cy="220" r="220" fill="none" stroke="rgba(0, 210, 255, 0.08)" strokeWidth="1" />
        </svg>

        {/* Heatmap Nodes */}
        {normalizedPoints.map((point) => {
          const isSelected = selectedPointId === point.id;
          const isHovered = hoveredPoint?.id === point.id;
          const colorClass = getColor(point);

          return (
            <div
              key={point.id}
              style={{ left: `${point.posX}%`, top: `${point.posY}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
              onClick={() => onSelectPoint && onSelectPoint(point)}
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Radar pulse rings on high intensity */}
              {point.intensity >= 75 && (
                <div className="absolute inset-0 -m-3 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
              )}
              {point.intensity >= 60 && (
                <div className="absolute inset-0 -m-1.5 rounded-full bg-cyan-400/25 animate-pulse pointer-events-none" />
              )}

              {/* Core Node Marker */}
              <div
                className={`
                  relative w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} p-0.5 shadow-lg flex items-center justify-center transition-all duration-300
                  ${isSelected ? 'scale-125 ring-4 ring-cyan-400/50 shadow-glow-cyan' : 'hover:scale-115'}
                `}
              >
                <div className="w-full h-full rounded-full bg-[#121215] flex items-center justify-center">
                  <span className="text-[10px] font-bold font-mono text-white">
                    {Math.round(point.intensity)}
                  </span>
                </div>
              </div>

              {/* Point Label */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap pointer-events-none">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#121215]/90 border border-white/10 text-slate-300 backdrop-blur-md shadow-md">
                  {point.name}
                </span>
              </div>
            </div>
          );
        })}

        {/* Hover/Inspection Tooltip */}
        {hoveredPoint && (
          <div
            style={{
              left: `${Math.min(75, Math.max(25, hoveredPoint.posX))}%`,
              top: `${Math.max(18, hoveredPoint.posY - 12)}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-full z-30 pointer-events-none transition-all duration-200"
          >
            <div className="bg-[#16161c]/95 border border-cyan-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-xl min-w-[210px]">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-2">
                <span className="text-xs font-semibold text-white truncate">{hoveredPoint.name}</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {hoveredPoint.intensity}/100
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Infra Gap</span>
                  <span className="text-amber-400 font-semibold">{hoveredPoint.gapScore || 'N/A'}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Complaints</span>
                  <span className="text-cyan-400 font-semibold">{hoveredPoint.submissionsCount || 0} active</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[9px] uppercase">Population</span>
                  <span className="text-slate-200 font-medium">{(hoveredPoint.population || 0).toLocaleString()} citizens</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Map Legend */}
      <div className="px-5 py-3 bg-[#121215]/80 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 text-slate-400">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Priority Tiers:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/30" />
            <span className="text-slate-300">Critical (&gt;85)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/30" />
            <span className="text-slate-300">Moderate (65–84)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-400/30" />
            <span className="text-slate-300">Monitored (&lt;65)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Click any cluster node to inspect regional breakdown
        </div>
      </div>
    </div>
  );
}
