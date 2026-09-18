import React from 'react';
import { 
  ShieldAlert, 
  GitFork, 
  Network, 
  Cpu, 
  RefreshCw, 
  UploadCloud, 
  Radio, 
  Zap,
  Activity,
  Layers
} from 'lucide-react';
import { EcosystemDataset } from '../data/mockEcosystems';
import { NodeMetrics } from '../types';

interface HeaderProps {
  datasets: EcosystemDataset[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  metricsMap: Map<string, NodeMetrics>;
  onOpenIngestion: () => void;
  onTriggerWebhook: () => void;
  activeView: 'graph' | 'structural' | 'simulation' | 'mitigation';
  onSelectView: (view: 'graph' | 'structural' | 'simulation' | 'mitigation') => void;
  hasAppliedMitigations: boolean;
  onResetMitigations: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  metricsMap,
  onOpenIngestion,
  onTriggerWebhook,
  activeView,
  onSelectView,
  hasAppliedMitigations,
  onResetMitigations,
}) => {
  // Compute global summary vitals
  const metricsList = Array.from(metricsMap.values());
  const maxEdi = metricsList.length > 0 ? Math.max(...metricsList.map(m => m.ediScore)) : 0;
  const criticalCount = metricsList.filter(m => m.ediScore >= 70).length;
  const chokepoints = metricsList.filter(m => m.maintainerChokepointScore >= 60).length;

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
      {/* Top Banner with Brand and Vitals */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Network className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white font-mono">
                Dependency<span className="text-cyan-400">Pulse</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-cyan-950 border border-cyan-800/60 text-cyan-300">
                DAG Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Dynamic Directed Supply-Chain Criticality & Propagation Analysis
            </p>
          </div>
        </div>

        {/* Global Vital Indicators */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <span className="text-slate-400">Peak EDI Risk:</span>
            <span className={`font-mono font-bold ${maxEdi >= 75 ? 'text-rose-400' : maxEdi >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {maxEdi}/100
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <span className="text-slate-400">Chokepoints:</span>
            <span className="font-mono font-bold text-amber-400">{chokepoints} single-maint</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <span className="text-slate-400">Critical Nodes:</span>
            <span className="font-mono font-bold text-rose-400">{criticalCount}</span>
          </div>

          {hasAppliedMitigations && (
            <button
              onClick={onResetMitigations}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/60 border border-amber-800/80 rounded-lg hover:bg-amber-900/60 transition-colors"
              title="Reset simulated mitigations to baseline state"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Mitigations
            </button>
          )}
        </div>

        {/* Right Tools & Ingestion */}
        <div className="flex items-center gap-2">
          {/* Ecosystem Preset Selector */}
          <select
            value={selectedDatasetId}
            onChange={(e) => onSelectDataset(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            {datasets.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Webhook Simulator Trigger */}
          <button
            onClick={onTriggerWebhook}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:border-cyan-500/50 hover:text-cyan-300 transition-colors"
            title="Simulate upstream registry webhook release or zero-day advisory"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Advisory Webhook</span>
          </button>

          {/* Import SBOM / Lockfile */}
          <button
            onClick={onOpenIngestion}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-950 bg-gradient-to-r from-cyan-400 to-teal-400 rounded-lg hover:brightness-110 transition-all font-semibold shadow-sm shadow-cyan-500/20"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import SBOM</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 border-t border-slate-900 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => onSelectView('graph')}
          className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
            activeView === 'graph'
              ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          Multi-Layer Graph & Attack Tree
        </button>

        <button
          onClick={() => onSelectView('structural')}
          className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
            activeView === 'structural'
              ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Structural Criticality & EDI vs CVSS
        </button>

        <button
          onClick={() => onSelectView('simulation')}
          className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
            activeView === 'simulation'
              ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Propagation Simulation Engine
        </button>

        <button
          onClick={() => onSelectView('mitigation')}
          className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-colors whitespace-nowrap ${
            activeView === 'mitigation'
              ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Cut-Vertex Mitigations & ROI Ranking
        </button>
      </div>
    </header>
  );
};
