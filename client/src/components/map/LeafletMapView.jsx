import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LayersIcon, RefreshIcon, MapPinIcon } from '../icons';

export default function LeafletMapView({
  points = [],
  selectedPointId,
  onSelectPoint,
  activeLayer = 'urgency',
  onLayerChange,
  className = '',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centered initially over the seed data coordinates (Nagpur / Central India corridor)
    const initialLat = 21.1458;
    const initialLng = 79.0882;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    // Custom positioned zoom control in bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // CartoDB Dark Matter luxury dark tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers whenever points, activeLayer, or selectedPointId change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !points || points.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    points.forEach((point) => {
      const isSelected = selectedPointId === point.id;
      const intensity = activeLayer === 'infra_gap' ? point.gapScore : point.intensity;

      // Determine colors based on tier
      let bgGrad = 'from-cyan-500 to-blue-600';
      let borderColor = '#00D2FF';
      let ringColor = 'rgba(0, 210, 255, 0.4)';
      let isCritical = intensity >= 80;

      if (intensity >= 85) {
        bgGrad = 'from-rose-500 to-red-600';
        borderColor = '#F43F5E';
        ringColor = 'rgba(244, 63, 94, 0.5)';
      } else if (intensity >= 65) {
        bgGrad = 'from-amber-400 to-amber-600';
        borderColor = '#F59E0B';
        ringColor = 'rgba(245, 158, 11, 0.45)';
      }

      // Create Custom HTML DivIcon
      const iconHtml = `
        <div class="marker-radar cursor-pointer group" style="width: 44px; height: 44px;">
          ${isCritical ? `<div class="marker-radar-ring" style="background: ${ringColor};"></div>` : ''}
          <div class="relative w-8 h-8 rounded-full bg-gradient-to-br ${bgGrad} p-[1.5px] transition-transform duration-200 group-hover:scale-110 shadow-lg ${isSelected ? 'ring-4 ring-white/50 scale-125' : ''}" style="box-shadow: 0 0 15px ${borderColor}55;">
            <div class="w-full h-full rounded-full bg-[#08080c] flex items-center justify-center">
              <span class="text-[10px] font-mono font-bold text-white tracking-tighter">${Math.round(intensity)}</span>
            </div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-marker',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([point.latitude, point.longitude], { icon: customIcon }).addTo(map);

      // Popup Content matching the sleek dark luxury aesthetic
      const popupHtml = `
        <div class="p-1 space-y-2 font-sans select-none min-w-[210px]">
          <div class="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span class="text-xs font-bold text-white tracking-wide uppercase">${point.name}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 border border-white/10">
              ${intensity}/100
            </span>
          </div>
          <div class="grid grid-cols-2 gap-1.5 text-[11px]">
            <div>
              <span class="text-slate-400 block text-[9px] uppercase tracking-wider">Infra Gap</span>
              <span class="text-amber-400 font-semibold font-mono">${point.gapScore}%</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[9px] uppercase tracking-wider">Reports</span>
              <span class="text-cyan-400 font-semibold font-mono">${point.submissionsCount || 0} active</span>
            </div>
          </div>
          <div class="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
            <span>Pop: ${(point.population || 0).toLocaleString()}</span>
            <span class="text-emerald-400 font-medium">Prioritized</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: false });

      marker.on('click', () => {
        if (onSelectPoint) onSelectPoint(point);
      });

      markersRef.current.push(marker);
      bounds.extend([point.latitude, point.longitude]);
    });

    // Fit map bounds smoothly on initial load if points exist
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [points, activeLayer, selectedPointId, mapReady]);

  // Recenter helper
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map || markersRef.current.length === 0) return;
    const group = L.featureGroup(markersRef.current);
    map.flyToBounds(group.getBounds(), { padding: [50, 50], duration: 1.2 });
  };

  return (
    <div className={`relative w-full rounded-2xl bg-[#000000] border border-white/[0.12] overflow-hidden shadow-card-glass ${className}`}>
      {/* Top Map Floating Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex items-center justify-between pointer-events-none">
        {/* Status Pill */}
        <div className="pointer-events-auto flex items-center gap-2.5 glass-pill px-3.5 py-1.5 rounded-full text-xs">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-semibold text-white tracking-wide uppercase text-[11px]">
            Leaflet Geospatial Cartography
          </span>
          <span className="text-white/20">|</span>
          <span className="text-slate-400 font-mono text-[10px]">{points.length} nodes active</span>
        </div>

        {/* Layer Controls & Recenter */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center glass-pill p-1 rounded-full text-xs">
            <button
              onClick={() => onLayerChange && onLayerChange('urgency')}
              className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                activeLayer === 'urgency'
                  ? 'bg-white text-black font-semibold shadow-glow-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Urgency Heatmap
            </button>
            <button
              onClick={() => onLayerChange && onLayerChange('infra_gap')}
              className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                activeLayer === 'infra_gap'
                  ? 'bg-amber-400 text-black font-semibold shadow-glow-amber'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Infra Gap Index
            </button>
          </div>

          <button
            onClick={handleRecenter}
            title="Recenter Map"
            className="glass-pill p-2 rounded-full text-slate-300 hover:text-white transition-all cursor-pointer hover:border-white/30"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-[480px] z-10" />

      {/* Bottom Map Legend */}
      <div className="px-5 py-3 bg-[#08080C]/90 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs z-[400] relative">
        <div className="flex items-center gap-4 text-slate-400">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Tiers:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
            <span className="text-slate-300 text-[11px]">Critical (&gt;85)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="text-slate-300 text-[11px]">Elevated (65–84)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
            <span className="text-slate-300 text-[11px]">Monitored (&lt;65)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
          CartoDB Dark Matter Tiles • OpenStreetMap Data
        </div>
      </div>
    </div>
  );
}
