import React from 'react';

export default function StatPill({
  icon: Icon,
  label,
  value,
  subvalue,
  trend,
  className = '',
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-[#09090C] border border-white/10 p-4 flex items-center gap-4 transition-all duration-200 hover:border-white/20 hover:bg-[#0D0D12] shadow-2xl ${className}`}
    >
      {Icon && (
        <div className="w-11 h-11 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/90 shrink-0 transition-all duration-200 group-hover:bg-white/[0.08] group-hover:border-white/25 group-hover:text-white shadow-sm">
          <Icon className="w-5 h-5" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold tracking-tight text-white font-mono">{value}</span>
          {subvalue && <span className="text-[11px] text-slate-500 font-light truncate">{subvalue}</span>}
        </div>
      </div>

      {trend && (
        <div className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border border-white/10 bg-white/[0.04] text-slate-300 shrink-0">
          {trend}
        </div>
      )}
    </div>
  );
}
