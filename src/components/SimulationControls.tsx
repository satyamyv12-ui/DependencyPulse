import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Filter, 
  Clock, 
  DollarSign, 
  Flame, 
  Terminal, 
  Zap,
  Layers,
  FileCheck
} from 'lucide-react';
import { DependencyNode, SimulationConfig, SimulationScenario } from '../types';
import { SimulationState } from '../utils/propagationEngine';

interface SimulationControlsProps {
  nodes: DependencyNode[];
  config: SimulationConfig;
  onChangeConfig: (newConfig: SimulationConfig) => void;
  simulationState: SimulationState;
  onRunStep: (hour: number) => void;
  onReset: () => void;
  appliedMitigationsCount: number;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  nodes,
  config,
  onChangeConfig,
  simulationState,
  onRunStep,
  onReset,
  appliedMitigationsCount,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Filter package nodes as candidate infection sources
  const packageNodes = nodes.filter(n => n.type === 'package');

  // Play / auto-advance timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (config.timeHorizonHours >= 72) {
          setIsPlaying(false);
        } else {
          const nextHour = config.timeHorizonHours + 6;
          onChangeConfig({ ...config, timeHorizonHours: nextHour });
          onRunStep(nextHour);
        }
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, config, onChangeConfig, onRunStep]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onChangeConfig({ ...config, timeHorizonHours: val });
    onRunStep(val);
  };

  const handleScenarioChange = (scenario: SimulationScenario) => {
    setIsPlaying(false);
    onChangeConfig({ ...config, scenario, timeHorizonHours: 0 });
    onRunStep(0);
  };

  const targetNode = nodes.find(n => n.id === config.targetNodeId);
  const infectedAppsCount = Array.from(simulationState.infectedNodeIds)
    .map(id => nodes.find(n => n.id === id))
    .filter(n => n?.type === 'application').length;

  const totalAppsCount = nodes.filter(n => n.type === 'application').length;

  return (
    <div className="space-y-6">
      {/* Simulation Scenario Selector */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
              Cascading Propagation Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate real-time supply chain attacks, maintainer compromises, and automated update bot adoption.
            </p>
          </div>

          {/* Quick Target Package Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Zero-Patient Target:</span>
            <select
              value={config.targetNodeId}
              onChange={(e) => {
                onChangeConfig({ ...config, targetNodeId: e.target.value });
                onRunStep(config.timeHorizonHours);
              }}
              className="bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {packageNodes.map(pkg => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} ({pkg.version}) {pkg.isSingleMaintainer ? '⚠️ Solo' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Scenarios Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Scenario 1 */}
          <button
            onClick={() => handleScenarioChange('maintainer-ato')}
            className={`p-3.5 rounded-xl text-left border transition-all ${
              config.scenario === 'maintainer-ato'
                ? 'bg-rose-950/60 border-rose-500/80 text-white shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Scenario 1</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/50 text-rose-300 font-mono">ATO</span>
            </div>
            <div className="text-xs font-semibold text-white">Maintainer Account Takeover</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Stolen publishing tokens or compromised 2FA-less developer credentials publishing a malicious minor version.
            </p>
          </button>

          {/* Scenario 2 */}
          <button
            onClick={() => handleScenarioChange('malicious-patch')}
            className={`p-3.5 rounded-xl text-left border transition-all ${
              config.scenario === 'malicious-patch'
                ? 'bg-rose-950/60 border-rose-500/80 text-white shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Scenario 2</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 font-mono">PATCH</span>
            </div>
            <div className="text-xs font-semibold text-white">Backdoored Patch Release</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Obfuscated eval payload embedded into deep utility function; absorbed via floating semantic version ranges.
            </p>
          </button>

          {/* Scenario 3 */}
          <button
            onClick={() => handleScenarioChange('ci-secret-stealer')}
            className={`p-3.5 rounded-xl text-left border transition-all ${
              config.scenario === 'ci-secret-stealer'
                ? 'bg-rose-950/60 border-rose-500/80 text-white shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Scenario 3</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300 font-mono">CI/CD</span>
            </div>
            <div className="text-xs font-semibold text-white">CI/CD Secret Stealer</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Pre-install lifecycle scripts executing in CI runners to harvest AWS, GitHub, and registry environment tokens.
            </p>
          </button>

          {/* Scenario 4 */}
          <button
            onClick={() => handleScenarioChange('revoked-package')}
            className={`p-3.5 rounded-xl text-left border transition-all ${
              config.scenario === 'revoked-package'
                ? 'bg-rose-950/60 border-rose-500/80 text-white shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Scenario 4</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-300 font-mono">DENIAL</span>
            </div>
            <div className="text-xs font-semibold text-white">Revoked Package / Left-Pad</div>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Maintainer unpublishes package or pushes sabotage release, causing immediate cascading build breakage.
            </p>
          </button>
        </div>

        {/* Dynamics Configuration: Vectors, Lockfile, Reachability */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          {/* Vector Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Propagation Vector:</span>
            <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              <button
                onClick={() => onChangeConfig({ ...config, propagationVector: 'all' })}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  config.propagationVector === 'all'
                    ? 'bg-slate-800 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Vectors
              </button>
              <button
                onClick={() => onChangeConfig({ ...config, propagationVector: 'build-time' })}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  config.propagationVector === 'build-time'
                    ? 'bg-amber-900/60 text-amber-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Build-Time CI Arbitrary Exec
              </button>
              <button
                onClick={() => onChangeConfig({ ...config, propagationVector: 'runtime' })}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  config.propagationVector === 'runtime'
                    ? 'bg-indigo-900/60 text-indigo-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Runtime Microservices
              </button>
            </div>
          </div>

          {/* Defense Dynamics Toggles */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Lockfile Resistance Toggle */}
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.lockfileResistanceActive}
                onChange={(e) => {
                  onChangeConfig({ ...config, lockfileResistanceActive: e.target.checked });
                  onRunStep(config.timeHorizonHours);
                }}
                className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20"
              />
              <span className="flex items-center gap-1 text-slate-300">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Lockfile Resistance (sha512 Pinned)
              </span>
            </label>

            {/* Reachability Pruning Toggle */}
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.reachabilityPruningActive}
                onChange={(e) => {
                  onChangeConfig({ ...config, reachabilityPruningActive: e.target.checked });
                  onRunStep(config.timeHorizonHours);
                }}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span className="flex items-center gap-1 text-slate-300">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                Call-Graph Reachability Pruning
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Interactive Time Horizon Slider & Playback */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-9 h-9 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {/* Reset Button */}
            <button
              onClick={() => {
                setIsPlaying(false);
                onReset();
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
              title="Reset Timeline to Hour 0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 font-mono text-xs">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400">Time-to-Compromise Decay:</span>
              <span className="text-base font-bold text-white ml-1">
                T + {config.timeHorizonHours} Hours
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            {config.timeHorizonHours === 0
              ? 'Zero Hour: Initial Compromise Published to Registry'
              : config.timeHorizonHours <= 12
              ? 'Early Waves: Fast CI pipelines & Floating range installs absorb'
              : config.timeHorizonHours <= 48
              ? 'Mid Decay: Renovate & Dependabot automated PRs trigger builds'
              : 'Full Saturation: All vulnerable deployment clusters infected'}
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max="72"
            step="6"
            value={config.timeHorizonHours}
            onChange={handleSliderChange}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-slate-800"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>0h (Deploy)</span>
            <span>6h</span>
            <span>12h</span>
            <span>24h (Bot PRs)</span>
            <span>48h (Lockfile Decay)</span>
            <span>72h (Global Saturation)</span>
          </div>
        </div>

        {/* Real-time Telemetry Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Compromised Workloads */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Compromised Services</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
              {infectedAppsCount} <span className="text-xs text-slate-500 font-sans font-normal">/ {totalAppsCount} Apps</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {simulationState.lockfileProtectedNodeIds.size > 0 && (
                <span className="text-emerald-400 font-medium">
                  {simulationState.lockfileProtectedNodeIds.size} saved by sha512 lockfiles
                </span>
              )}
            </div>
          </div>

          {/* Est Financial Damage */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Est. Financial Exposure</span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              ${(simulationState.timelineHistory[simulationState.timelineHistory.length - 1]?.estimatedCostUSD ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Regulatory breach & incident triage
            </div>
          </div>

          {/* Data Classifications Breached */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Data Enclaves Breached</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {simulationState.exposedData.size === 0 ? (
                <span className="text-xs text-emerald-400 font-medium">None Compromised</span>
              ) : (
                Array.from(simulationState.exposedData).map(c => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-950 text-rose-300 border border-rose-800"
                  >
                    {c}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Pruned Dead Code Defense */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Pruned by Reachability</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
              {simulationState.reachabilityPrunedNodeIds.size} <span className="text-xs text-slate-500 font-sans font-normal">Nodes Neutralized</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Uncalled dead code paths in AST
            </div>
          </div>
        </div>

        {/* Live Attack Feed & Terminal Log */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800/80 mb-2">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Terminal className="w-3.5 h-3.5" />
              Runtime Telemetry & Exfiltration Console
            </span>
            <span className="text-[10px] text-slate-500">Live Agent Stream</span>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-2 text-[11px]">
            {simulationState.stealthExfiltrations.length === 0 ? (
              <div className="text-slate-500 italic py-1">
                [T+0h] Ingestion initialized. Patient zero package {targetNode?.name || 'target'} selected. No active exfiltration channels established yet.
              </div>
            ) : (
              simulationState.stealthExfiltrations.map((log, i) => (
                <div key={i} className="text-rose-400 flex items-start gap-2">
                  <span className="text-rose-600 font-bold">▶</span>
                  <span>{log}</span>
                </div>
              ))
            )}
            {simulationState.lockfileProtectedNodeIds.size > 0 && (
              <div className="text-emerald-400 flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✔</span>
                <span>
                  Lockfile Integrity Protection active: blocked automated floating range upgrade for {simulationState.lockfileProtectedNodeIds.size} production repositories.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
