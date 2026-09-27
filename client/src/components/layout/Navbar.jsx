import React from 'react';
import { PulseIcon, RefreshIcon, MapPinIcon, SendIcon, CivicPulseLogo } from '../icons';

export default function Navbar({ activeTab, setActiveTab, onRecompute, isRecomputing }) {
  const tabs = [
    { id: 'dashboard', label: 'Command Heatmap', icon: MapPinIcon },
    { id: 'submit', label: 'Citizen Ingest', icon: SendIcon },
    { id: 'policymakers', label: 'Policymaker Queue', icon: PulseIcon },
  ];

  return (
    <header className="sticky top-0 z-50 w-full pt-4 pb-2 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand Logo & Title */}
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="transition-transform duration-200 group-hover:scale-105">
            <CivicPulseLogo className="w-8 h-8 drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-white text-base tracking-tight">Civic</span>
              <span className="font-serif italic font-semibold text-white/90 text-base">Pulse</span>
              <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/[0.08] text-white/70 border border-white/10 ml-1 hidden sm:inline">
                DPI
              </span>
            </div>
          </div>
        </div>

        {/* Center: Floating Pill Navigation Island (Matching Reference) */}
        <nav className="glass-pill px-2 py-1.5 rounded-full flex items-center gap-1 shadow-2xl">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'bg-white text-black font-semibold shadow-glow-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions Matching Reference "Host an Event ↗" and "Log in" */}
        <div className="flex items-center gap-2.5">
          {/* Sync Button matching dark frosted pill */}
          <button
            onClick={onRecompute}
            disabled={isRecomputing}
            className="hidden md:flex items-center gap-1.5 glass-pill glass-pill-hover px-4 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white cursor-pointer disabled:opacity-50"
          >
            <RefreshIcon className={`w-3.5 h-3.5 text-slate-300 ${isRecomputing ? 'animate-spin' : ''}`} />
            <span>Sync AI Ranks ↗</span>
          </button>

          {/* White Pill Badge matching reference "Log in" */}
          <div className="flex items-center gap-2 bg-white text-black font-semibold px-4 py-1.5 rounded-full text-xs shadow-glow-white select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            <span>Live Engine</span>
          </div>
        </div>
      </div>
    </header>
  );
}
