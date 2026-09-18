import React, { useState } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Crosshair, 
  Clock, 
  TrendingUp, 
  Check, 
  Copy, 
  Terminal, 
  ArrowRight,
  Code,
  Sparkles,
  Layers,
  Cpu
} from 'lucide-react';
import { MitigationAction } from '../types';

interface MitigationEngineProps {
  mitigations: MitigationAction[];
  onToggleMitigation: (actionId: string) => void;
  appliedMitigations: string[];
}

export const MitigationEngine: React.FC<MitigationEngineProps> = ({
  mitigations,
  onToggleMitigation,
  appliedMitigations,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'cut-vertex' | 'tactical' | 'strategic'>('all');

  const filteredMitigations = mitigations.filter(m => {
    if (filterType === 'cut-vertex') return m.isCutVertex;
    if (filterType === 'tactical') return m.category === 'tactical';
    if (filterType === 'strategic') return m.category === 'strategic';
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Find the top cut-vertex recommendation
  const topCutVertex = mitigations.find(m => m.isCutVertex);

  return (
    <div className="space-y-6">
      {/* Optimal Cut-Vertex Spotlight Banner */}
      {topCutVertex && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/60 border border-emerald-600/60 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                Optimal Cut-Vertex Articulation Point
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Neutralize Systemic Risk via Upstream Wrapper: <span className="text-emerald-400 font-mono">{topCutVertex.targetNodeName}</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Graph topological analysis identified this component as a critical bridge. Intercepting or overriding this single dependency cuts off malicious cascading failure for <strong>{topCutVertex.blastRadiusReduction} downstream services</strong> simultaneously with only <strong>{topCutVertex.effortHours} hours</strong> of engineering effort (ROI Score: <strong>{topCutVertex.roiScore}</strong>).
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => onToggleMitigation(topCutVertex.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                  appliedMitigations.includes(topCutVertex.id)
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
                    : 'bg-emerald-900/80 border border-emerald-500/80 text-emerald-200 hover:bg-emerald-800'
                }`}
              >
                {appliedMitigations.includes(topCutVertex.id) ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Cut-Vertex Applied (Active)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Apply Cut-Vertex Shim</span>
                  </>
                )}
              </button>

              <div className="text-[11px] text-slate-400 font-mono">
                Formula: (Blast {topCutVertex.blastRadiusReduction} × Crit {topCutVertex.serviceCriticalityMultiplier}) / {topCutVertex.effortHours}h = ROI {topCutVertex.roiScore}
              </div>
            </div>
          </div>

          {/* Quick Snippet Box */}
          <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs flex items-center justify-between gap-4">
            <div className="text-emerald-400 truncate">
              {topCutVertex.commandSnippet}
            </div>
            <button
              onClick={() => handleCopy('top-cut', topCutVertex.commandSnippet)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
              title="Copy to clipboard"
            >
              {copiedId === 'top-cut' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Actionable Mitigations ({mitigations.length})
          </button>
          <button
            onClick={() => setFilterType('cut-vertex')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'cut-vertex'
                ? 'bg-emerald-950 border border-emerald-800 text-emerald-300 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Cut-Vertex Articulations
          </button>
          <button
            onClick={() => setFilterType('tactical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'tactical'
                ? 'bg-cyan-950 border border-cyan-800 text-cyan-300 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Immediate Tactical (eBPF / Seccomp)
          </button>
          <button
            onClick={() => setFilterType('strategic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'strategic'
                ? 'bg-indigo-950 border border-indigo-800 text-indigo-300 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Strategic Architecture (Forks / Substitutions)
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Ranked by: <strong>Blast Reduction ROI</strong>
        </div>
      </div>

      {/* Ranked Mitigations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMitigations.map((action, idx) => {
          const isApplied = appliedMitigations.includes(action.id);

          return (
            <div
              key={action.id}
              className={`p-5 rounded-2xl border transition-all space-y-3.5 relative ${
                isApplied
                  ? 'bg-slate-900/90 border-emerald-500/70 shadow-lg shadow-emerald-950/20'
                  : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300">
                      RANK #{idx + 1}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      action.category === 'tactical'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                    }`}>
                      {action.category}
                    </span>
                    {action.isCutVertex && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                        <Crosshair className="w-3 h-3" />
                        Cut-Vertex
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white font-mono pt-1">
                    {action.title}
                  </h3>
                  <div className="text-xs text-cyan-400 font-mono">
                    Target: {action.targetNodeName}
                  </div>
                </div>

                {/* ROI Badge */}
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Risk ROI</div>
                  <div className="text-lg font-bold font-mono text-emerald-400">
                    {action.roiScore}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {action.description}
              </p>

              {/* Metrics Pill Row */}
              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-center font-mono">
                <div>
                  <div className="text-[10px] text-slate-500">Blast Reduction</div>
                  <div className="text-xs font-bold text-slate-200">
                    -{action.blastRadiusReduction} apps
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Tier Multiplier</div>
                  <div className="text-xs font-bold text-slate-200">
                    {action.serviceCriticalityMultiplier}x
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Remediation Effort</div>
                  <div className="text-xs font-bold text-slate-200">
                    ~{action.effortHours}h Dev
                  </div>
                </div>
              </div>

              {/* Code command */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] flex items-center justify-between gap-2">
                <pre className="text-slate-300 truncate overflow-x-auto whitespace-pre">
                  {action.commandSnippet}
                </pre>
                <button
                  onClick={() => handleCopy(action.id, action.commandSnippet)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  title="Copy command"
                >
                  {copiedId === action.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Toggle Action Button */}
              <div className="pt-1">
                <button
                  onClick={() => onToggleMitigation(action.id)}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                    isApplied
                      ? 'bg-emerald-950 border border-emerald-600 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {isApplied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Mitigation Applied (Simulated in DAG)</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Simulate This Mitigation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
