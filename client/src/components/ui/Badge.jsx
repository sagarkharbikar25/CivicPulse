import React from 'react';
import { RoadIcon, WaterIcon, ElectricityIcon, SanitationIcon, AlertIcon } from '../icons';

export default function Badge({
  children,
  variant = 'default',
  category,
  urgencyScore,
  className = '',
  ...props
}) {
  // Category badges with luxury monochrome frosted styling
  if (category) {
    const cat = category.toLowerCase();
    const config = {
      roads: { label: 'Roads & Transit', icon: RoadIcon },
      water: { label: 'Water & Sewage', icon: WaterIcon },
      electricity: { label: 'Power & Grid', icon: ElectricityIcon },
      sanitation: { label: 'Sanitation & Waste', icon: SanitationIcon },
      other: { label: 'Infrastructure', icon: AlertIcon },
    };

    const current = config[cat] || config.other;
    const IconComp = current.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-white/[0.04] text-slate-200 border border-white/10 transition-colors hover:border-white/20 ${className}`}
        {...props}
      >
        <IconComp className="w-3.5 h-3.5 text-white/80 shrink-0" />
        {children || current.label}
      </span>
    );
  }

  // Urgency score badges
  if (urgencyScore !== undefined) {
    let scoreStyle = 'bg-white/[0.03] text-slate-400 border-white/5';
    let label = 'Standard';

    if (urgencyScore >= 85) {
      scoreStyle = 'bg-white/[0.08] text-white border-white/20 shadow-sm shadow-white/10';
      label = 'Critical';
    } else if (urgencyScore >= 60) {
      scoreStyle = 'bg-white/[0.05] text-slate-200 border-white/10';
      label = 'Elevated';
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium border ${scoreStyle} ${className}`}
        {...props}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        {children || `${label} ${Math.round(urgencyScore)}`}
      </span>
    );
  }

  const variants = {
    default: 'bg-white/[0.05] text-slate-200 border-white/10',
    white: 'bg-white text-black font-semibold',
    ghost: 'bg-transparent text-slate-400 border-white/5',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium border ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
