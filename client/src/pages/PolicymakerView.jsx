import React, { useState } from 'react';
import { Card, Badge } from '../components/ui';
import { PulseIcon, RefreshIcon } from '../components/icons';

export default function PolicymakerView({ priorities = [], onRecompute, isRecomputing }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('rank');

  const categories = [
    { id: 'all', label: 'All Sectors' },
    { id: 'electricity', label: 'Electricity' },
    { id: 'water', label: 'Water Supply' },
    { id: 'roads', label: 'Roads & Transit' },
    { id: 'sanitation', label: 'Sanitation' },
  ];

  let displayedPriorities = [...priorities];
  if (selectedCategory !== 'all') {
    displayedPriorities = displayedPriorities.filter(
      p => p.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }

  if (sortBy === 'urgency') {
    displayedPriorities.sort((a, b) => b.avg_urgency - a.avg_urgency);
  } else if (sortBy === 'submissions') {
    displayedPriorities.sort((a, b) => b.submission_count - a.submission_count);
  } else {
    displayedPriorities.sort((a, b) => a.final_priority_rank - b.final_priority_rank);
  }

  return (
    <div className="space-y-8 pb-16 pt-4">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 glass-pill px-3 py-1 rounded-full text-[10px] font-mono text-slate-300 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>GOVERNANCE DECISION SUPPORT • BRICS DPI</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-white tracking-tight">
            Municipal Capital <span className="italic font-light text-slate-200">Priority Queue</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl font-light leading-relaxed">
            Algorithmic resource allocation cross-referencing citizen volume against demographic vulnerability for defensible public expenditure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRecompute}
            disabled={isRecomputing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs transition-all cursor-pointer shadow-glow-white disabled:opacity-50"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${isRecomputing ? 'animate-spin' : ''}`} />
            <span>Re-run Optimization Model ↗</span>
          </button>
        </div>
      </div>

      {/* Transparent Formula Callout */}
      <div className="rounded-2xl bg-[#09090C] border border-white/10 p-5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="light-slit absolute top-0 inset-x-0" />
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center shrink-0">
            <PulseIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Explainable Scoring Model (Zero Black-Box)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5 font-light">
              Urgency Score = (Severity × 0.40) + (Demographic Gap × 0.35) + (Recency Decay × 0.15) + (Cluster Density × 0.10)
            </p>
          </div>
        </div>
        <div className="text-[11px] font-mono text-slate-300 bg-white/[0.05] border border-white/10 px-3.5 py-1.5 rounded-full whitespace-nowrap">
          Weights tuned for municipal governance
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0A0A0E] p-2.5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`
                px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer
                ${selectedCategory === cat.id
                  ? 'bg-white text-black font-semibold shadow-glow-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs pr-2">
          <span className="text-slate-400 font-mono text-[11px]">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#121218] border border-white/10 rounded-full px-3 py-1 text-slate-200 text-xs focus:outline-none focus:border-white/30 cursor-pointer"
          >
            <option value="rank">Priority Rank</option>
            <option value="urgency">Highest Urgency</option>
            <option value="submissions">Grievance Volume</option>
          </select>
        </div>
      </div>

      {/* Priority Table */}
      <div className="rounded-2xl bg-[#09090C] border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#101016] border-b border-white/[0.08] text-[11px] uppercase tracking-wider text-slate-400 font-mono">
              <tr>
                <th className="py-4 px-5 font-semibold text-center w-16">Rank</th>
                <th className="py-4 px-5 font-semibold">Municipal Ward</th>
                <th className="py-4 px-5 font-semibold">Infrastructure Sector</th>
                <th className="py-4 px-5 font-semibold text-center">Citizen Reports</th>
                <th className="py-4 px-5 font-semibold">Urgency Index</th>
                <th className="py-4 px-5 font-semibold min-w-[300px]">Strategic AI Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {displayedPriorities.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-5 text-center">
                    <span
                      className={`
                        inline-flex items-center justify-center w-7 h-7 rounded-full font-bold font-mono text-xs
                        ${item.final_priority_rank === 1
                          ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/50'
                          : item.final_priority_rank === 2
                          ? 'bg-amber-500 text-black font-semibold'
                          : 'bg-white/10 text-white'
                        }
                      `}
                    >
                      #{item.final_priority_rank}
                    </span>
                  </td>

                  <td className="py-4 px-5 font-semibold text-white">
                    {item.region_name}
                  </td>

                  <td className="py-4 px-5">
                    <Badge category={item.category} />
                  </td>

                  <td className="py-4 px-5 text-center font-mono">
                    <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/5 font-semibold text-slate-200">
                      {item.submission_count} reports
                    </span>
                  </td>

                  <td className="py-4 px-5">
                    <div className="w-36 space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="font-bold text-white">{item.avg_urgency.toFixed(1)}/100</span>
                        <span className={item.avg_urgency >= 85 ? 'text-rose-400 font-semibold' : 'text-amber-400'}>
                          {item.avg_urgency >= 85 ? 'Critical' : 'Elevated'}
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.avg_urgency >= 85
                              ? 'bg-gradient-to-r from-amber-400 to-rose-500'
                              : 'bg-gradient-to-r from-cyan-400 to-amber-400'
                          }`}
                          style={{ width: `${item.avg_urgency}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-5">
                    <div className="p-3 rounded-xl bg-[#121217] border border-white/5 text-[11px] text-slate-200 leading-relaxed font-light">
                      <span className="text-white font-mono text-[10px] uppercase font-bold mr-1.5 block sm:inline">
                        Action:
                      </span>
                      {item.recommended_action}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
