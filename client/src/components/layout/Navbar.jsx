import React from 'react';
import { PulseIcon, RefreshIcon, MapPinIcon, SendIcon } from '../icons';

export default function Navbar({ activeTab, setActiveTab, onRecompute, isRecomputing }) {
  const tabs = [
    { id: 'dashboard', label: 'Command Heatmap', icon: MapPinIcon },
    { id: 'submit', label: 'Citizen Ingest', icon: SendIcon },
    { id: 'policymakers', label: 'Policymaker View', icon: PulseIcon },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-cyan-400/40 shadow-glow-cyan/50 flex items-center justify-center bg-black">
              <img src="/civicpulse.png" alt="CivicPulse Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-white text-lg">CIVIC</span>
                <span className="font-extrabold tracking-tight text-cyan-400 text-lg drop-shadow-[0_0_12px_rgba(0,210,255,0.6)]">PULSE</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 ml-1">
                  BRICS DPI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">AI Public Infrastructure Prioritization</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center bg-[#141418] p-1 rounded-xl border border-white/10 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer
                    ${isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-glow-cyan'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }
                  `}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Pipeline Live</span>
            </div>

            {/* Recompute Button */}
            <button
              onClick={onRecompute}
              disabled={isRecomputing}
              title="Trigger scoring engine recalculation"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white text-xs font-medium transition-all duration-150 cursor-pointer disabled:opacity-50"
            >
              <RefreshIcon className={`w-3.5 h-3.5 text-cyan-400 ${isRecomputing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync AI Ranks</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
