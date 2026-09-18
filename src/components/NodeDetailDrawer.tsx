import React from 'react';
import { 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  Layers, 
  Activity, 
  FileCode, 
  Key, 
  Lock, 
  Unlock, 
  Zap, 
  ExternalLink,
  Flame,
  CheckCircle2,
  AlertOctagon,
  Eye,
  Crosshair,
  Server
} from 'lucide-react';
import { DependencyNode, NodeMetrics } from '../types';

interface NodeDetailDrawerProps {
  node: DependencyNode | null;
  metric: NodeMetrics | undefined;
  onClose: () => void;
  onOpenExplainability: (node: DependencyNode) => void;
  onSetAsSimulationTarget: (nodeId: string) => void;
  onApplyMitigation: (nodeId: string) => void;
  isMitigated: boolean;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  node,
  metric,
  onClose,
  onOpenExplainability,
  onSetAsSimulationTarget,
  onApplyMitigation,
  isMitigated,
}) => {
  if (!node) return null;

  const edi = metric?.ediScore ?? 50;
  const ediColor = edi >= 75 ? 'text-rose-400 border-rose-800 bg-rose-950/60' : edi >= 50 ? 'text-amber-400 border-amber-800 bg-amber-950/60' : 'text-emerald-400 border-emerald-800 bg-emerald-950/60';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col text-xs">
      {/* Drawer Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              node.type === 'application'
                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                : node.type === 'maintainer'
                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {node.type}
            </span>
            <span className="font-mono text-slate-400 text-[11px]">{node.ecosystem}</span>
          </div>

          <h2 className="text-base font-bold text-white font-mono mt-1 break-all">
            {node.name}
          </h2>
          <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
            {node.version}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Score Badges */}
      {metric && (
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-xl border ${ediColor}`}>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              EDI Risk Score
            </div>
            <div className="text-2xl font-bold font-mono mt-0.5">
              {metric.ediScore} <span className="text-xs opacity-60">/ 100</span>
            </div>
            <div className="text-[10px] opacity-80 mt-1">
              {metric.ediScore >= 75 ? 'Critical Systemic Threat' : metric.ediScore >= 50 ? 'Elevated Criticality' : 'Low Structural Risk'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Blast Radius
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-0.5">
              {metric.reverseReachabilityBlastRadius} <span className="text-xs text-slate-500">Apps</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {metric.downstreamTier1Count} Tier-1 Production
            </div>
          </div>
        </div>
      )}

      {/* EDI 4-Pillars Breakdown */}
      {metric && node.type !== 'maintainer' && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
          <div className="font-bold text-white text-xs uppercase tracking-wider flex items-center justify-between">
            <span>EDI Pillars Breakdown</span>
            <span className="font-mono text-slate-400 font-normal">Max 25 ea.</span>
          </div>

          {/* Pillar 1 */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">1. Topological Reach:</span>
              <span className="font-mono font-bold text-cyan-300">{metric.topologicalReachScore} / 25</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400" style={{ width: `${(metric.topologicalReachScore / 25) * 100}%` }} />
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">2. Asset Criticality:</span>
              <span className="font-mono font-bold text-indigo-300">{metric.assetCriticalityScore} / 25</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-400" style={{ width: `${(metric.assetCriticalityScore / 25) * 100}%` }} />
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">3. Privilege & Capability:</span>
              <span className="font-mono font-bold text-amber-300">{metric.privilegeCapabilityScore} / 25</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: `${(metric.privilegeCapabilityScore / 25) * 100}%` }} />
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">4. Substitutability:</span>
              <span className="font-mono font-bold text-emerald-300">{metric.substitutabilityScore} / 25</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${(metric.substitutabilityScore / 25) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Structural Centrality Metrics */}
      {metric && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="font-bold text-white text-xs uppercase tracking-wider">
            Network Centrality Values
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-500">Keystone PageRank</div>
              <div className="text-cyan-300 font-bold text-sm mt-0.5">{metric.keystoneScore} / 100</div>
            </div>

            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-500">Betweenness Centrality</div>
              <div className="text-amber-300 font-bold text-sm mt-0.5">{metric.betweennessCentrality.toFixed(3)}</div>
            </div>

            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-500">Chokepoint Threat</div>
              <div className="text-rose-300 font-bold text-sm mt-0.5">{metric.maintainerChokepointScore} / 100</div>
            </div>

            <div className="p-2 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-500">Traditional CVSS</div>
              <div className="text-white font-bold text-sm mt-0.5">{metric.traditionalCvssMax ? `${metric.traditionalCvssMax.toFixed(1)} CVSS` : '0.0 (None)'}</div>
            </div>
          </div>
        </div>
      )}

      {/* OpenSSF Scorecard Breakdown */}
      {node.openSsfScorecard && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              OpenSSF Scorecard
            </span>
            <span className="font-mono text-cyan-400 font-bold">
              {node.openSsfScorecard.overallScore} / 10
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-300">
            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-500">Branch Protection:</span>
              <span>{node.openSsfScorecard.branchProtection}/10</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-500">Code Review:</span>
              <span>{node.openSsfScorecard.codeReview}/10</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-500">SAST Analyzers:</span>
              <span>{node.openSsfScorecard.sast}/10</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-900">
              <span className="text-slate-500">Signed Releases:</span>
              <span>{node.openSsfScorecard.signedReleases}/10</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Flags & Permissions */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
        <div className="font-bold text-white text-xs uppercase tracking-wider">
          Runtime Permissions & Capabilities
        </div>

        <div className="flex flex-wrap gap-1.5">
          {node.hasInstallScripts && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
              ⚡ Pre/Post Install Scripts
            </span>
          )}
          {node.isSingleMaintainer && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950 text-amber-300 border border-amber-800">
              ⚠️ Solo Maintainer
            </span>
          )}
          {node.sensitiveCapabilities?.map(cap => (
            <span
              key={cap}
              className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700"
            >
              {cap}
            </span>
          ))}
          {(!node.sensitiveCapabilities || node.sensitiveCapabilities.length === 0) && !node.hasInstallScripts && (
            <span className="text-slate-500 italic">No elevated capabilities detected.</span>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <button
          onClick={() => onOpenExplainability(node)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 hover:brightness-110 transition-all shadow-lg shadow-cyan-500/20"
        >
          <Eye className="w-4 h-4" />
          <span>Explain Attack Tree & Sandbox</span>
        </button>

        {node.type === 'package' && (
          <button
            onClick={() => onSetAsSimulationTarget(node.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-950/80 border border-rose-700/80 text-rose-300 hover:bg-rose-900/60 transition-all"
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Simulate Propagation from Here</span>
          </button>
        )}

        {metric && metric.betweennessCentrality > 0.15 && (
          <button
            onClick={() => onApplyMitigation(node.id)}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              isMitigated
                ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                : 'bg-emerald-900/80 border border-emerald-700 text-emerald-200 hover:bg-emerald-800'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>{isMitigated ? 'Cut-Vertex Active' : 'Apply Cut-Vertex Shim'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
