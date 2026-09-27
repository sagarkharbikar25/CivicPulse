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
  // If category is provided, render matching category styling and icon
  if (category) {
    const cat = category.toLowerCase();
    const config = {
      roads: {
        label: 'Roads & Transit',
        icon: RoadIcon,
        style: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
      },
      water: {
        label: 'Water & Sewage',
        icon: WaterIcon,
        style: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',
      },
      electricity: {
        label: 'Power & Grid',
        icon: ElectricityIcon,
        style: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/25',
      },
      sanitation: {
        label: 'Sanitation & Waste',
        icon: SanitationIcon,
        style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
      },
      other: {
        label: 'Public Infrastructure',
        icon: AlertIcon,
        style: 'bg-slate-500/10 text-slate-300 border-slate-500/25',
      },
    };

    const current = config[cat] || config.other;
    const IconComp = current.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${current.style} ${className}`}
        {...props}
      >
        <IconComp className="w-3.5 h-3.5 shrink-0" />
        {children || current.label}
      </span>
    );
  }

  // If urgencyScore is provided (0-100)
  if (urgencyScore !== undefined) {
    let scoreStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    let label = 'Low Priority';

    if (urgencyScore >= 75) {
      scoreStyle = 'bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-500/20';
      label = 'Critical Priority';
    } else if (urgencyScore >= 50) {
      scoreStyle = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      label = 'Moderate Priority';
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${scoreStyle} ${className}`}
        {...props}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        {children || `${label} (${Math.round(urgencyScore)})`}
      </span>
    );
  }

  // General variants
  const variants = {
    default: 'bg-white/[0.06] text-slate-300 border-white/10',
    cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
