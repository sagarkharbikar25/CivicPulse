import React from 'react';

export default function Card({
  children,
  className = '',
  glow = false,
  hoverable = false,
  highlight = false,
  beam = true,
  ...props
}) {
  return (
    <div
      className={`
        relative rounded-2xl bg-[#121215]/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-card-glass transition-all duration-300 overflow-hidden
        ${glow ? 'shadow-glow-cyan/20 border-cyan-500/30' : ''}
        ${hoverable ? 'hover:border-cyan-500/40 hover:bg-[#16161c]/90 hover:-translate-y-0.5' : ''}
        ${highlight ? 'before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-400 before:to-transparent' : ''}
        ${className}
      `}
      {...props}
    >
      {beam && <div className="animated-border-beam" />}
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div>
        {title && <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>}
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
