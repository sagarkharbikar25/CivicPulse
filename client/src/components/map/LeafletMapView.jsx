import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { LayersIcon, RefreshIcon, MapPinIcon } from '../icons';
import { getLiveDeviceLocation, getCachedDeviceLocation } from '../../lib/geoService';

export default function LeafletMapView({
  points = [],
  selectedPointId,
  onSelectPoint,
  spotlightPoint,
  activeLayer = 'urgency',
  onLayerChange,
  className = '',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const spotlightMarkerRef = useRef(null);
  const userLocationMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState(getCachedDeviceLocation());

  // Initialize Leaflet Map and acquire real-time device GPS coordinates
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Detect user's authentic live device GPS location
    getLiveDeviceLocation().then((loc) => {
      setUserLocation(loc);
      if (mapInstanceRef.current && loc?.latitude && loc?.longitude) {
        // Add or update live user marker
        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.remove();
        }

        const userIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center cursor-pointer" style="width: 48px; height: 48px;">
              <div class="absolute w-12 h-12 rounded-full bg-cyan-500/30 animate-ping"></div>
              <div class="absolute w-8 h-8 rounded-full bg-cyan-400/40 animate-pulse"></div>
              <div class="relative w-6 h-6 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_15px_#22d3ee] flex items-center justify-center text-black font-bold text-[10px]">
                📍
              </div>
            </div>
          `,
          className: 'custom-user-live-beacon',
          iconSize: [48, 48],
          iconAnchor: [24, 24],
          popupAnchor: [0, -20],
        });

        const userMarker = L.marker([loc.latitude, loc.longitude], {
          icon: userIcon,
          zIndexOffset: 3500,
        }).addTo(mapInstanceRef.current);

        userMarker.bindPopup(`
          <div class="p-1 space-y-1 text-xs font-mono select-none min-w-[200px]">
            <div class="flex items-center gap-1.5 text-cyan-400 font-bold uppercase text-[10px]">
              <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>Your Real-Time Device Location</span>
            </div>
            <div class="font-bold text-white text-xs">${loc.locality || 'Nagpur'}</div>
            <p class="text-zinc-300 text-[10px]">${loc.fullAddress || 'Live GPS Locked'}</p>
            <div class="text-zinc-400 text-[10px] pt-1 border-t border-white/10">
              ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)} (±${loc.accuracy}m)
            </div>
          </div>
        `);

        userLocationMarkerRef.current = userMarker;

        // Fly to user's real location if not already spotlighting another point
        if (!spotlightPoint) {
          mapInstanceRef.current.flyTo([loc.latitude, loc.longitude], 13, { duration: 1.2 });
        }
      }
    });

    // Default coordinates: if user cached location exists use it, otherwise check points or Nagpur (21.1458, 79.0720)
    const cached = getCachedDeviceLocation();
    const initialLat = cached?.latitude || points[0]?.latitude || 21.1458;
    const initialLng = cached?.longitude || points[0]?.longitude || 79.0720;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Reliable, global OpenStreetMap tiles styled dark via CSS filter (zero API keys, zero watermarks)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    // Force Leaflet to re-calculate dimensions properly
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      if (spotlightMarkerRef.current) spotlightMarkerRef.current.remove();
      if (userLocationMarkerRef.current) userLocationMarkerRef.current.remove();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Spotlight to specific point when citizen report arrives
  useEffect(() => {
    if (!spotlightPoint || !mapInstanceRef.current || !mapReady) return;
    const lat = Number(spotlightPoint.latitude);
    const lng = Number(spotlightPoint.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      mapInstanceRef.current.flyTo([lat, lng], 14, {
        duration: 1.5,
        easeLinearity: 0.25,
      });

      // Dedicated glowing beacon marker for spotlight point
      if (spotlightMarkerRef.current) {
        spotlightMarkerRef.current.remove();
      }

      const beaconIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center cursor-pointer" style="width: 50px; height: 50px;">
            <div class="absolute w-12 h-12 rounded-full bg-cyan-400/30 animate-ping"></div>
            <div class="absolute w-8 h-8 rounded-full bg-cyan-400/50 animate-pulse"></div>
            <div class="relative w-7 h-7 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_15px_#22d3ee] flex items-center justify-center text-black font-bold font-mono text-[11px]">
              ⚡
            </div>
          </div>
        `,
        className: 'custom-spotlight-beacon',
        iconSize: [50, 50],
        iconAnchor: [25, 25],
        popupAnchor: [0, -22],
      });

      const beacon = L.marker([lat, lng], { icon: beaconIcon, zIndexOffset: 2000 }).addTo(mapInstanceRef.current);
      beacon.bindPopup(`
        <div class="p-1 space-y-1.5 text-xs font-sans min-w-[210px] select-none">
          <div class="flex items-center gap-1.5 text-cyan-400 font-bold font-mono uppercase text-[10px]">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Live Grievance Spotlight</span>
          </div>
          <div class="font-bold text-white text-xs">${spotlightPoint.region_name || 'Assigned Ward'}</div>
          <p class="text-zinc-300 text-[11px] italic line-clamp-2 leading-tight">"${spotlightPoint.raw_text || spotlightPoint.category || 'Citizen report'}"</p>
          <div class="pt-1 flex items-center justify-between text-[10px] font-mono border-t border-white/10">
            <span class="text-zinc-400 uppercase capitalize">${spotlightPoint.category || 'Incident'}</span>
            <span class="text-rose-400 font-bold">Urgency: ${spotlightPoint.urgency_score || 85}/100</span>
          </div>
        </div>
      `, { closeButton: false }).openPopup();

      spotlightMarkerRef.current = beacon;
    }
  }, [spotlightPoint, mapReady]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !points || points.length === 0) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    points.forEach((point) => {
      const isSelected = selectedPointId === point.id;
      const intensity = activeLayer === 'infra_gap' ? point.gapScore : point.intensity;

      let bgGrad = 'from-slate-200 to-white';
      let borderColor = '#ffffff';
      let ringColor = 'rgba(255, 255, 255, 0.4)';
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

      const popupHtml = `
        <div class="p-1 space-y-2 font-sans select-none min-w-[210px]">
          <div class="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span class="text-xs font-bold text-white tracking-wide uppercase font-mono">${point.name}</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/15">
              ${intensity}/100
            </span>
          </div>
          <div class="grid grid-cols-2 gap-1.5 text-[11px]">
            <div>
              <span class="text-slate-400 block text-[9px] uppercase tracking-wider font-mono">Infra Gap</span>
              <span class="text-amber-400 font-semibold font-mono">${point.gapScore}%</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[9px] uppercase tracking-wider font-mono">Reports</span>
              <span class="text-white font-semibold font-mono">${point.submissionsCount || 0} active</span>
            </div>
          </div>
          <div class="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Pop: ${(point.population || 0).toLocaleString()}</span>
            <span class="text-slate-200 font-medium">Prioritized</span>
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

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [points, activeLayer, selectedPointId, mapReady]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map || markersRef.current.length === 0) return;
    const group = L.featureGroup(markersRef.current);
    map.flyToBounds(group.getBounds(), { padding: [50, 50], duration: 1.2 });
  };

  return (
    <div className={`relative w-full rounded-2xl bg-[#08080C] border border-white/[0.12] overflow-hidden shadow-card-glass ${className}`}>
      {/* Animated smooth moving white light beam along top edge */}
      <div className="animated-border-beam" />

      {/* Top Map Floating Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex items-center justify-between pointer-events-none">
        {/* Status Pill */}
        <div className="pointer-events-auto flex items-center gap-2.5 glass-pill px-3.5 py-1.5 rounded-full text-xs">
          <div className="w-2 h-2 rounded-full bg-white shadow-glow-white animate-ping" />
          <span className="font-semibold text-white tracking-wide uppercase text-[11px] font-mono">
            Leaflet Cartography
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

          {userLocation?.latitude && (
            <button
              onClick={() => {
                if (mapInstanceRef.current && userLocation) {
                  mapInstanceRef.current.flyTo([userLocation.latitude, userLocation.longitude], 14, { duration: 1.2 });
                  if (userLocationMarkerRef.current) {
                    userLocationMarkerRef.current.openPopup();
                  }
                }
              }}
              title="Fly to My Real Live Location"
              className="glass-pill px-3 py-1.5 rounded-full text-cyan-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-all cursor-pointer hover:border-cyan-400/50"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Real Location ({userLocation.city || 'Nagpur'})</span>
            </button>
          )}

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
      <div className="px-5 py-3 bg-[#08080C]/90 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs z-[400] relative font-mono">
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
            <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm shadow-white/50" />
            <span className="text-slate-300 text-[11px]">Monitored (&lt;65)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
          OpenStreetMap Dark Cartography
        </div>
      </div>
    </div>
  );
}
