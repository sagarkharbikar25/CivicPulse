import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { 
  WaterIcon, 
  ElectricityIcon, 
  RoadIcon, 
  SanitationIcon, 
  MapPinIcon, 
  CheckIcon 
} from '../icons';

const CATEGORY_ICONS = {
  water: WaterIcon,
  electricity: ElectricityIcon,
  roads: RoadIcon,
  sanitation: SanitationIcon,
};

export default function TranscriptPreview({ result, onViewOnMap, onReset }) {
  if (!result) return null;

  const {
    stt = {},
    classification = {},
    data = {},
    priority_impact = {},
    pipeline_latency_ms = 0,
  } = result;

  const category = (classification.category || data.category || 'other').toLowerCase();
  const IconComp = CATEGORY_ICONS[category] || RoadIcon;
  const urgency = data.urgency_score || 75;
  const regionName = data.region_name || classification.region_guess || 'Assigned Ward';

  return (
    <Card className="p-6 border border-white/15 bg-[#0a0a0c]/90 backdrop-blur-xl animate-fade-in relative overflow-hidden">
      {/* Top beam glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-mono tracking-wider uppercase text-emerald-400 font-semibold">
            AI Classification Complete • {pipeline_latency_ms}ms
          </span>
        </div>
        <div className="flex items-center gap-2">
          {stt.language_detected && (
            <Badge variant="outline" className="font-mono text-[10px] text-zinc-400 border-white/10 uppercase">
              Lang: {stt.language_detected}
            </Badge>
          )}
          <Badge variant={urgency >= 80 ? 'critical' : urgency >= 60 ? 'warning' : 'neutral'}>
            Urgency: {urgency}/100
          </Badge>
        </div>
      </div>

      {/* Transcribed Speech */}
      <div className="mb-4 p-3.5 rounded-lg bg-black/60 border border-white/10">
        <p className="text-xs font-mono uppercase text-zinc-500 mb-1 flex items-center gap-1.5">
          <span>Audio Transcript</span>
          {stt.stt_provider && <span className="text-[10px] text-zinc-600">({stt.stt_provider})</span>}
        </p>
        <p className="text-sm font-sans text-zinc-200 leading-relaxed italic">
          "{stt.transcript || data.raw_text}"
        </p>
      </div>

      {/* Translation & Classification Details */}
      {classification.translated_text && classification.translated_text !== stt.transcript && (
        <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <p className="text-[11px] font-mono text-zinc-400 mb-0.5">AI Translation (English):</p>
          <p className="text-xs text-zinc-300">{classification.translated_text}</p>
        </div>
      )}

      {/* Grid Specs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5 text-xs">
        <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-white shrink-0">
            <IconComp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Category</div>
            <div className="font-medium text-white capitalize">{category}</div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-zinc-300 shrink-0">
            <MapPinIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="truncate">
            <div className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1.5">
              <span>Current Location</span>
              {data.latitude && data.longitude && (
                <span className="text-[9px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-500/30">
                  REAL GPS
                </span>
              )}
            </div>
            <div className="font-medium text-white truncate text-xs">{regionName}</div>
            {data.latitude && data.longitude && (
              <div className="text-[10px] font-mono text-zinc-400">
                {Number(data.latitude).toFixed(4)}, {Number(data.longitude).toFixed(4)}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-2.5 rounded-lg bg-black/40 border border-white/10">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">Severity Weight</div>
          <div className="font-mono font-bold text-white text-sm">
            {classification.severity_score_10 || 8.0} / 10.0
          </div>
        </div>
      </div>

      {/* Priority Impact Callout */}
      {priority_impact.top_policy_action && (
        <div className="mb-5 p-3 rounded-lg bg-white/[0.04] border border-white/10">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
            Generated Public Works Intervention:
          </div>
          <p className="text-xs text-zinc-200 leading-normal">
            {priority_impact.top_policy_action}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {onViewOnMap && (
          <Button 
            variant="primary" 
            className="flex-1 py-2.5 text-xs font-semibold"
            onClick={() => onViewOnMap && onViewOnMap(data)}
          >
            <MapPinIcon className="w-3.5 h-3.5 mr-1.5" />
            Spotlight on Live Map
          </Button>
        )}
        {onReset && (
          <Button 
            variant="outline" 
            className="text-xs py-2.5 px-4 text-zinc-400 hover:text-white"
            onClick={onReset}
          >
            Record Another
          </Button>
        )}
      </div>
    </Card>
  );
}
