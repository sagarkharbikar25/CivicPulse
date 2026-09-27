import React from 'react';

export default function CpuHeroTraces() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0 hidden lg:block">
      {/* SVG Canvas for Motherboard / CPU Circuit Traces */}
      <svg
        className="w-full h-full"
        viewBox="0 0 1200 500"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gleaming pure white pulse gradient for moving signals */}
          <linearGradient id="cpuPulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="65%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Intense white glow filter */}
          <filter id="cpuGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ================= TOP-LEFT TRACE ================= */}
        {/* Baseline circuit trace */}
        <path
          d="M 440 220 L 290 100 L 0 100"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.25"
        />
        {/* Animated pulse packet traveling from center (440,220) to outer edge (0,100) */}
        <path
          d="M 440 220 L 290 100 L 0 100"
          stroke="url(#cpuPulseGradient)"
          strokeWidth="2.5"
          filter="url(#cpuGlowFilter)"
          strokeDasharray="120 700"
          className="cpu-trace-pulse-1"
        />
        {/* CPU Center Via Pin */}
        <circle cx="440" cy="220" r="2.5" fill="#ffffff" opacity="0.8" />

        {/* ================= BOTTOM-LEFT TRACE ================= */}
        <path
          d="M 440 280 L 300 410 L 0 410"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.25"
        />
        <path
          d="M 440 280 L 300 410 L 0 410"
          stroke="url(#cpuPulseGradient)"
          strokeWidth="2.5"
          filter="url(#cpuGlowFilter)"
          strokeDasharray="120 700"
          className="cpu-trace-pulse-2"
        />
        <circle cx="440" cy="280" r="2.5" fill="#ffffff" opacity="0.8" />

        {/* ================= TOP-RIGHT TRACE ================= */}
        <path
          d="M 760 220 L 910 100 L 1200 100"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.25"
        />
        <path
          d="M 760 220 L 910 100 L 1200 100"
          stroke="url(#cpuPulseGradient)"
          strokeWidth="2.5"
          filter="url(#cpuGlowFilter)"
          strokeDasharray="120 700"
          className="cpu-trace-pulse-3"
        />
        <circle cx="760" cy="220" r="2.5" fill="#ffffff" opacity="0.8" />

        {/* ================= BOTTOM-RIGHT TRACE ================= */}
        <path
          d="M 760 280 L 900 410 L 1200 410"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.25"
        />
        <path
          d="M 760 280 L 900 410 L 1200 410"
          stroke="url(#cpuPulseGradient)"
          strokeWidth="2.5"
          filter="url(#cpuGlowFilter)"
          strokeDasharray="120 700"
          className="cpu-trace-pulse-4"
        />
        <circle cx="760" cy="280" r="2.5" fill="#ffffff" opacity="0.8" />
      </svg>

      {/* Terminal Horizontal Light Slits at Outer Screen Borders (Image 2/3) */}
      {/* Top Left Outer Slit */}
      <div className="absolute left-0 top-[20%] -translate-y-1/2 w-28 pointer-events-none">
        <div className="light-slit" />
      </div>

      {/* Bottom Left Outer Slit */}
      <div className="absolute left-0 top-[82%] -translate-y-1/2 w-24 pointer-events-none">
        <div className="light-slit" />
      </div>

      {/* Top Right Outer Slit */}
      <div className="absolute right-0 top-[20%] -translate-y-1/2 w-28 pointer-events-none">
        <div className="light-slit" />
      </div>

      {/* Bottom Right Outer Slit */}
      <div className="absolute right-0 top-[82%] -translate-y-1/2 w-24 pointer-events-none">
        <div className="light-slit" />
      </div>

      {/* Floating Telemetry Badges Mounted on the CPU Traces */}
      {/* 1. Top-Left Badge */}
      <div className="absolute left-[12%] top-[20%] -translate-y-1/2 pointer-events-auto">
        <div className="glass-pill glass-pill-hover px-4 py-1.5 rounded-full text-left border border-white/10 shadow-2xl transition-transform duration-200 hover:scale-105 cursor-default">
          <span className="text-[10px] text-slate-400 block font-mono">• Old City Grid</span>
          <span className="text-xs font-bold text-white font-mono">95.1 Urgency</span>
        </div>
      </div>

      {/* 2. Bottom-Left Badge */}
      <div className="absolute left-[14%] top-[82%] -translate-y-1/2 pointer-events-auto">
        <div className="glass-pill glass-pill-hover px-4 py-1.5 rounded-full text-left border border-white/10 shadow-2xl transition-transform duration-200 hover:scale-105 cursor-default">
          <span className="text-[10px] text-slate-400 block font-mono">• East Ward Feeder</span>
          <span className="text-xs font-bold text-white font-mono">92.4 Urgency</span>
        </div>
      </div>

      {/* 3. Top-Right Badge */}
      <div className="absolute right-[12%] top-[20%] -translate-y-1/2 pointer-events-auto">
        <div className="glass-pill glass-pill-hover px-4 py-1.5 rounded-full text-right border border-white/10 shadow-2xl transition-transform duration-200 hover:scale-105 cursor-default">
          <span className="text-[10px] text-slate-400 block font-mono">Industrial Highway •</span>
          <span className="text-xs font-bold text-white font-mono">88.7 Urgency</span>
        </div>
      </div>

      {/* 4. Bottom-Right Badge */}
      <div className="absolute right-[14%] top-[82%] -translate-y-1/2 pointer-events-auto">
        <div className="glass-pill glass-pill-hover px-4 py-1.5 rounded-full text-right border border-white/10 shadow-2xl transition-transform duration-200 hover:scale-105 cursor-default">
          <span className="text-[10px] text-slate-400 block font-mono">Metro Feeder •</span>
          <span className="text-xs font-bold text-white font-mono">61.5 Urgency</span>
        </div>
      </div>
    </div>
  );
}
