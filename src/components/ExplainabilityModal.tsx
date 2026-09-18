import React, { useState, useEffect } from 'react';
import { 
  X, 
  Eye, 
  Sparkles, 
  GitBranch, 
  ShieldAlert, 
  CheckCircle, 
  Layers, 
  Play, 
  Sliders, 
  ArrowRight, 
  RefreshCw, 
  Key, 
  Lock, 
  Server, 
  Cpu, 
  Terminal
} from 'lucide-react';
import { DependencyNode, DependencyEdge, NodeMetrics } from '../types';

interface ExplainabilityModalProps {
  node: DependencyNode | null;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  metricsMap: Map<string, NodeMetrics>;
  onClose: () => void;
  onApplyCounterfactual: (overrideKey: string, value: any) => void;
}

export const ExplainabilityModal: React.FC<ExplainabilityModalProps> = ({
  node,
  nodes,
  edges,
  metricsMap,
  onClose,
  onApplyCounterfactual,
}) => {
  if (!node) return null;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const metric = metricsMap.get(node.id);

  const [narrative, setNarrative] = useState<string>('');
  const [narrativeSource, setNarrativeSource] = useState<string>('generating');
  const [isLoadingNarrative, setIsLoadingNarrative] = useState<boolean>(true);

  // Counterfactual What-If State
  const [activeCounterfactual, setActiveCounterfactual] = useState<string | null>(null);
  const [simulatedEdiDelta, setSimulatedEdiDelta] = useState<number | null>(null);

  // Compute downstream application paths (Visual Attack Tree)
  const attackPaths = React.useMemo(() => {
    // Find paths from `node` up to any application
    // Edge convention: source -> target (source requires target)
    // To go from target up to applications, we follow dependents (reverse edges)
    const reverseMap = new Map<string, string[]>();
    nodes.forEach(n => reverseMap.set(n.id, []));
    edges.forEach(e => {
      reverseMap.get(e.target)?.push(e.source);
    });

    const paths: DependencyNode[][] = [];

    function dfs(currentId: string, currentPath: string[], depth = 0) {
      if (depth > 6) return;
      const curr = nodeMap.get(currentId);
      if (!curr) return;

      if (curr.type === 'application') {
        const fullNodeList = [...currentPath, currentId]
          .map(id => nodeMap.get(id))
          .filter(Boolean) as DependencyNode[];
        paths.push(fullNodeList);
        return;
      }

      const parents = reverseMap.get(currentId) || [];
      for (const parentId of parents) {
        if (!currentPath.includes(parentId)) {
          dfs(parentId, [...currentPath, currentId], depth + 1);
        }
      }
    }

    dfs(node.id, [], 0);
    return paths.slice(0, 3); // Top 3 critical attack chains
  }, [node, nodes, edges]);

  // Downstream apps list
  const downstreamApps = React.useMemo(() => {
    const apps = new Set<DependencyNode>();
    attackPaths.forEach(path => {
      const app = path[path.length - 1];
      if (app && app.type === 'application') apps.add(app);
    });
    return Array.from(apps);
  }, [attackPaths]);

  // Fetch Natural Language Narrative
  const fetchNarrative = async () => {
    setIsLoadingNarrative(true);
    try {
      const res = await fetch('/api/generate-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node,
          downstreamApps,
          metrics: metric,
          scenario: 'Structural Criticality Analysis',
        }),
      });

      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();
      setNarrative(data.narrative);
      setNarrativeSource(data.source);
    } catch (err) {
      console.warn('Failed to load narrative from API:', err);
      // Fallback
      setNarrative(
        `Component ${node.name}@${node.version} exhibits an Environmental Downstream Impact (EDI) score of ${metric?.ediScore ?? 75}/100. It is transitively required by ${metric?.reverseReachabilityBlastRadius ?? 1} production workloads. A compromise of this entity provides an unimpeded vector into your execution perimeter.`
      );
      setNarrativeSource('local-synthesis');
    } finally {
      setIsLoadingNarrative(false);
    }
  };

  useEffect(() => {
    fetchNarrative();
  }, [node.id]);

  // Handle What-If Counterfactual
  const handleTestWhatIf = (type: 'upgrade' | 'wasm-sandbox' | 'strict-lockfile' | 'sever-link') => {
    setActiveCounterfactual(type);
    let delta = 0;
    if (type === 'wasm-sandbox') delta = -42;
    else if (type === 'upgrade') delta = -28;
    else if (type === 'strict-lockfile') delta = -19;
    else if (type === 'sever-link') delta = -55;

    setSimulatedEdiDelta(delta);
    onApplyCounterfactual(type, node.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Eye className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">
                  {node.name} <span className="text-slate-400 font-normal">({node.version})</span>
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {node.ecosystem}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                  (metric?.ediScore ?? 0) >= 75
                    ? 'text-rose-400 bg-rose-950/60 border-rose-800'
                    : 'text-amber-400 bg-amber-950/60 border-amber-800'
                }`}>
                  EDI: {metric?.ediScore ?? 0}/100
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transparent Reasoning & Counterfactual Supply-Chain Sandbox
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Section 1: Natural Language Context Narrative */}
          <div className="p-5 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                  Supply Chain Intelligence Briefing
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  Engine: {narrativeSource === 'gemini-3.8-flash' ? 'Google Gemini 3.8 Flash' : 'Deterministic Synthesis'}
                </span>
                <button
                  onClick={fetchNarrative}
                  disabled={isLoadingNarrative}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  title="Regenerate Narrative"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingNarrative ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>
            </div>

            {isLoadingNarrative ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Synthesizing structural security narrative...</span>
              </div>
            ) : (
              <div className="text-slate-200 text-xs leading-relaxed whitespace-pre-line font-sans">
                {narrative}
              </div>
            )}
          </div>

          {/* Section 2: Visual Attack Tree */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-indigo-400" />
                Visual Attack Tree (End-to-End Ingress Path)
              </h3>
              <span className="text-slate-400 font-mono text-[11px]">
                Showing {attackPaths.length} propagation chains
              </span>
            </div>

            {attackPaths.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-center">
                This component has no active reverse reachability paths to application roots.
              </div>
            ) : (
              <div className="space-y-3">
                {attackPaths.map((path, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="text-[10px] font-mono text-slate-500 uppercase">
                      Attack Chain #{pIdx + 1} • Length: {path.length} hops
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      {path.map((stepNode, sIdx) => {
                        const isOrigin = sIdx === 0;
                        const isDest = sIdx === path.length - 1;

                        return (
                          <React.Fragment key={stepNode.id}>
                            <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                              isOrigin
                                ? 'bg-rose-950/80 border-rose-700 text-rose-300 font-bold'
                                : isDest
                                ? 'bg-indigo-950/80 border-indigo-700 text-indigo-200 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}>
                              <span>{stepNode.name}</span>
                              {stepNode.type === 'application' && (
                                <span className="text-[9px] px-1 rounded bg-indigo-900 text-indigo-300 font-sans">
                                  {stepNode.tier}
                                </span>
                              )}
                              {stepNode.hasInstallScripts && (
                                <span className="text-[9px] text-amber-400 font-sans" title="Has pre/post install scripts">
                                  ⚡script
                                </span>
                              )}
                            </div>

                            {!isDest && (
                              <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Interactive Counterfactuals ("What-If" Sandbox) */}
          <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Interactive Counterfactual Sandbox ("What-If" Testing)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Test the mathematical effect of isolation policies or version overrides before touching production code.
                </p>
              </div>

              {simulatedEdiDelta !== null && (
                <div className="px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono text-xs font-bold">
                  Simulated Risk Delta: {simulatedEdiDelta} Pts
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Counterfactual 1 */}
              <button
                onClick={() => handleTestWhatIf('wasm-sandbox')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeCounterfactual === 'wasm-sandbox'
                    ? 'bg-emerald-950/80 border-emerald-500 text-white ring-1 ring-emerald-500'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>Isolate in WebAssembly Sandbox</span>
                  <span className="text-emerald-400 font-mono text-xs">-42 EDI</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Revokes all raw filesystem, outbound socket, and environment read permissions at runtime.
                </p>
              </button>

              {/* Counterfactual 2 */}
              <button
                onClick={() => handleTestWhatIf('upgrade')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeCounterfactual === 'upgrade'
                    ? 'bg-emerald-950/80 border-emerald-500 text-white ring-1 ring-emerald-500'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>Upgrade to Verified Multi-Maintainer Major</span>
                  <span className="text-emerald-400 font-mono text-xs">-28 EDI</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Eliminates single-maintainer chokepoint and removes deprecated install script hooks.
                </p>
              </button>

              {/* Counterfactual 3 */}
              <button
                onClick={() => handleTestWhatIf('strict-lockfile')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeCounterfactual === 'strict-lockfile'
                    ? 'bg-emerald-950/80 border-emerald-500 text-white ring-1 ring-emerald-500'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>Enforce Strict Cryptographic Lockfiles</span>
                  <span className="text-emerald-400 font-mono text-xs">-19 EDI</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pins sha512 checksum across all Tier-1 consumer pipelines, preventing automatic bot ingestion.
                </p>
              </button>

              {/* Counterfactual 4 */}
              <button
                onClick={() => handleTestWhatIf('sever-link')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeCounterfactual === 'sever-link'
                    ? 'bg-emerald-950/80 border-emerald-500 text-white ring-1 ring-emerald-500'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>Cut-Vertex Override at Intermediate Wrapper</span>
                  <span className="text-emerald-400 font-mono text-xs">-55 EDI</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Replaces upstream call with in-memory stub; disconnects all downstream microservices completely.
                </p>
              </button>
            </div>

            {activeCounterfactual && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/80 flex items-center justify-between text-xs font-mono">
                <div className="text-emerald-300">
                  Counterfactual applied: Baseline EDI {metric?.ediScore ?? 75} ➔ Simulated EDI {Math.max(5, (metric?.ediScore ?? 75) + (simulatedEdiDelta || 0))}
                </div>
                <span className="text-emerald-400 font-bold">
                  {simulatedEdiDelta} Pts Reduction
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
