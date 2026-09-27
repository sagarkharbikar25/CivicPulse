import React from 'react';

export default function StatPill({
  icon: Icon,
  label,
  value,
  subvalue,
  trend,
  trendType = 'neutral', // 'positive' | 'negative' | 'neutral'
  className = '',
}) {
  const trendColors = {
    positive: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    negative: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    neutral: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#121215]/90 backdrop-blur-xl border border-white/[0.08] p-4 flex items-center gap-4 transition-all duration-200 hover:border-cyan-500/30 hover:bg-[#16161b] ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-600/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
          <Icon className="w-6 h-6" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
          {subvalue && <span className="text-xs text-slate-400">{subvalue}</span>}
        </div>
      </div>

      {trend && (
        <div className={`px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${trendColors[trendType]}`}>
          {trend}
        </div>
      )}
    </div>
  );
}
