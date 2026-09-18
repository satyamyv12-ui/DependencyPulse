import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldAlert, 
  Activity, 
  Layers, 
  Sliders, 
  AlertOctagon, 
  CheckCircle2, 
  ArrowUpDown, 
  ExternalLink,
  Info,
  HelpCircle,
  Eye,
  FileWarning
} from 'lucide-react';
import { DependencyNode, NodeMetrics } from '../types';

interface MetricsPanelProps {
  nodes: DependencyNode[];
  metricsMap: Map<string, NodeMetrics>;
  onSelectNode: (node: DependencyNode) => void;
  onOpenExplainability: (node: DependencyNode) => void;
}

type SortField = 'ediScore' | 'keystoneScore' | 'betweennessCentrality' | 'reverseReachabilityBlastRadius' | 'cvssEdiDiscrepancy' | 'maintainerChokepointScore';

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  nodes,
  metricsMap,
  onSelectNode,
  onOpenExplainability,
}) => {
  const [sortField, setSortField] = useState<SortField>('ediScore');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'package' | 'chokepoint' | 'discrepancy'>('all');

  const packagesAndApps = useMemo(() => {
    return nodes.filter(n => n.type !== 'maintainer');
  }, [nodes]);

  const sortedData = useMemo(() => {
    let filtered = [...packagesAndApps];
    if (filterType === 'package') {
      filtered = filtered.filter(n => n.type === 'package');
    } else if (filterType === 'chokepoint') {
      filtered = filtered.filter(n => (metricsMap.get(n.id)?.maintainerChokepointScore ?? 0) >= 50);
    } else if (filterType === 'discrepancy') {
      filtered = filtered.filter(n => (metricsMap.get(n.id)?.cvssEdiDiscrepancy ?? 0) >= 40);
    }

    return filtered.sort((a, b) => {
      const mA = metricsMap.get(a.id);
      const mB = metricsMap.get(b.id);
      const valA = mA ? mA[sortField] : 0;
      const valB = mB ? mB[sortField] : 0;
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [packagesAndApps, metricsMap, sortField, sortAsc, filterType]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pillar 1 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pillar 1: Topological Reach</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            Max 25 Pts
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Evaluates DAG propagation depth, consumer breadth, and modified PageRank Keystone centrality.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pillar 2: Asset Criticality</span>
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            Max 25 Pts
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Weights PCI-DSS, PII, financial ledgers, and Tier-1 production clusters vs internal tools.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pillar 3: Privilege & Scope</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            Max 25 Pts
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Penalizes pre/post-install lifecycle scripts, process exec, env access, and raw outbound sockets.
          </p>
        </div>

        {/* Pillar 4 */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pillar 4: Substitutability</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            Max 25 Pts
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Architectural coupling: pluggable utility swap (hours) vs core framework dependency (months).
          </p>
        </div>
      </div>

      {/* CVSS Blindspot Callout Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
          <FileWarning className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
            CVSS vs. EDI Structural Discrepancy Insight
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Conventional vulnerability scanners rely solely on CVSS scores published in the NVD. This leaves catastrophic supply chain blindspots: a component with <strong>0 active CVEs</strong> can possess a devastating <strong>EDI score of 90+</strong> due to single-maintainer chokepoints, pre-install scripts, and deep transitive requirement across 100% of Tier-1 production services.
          </p>
        </div>
      </div>

      {/* Table Filter & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Components ({packagesAndApps.length})
          </button>
          <button
            onClick={() => setFilterType('chokepoint')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'chokepoint'
                ? 'bg-amber-950 border border-amber-800 text-amber-300 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            Maintainer Chokepoints
          </button>
          <button
            onClick={() => setFilterType('discrepancy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'discrepancy'
                ? 'bg-rose-950 border border-rose-800 text-rose-300 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            High CVSS Discrepancy (Blindspots)
          </button>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing {sortedData.length} entities
        </span>
      </div>

      {/* Main Structural Metrics Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-3 px-4">Component & Version</th>
                <th className="py-3 px-3">Type</th>
                
                <th 
                  className="py-3 px-3 cursor-pointer hover:text-cyan-300 transition-colors"
                  onClick={() => handleSort('ediScore')}
                >
                  <div className="flex items-center gap-1">
                    <span>EDI Score</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th 
                  className="py-3 px-3 cursor-pointer hover:text-cyan-300 transition-colors"
                  onClick={() => handleSort('reverseReachabilityBlastRadius')}
                >
                  <div className="flex items-center gap-1">
                    <span>Blast Radius (Apps)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th 
                  className="py-3 px-3 cursor-pointer hover:text-cyan-300 transition-colors"
                  onClick={() => handleSort('keystoneScore')}
                >
                  <div className="flex items-center gap-1">
                    <span>Keystone PageRank</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th 
                  className="py-3 px-3 cursor-pointer hover:text-cyan-300 transition-colors"
                  onClick={() => handleSort('betweennessCentrality')}
                >
                  <div className="flex items-center gap-1">
                    <span>Betweenness Bridge</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th 
                  className="py-3 px-3 cursor-pointer hover:text-cyan-300 transition-colors"
                  onClick={() => handleSort('maintainerChokepointScore')}
                >
                  <div className="flex items-center gap-1">
                    <span>Chokepoint Risk</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th className="py-3 px-3">CVSS Max</th>

                <th 
                  className="py-3 px-3 cursor-pointer hover:text-rose-300 transition-colors"
                  onClick={() => handleSort('cvssEdiDiscrepancy')}
                >
                  <div className="flex items-center gap-1">
                    <span>Discrepancy</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-sans">
              {sortedData.map(node => {
                const metric = metricsMap.get(node.id);
                const edi = metric?.ediScore ?? 0;
                const blast = metric?.reverseReachabilityBlastRadius ?? 0;
                const keystone = metric?.keystoneScore ?? 0;
                const betweenness = metric?.betweennessCentrality ?? 0;
                const chokepoint = metric?.maintainerChokepointScore ?? 0;
                const cvss = metric?.traditionalCvssMax ?? 0;
                const discrepancy = metric?.cvssEdiDiscrepancy ?? 0;

                const ediColor = edi >= 75 ? 'text-rose-400 bg-rose-950/60 border-rose-800' : edi >= 50 ? 'text-amber-400 bg-amber-950/60 border-amber-800' : 'text-emerald-400 bg-emerald-950/60 border-emerald-800';

                return (
                  <tr 
                    key={node.id} 
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() => onSelectNode(node)}
                  >
                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {node.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {node.version} {node.maintainer ? `• ${node.maintainer}` : ''}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        node.type === 'application' 
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {node.type}
                      </span>
                    </td>

                    {/* EDI Score */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${ediColor}`}>
                          {edi}
                        </span>
                        {/* 4 Pillars Mini Bar */}
                        {metric && (
                          <div className="hidden lg:flex items-center gap-0.5 w-16 h-2 bg-slate-800 rounded-full overflow-hidden" title={`Topological: ${metric.topologicalReachScore} | Asset: ${metric.assetCriticalityScore} | Priv: ${metric.privilegeCapabilityScore} | Sub: ${metric.substitutabilityScore}`}>
                            <div className="h-full bg-cyan-400" style={{ width: `${(metric.topologicalReachScore / 25) * 100}%` }} />
                            <div className="h-full bg-indigo-400" style={{ width: `${(metric.assetCriticalityScore / 25) * 100}%` }} />
                            <div className="h-full bg-amber-400" style={{ width: `${(metric.privilegeCapabilityScore / 25) * 100}%` }} />
                            <div className="h-full bg-emerald-400" style={{ width: `${(metric.substitutabilityScore / 25) * 100}%` }} />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Blast Radius */}
                    <td className="py-3 px-3 font-mono">
                      <div className="font-semibold text-slate-200">
                        {blast} apps
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {metric?.downstreamTier1Count ? `${metric.downstreamTier1Count} Tier-1` : '0 Tier-1'}
                      </div>
                    </td>

                    {/* Keystone Score */}
                    <td className="py-3 px-3 font-mono text-slate-300">
                      <span className="font-semibold text-cyan-300">{keystone}</span>
                      <span className="text-[10px] text-slate-500">/100</span>
                    </td>

                    {/* Betweenness Bridge */}
                    <td className="py-3 px-3 font-mono">
                      <span className={betweenness >= 0.2 ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                        {betweenness.toFixed(2)}
                      </span>
                    </td>

                    {/* Chokepoint Risk */}
                    <td className="py-3 px-3 font-mono">
                      {node.type === 'package' ? (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          chokepoint >= 60 
                            ? 'bg-rose-950/70 text-rose-300 border border-rose-800' 
                            : chokepoint >= 30 
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-800' 
                            : 'text-slate-400'
                        }`}>
                          {chokepoint}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* CVSS Max */}
                    <td className="py-3 px-3 font-mono">
                      {cvss > 0 ? (
                        <span className={`font-semibold ${cvss >= 9 ? 'text-rose-400' : cvss >= 7 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {cvss.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-emerald-400">0.0 (None)</span>
                      )}
                    </td>

                    {/* CVSS Discrepancy */}
                    <td className="py-3 px-3 font-mono">
                      {discrepancy > 25 ? (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/60">
                          +{discrepancy}
                        </span>
                      ) : (
                        <span className="text-slate-500">+{discrepancy}</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenExplainability(node);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-800/80 rounded-lg hover:bg-cyan-900/60 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Explain</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
