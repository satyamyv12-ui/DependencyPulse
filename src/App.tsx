import React, { useState, useMemo, useCallback } from 'react';
import { 
  Network, 
  Layers, 
  Activity, 
  Zap, 
  ShieldAlert, 
  ShieldCheck, 
  AlertCircle, 
  Radio, 
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';
import { ALL_DATASETS, EcosystemDataset } from './data/mockEcosystems';
import { DependencyNode, DependencyEdge, SimulationConfig, SimulationScenario } from './types';
import { computeGraphMetrics, calculateMitigationROI } from './utils/graphAlgorithms';
import { runSimulationStep, SimulationState } from './utils/propagationEngine';
import { Header } from './components/Header';
import { GraphCanvas } from './components/GraphCanvas';
import { MetricsPanel } from './components/MetricsPanel';
import { SimulationControls } from './components/SimulationControls';
import { MitigationEngine } from './components/MitigationEngine';
import { ExplainabilityModal } from './components/ExplainabilityModal';
import { IngestionModal } from './components/IngestionModal';
import { NodeDetailDrawer } from './components/NodeDetailDrawer';

export default function App() {
  // Datasets State
  const [datasets, setDatasets] = useState<EcosystemDataset[]>(ALL_DATASETS);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(ALL_DATASETS[0].id);

  // Active view tab
  const [activeView, setActiveView] = useState<'graph' | 'structural' | 'simulation' | 'mitigation'>('graph');

  // Selected dataset definition
  const currentDataset = useMemo(() => {
    return datasets.find(d => d.id === selectedDatasetId) || datasets[0];
  }, [datasets, selectedDatasetId]);

  // Current graph nodes and edges
  const [currentNodes, setCurrentNodes] = useState<DependencyNode[]>(currentDataset.nodes);
  const [currentEdges, setCurrentEdges] = useState<DependencyEdge[]>(currentDataset.edges);

  // Sync when dataset changes
  const handleSelectDataset = (datasetId: string) => {
    setSelectedDatasetId(datasetId);
    const target = datasets.find(d => d.id === datasetId) || datasets[0];
    setCurrentNodes(target.nodes);
    setCurrentEdges(target.edges);
    setSelectedNodeId(null);
    setAppliedMitigations([]);
    setSimConfig(prev => ({
      ...prev,
      targetNodeId: target.defaultSimulationTarget || target.nodes.find(n => n.type === 'package')?.id || '',
      timeHorizonHours: 0,
    }));
  };

  // Applied Mitigations list
  const [appliedMitigations, setAppliedMitigations] = useState<string[]>([]);

  // Simulation Configuration & State
  const [simConfig, setSimConfig] = useState<SimulationConfig>({
    scenario: 'maintainer-ato',
    targetNodeId: currentDataset.defaultSimulationTarget,
    propagationVector: 'all',
    lockfileResistanceActive: true,
    reachabilityPruningActive: true,
    timeHorizonHours: 0,
  });

  // Graph filter toggles
  const [highlightCutVertices, setHighlightCutVertices] = useState(true);
  const [filterReachability, setFilterReachability] = useState(false);

  // Selected Node for Drawer & Explainability
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [explainNode, setExplainNode] = useState<DependencyNode | null>(null);

  // Modal States
  const [isIngestionOpen, setIsIngestionOpen] = useState(false);
  const [notificationToast, setNotificationToast] = useState<{ message: string; type: 'info' | 'alert' | 'success' } | null>(null);

  const showToast = (message: string, type: 'info' | 'alert' | 'success' = 'info') => {
    setNotificationToast({ message, type });
    setTimeout(() => setNotificationToast(null), 4500);
  };

  // Compute Topological Metrics
  const metricsMap = useMemo(() => {
    return computeGraphMetrics(currentNodes, currentEdges);
  }, [currentNodes, currentEdges]);

  // Compute Mitigation ROI Rankings
  const mitigationActions = useMemo(() => {
    return calculateMitigationROI(currentNodes, currentEdges, metricsMap);
  }, [currentNodes, currentEdges, metricsMap]);

  // Run simulation step
  const simulationState = useMemo<SimulationState>(() => {
    return runSimulationStep(
      simConfig,
      simConfig.timeHorizonHours,
      currentNodes,
      currentEdges,
      appliedMitigations
    );
  }, [simConfig, currentNodes, currentEdges, appliedMitigations]);

  // Handle mitigation toggle
  const handleToggleMitigation = useCallback((actionId: string) => {
    setAppliedMitigations(prev => {
      const exists = prev.includes(actionId);
      const next = exists ? prev.filter(id => id !== actionId) : [...prev, actionId];
      showToast(
        exists ? 'Mitigation override deactivated' : 'Mitigation active: Centrality & Simulation recalculated',
        exists ? 'info' : 'success'
      );
      return next;
    });
  }, []);

  const handleResetMitigations = () => {
    setAppliedMitigations([]);
    showToast('All simulated mitigations reverted to baseline', 'info');
  };

  // Trigger Simulated Advisory Webhook
  const handleTriggerWebhook = useCallback((advisory?: { title: string; packageName: string; severity: string; cvss: number }) => {
    const adv = advisory || {
      title: 'Zero-Day Remote Code Execution Advisory (CVE-2026-9041)',
      packageName: 'flatmap-stream',
      severity: 'CRITICAL',
      cvss: 9.8,
    };

    // Find the package in current nodes
    const targetPkg = currentNodes.find(n => n.name.includes(adv.packageName) || n.id.includes(adv.packageName));
    if (targetPkg) {
      setSimConfig(prev => ({
        ...prev,
        targetNodeId: targetPkg.id,
        scenario: 'malicious-patch',
        timeHorizonHours: 12,
      }));
      setActiveView('simulation');
      showToast(`Registry Webhook Ingested: ${adv.title} on ${targetPkg.name} (CVSS ${adv.cvss})`, 'alert');
    } else {
      showToast(`Webhook Advisory received for ${adv.packageName} (Ecosystem Delta Triggered)`, 'alert');
    }
  }, [currentNodes]);

  // Handle Ingesting Custom SBOM or Lockfile
  const handleImportCustomGraph = useCallback((nodes: DependencyNode[], edges: DependencyEdge[], name: string) => {
    const customDataset: EcosystemDataset = {
      id: `custom-${Date.now()}`,
      name: name,
      description: 'Imported Software Bill of Materials (SBOM) / Lockfile DAG graph.',
      primaryEcosystem: 'npm / Multi-Ecosystem',
      defaultSimulationTarget: nodes.find(n => n.type === 'package')?.id || nodes[0]?.id || '',
      nodes,
      edges,
    };

    setDatasets(prev => [customDataset, ...prev]);
    setSelectedDatasetId(customDataset.id);
    setCurrentNodes(nodes);
    setCurrentEdges(edges);
    setAppliedMitigations([]);
    setSimConfig(prev => ({
      ...prev,
      targetNodeId: customDataset.defaultSimulationTarget,
      timeHorizonHours: 0,
    }));
    setActiveView('graph');
    showToast(`Successfully ingested SBOM: Created ${nodes.length} nodes & ${edges.length} directed edges`, 'success');
  }, []);

  // Handle Counterfactual Sandbox Application
  const handleApplyCounterfactual = useCallback((overrideKey: string, nodeId: string) => {
    showToast(`Counterfactual Applied: Simulated ${overrideKey} policy on node ${nodeId}`, 'success');
  }, []);

  const selectedNode = useMemo(() => {
    return currentNodes.find(n => n.id === selectedNodeId) || null;
  }, [currentNodes, selectedNodeId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Application Header */}
      <Header
        datasets={datasets}
        selectedDatasetId={selectedDatasetId}
        onSelectDataset={handleSelectDataset}
        metricsMap={metricsMap}
        onOpenIngestion={() => setIsIngestionOpen(true)}
        onTriggerWebhook={() => handleTriggerWebhook()}
        activeView={activeView}
        onSelectView={setActiveView}
        hasAppliedMitigations={appliedMitigations.length > 0}
        onResetMitigations={handleResetMitigations}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Toast / Notification Banner */}
        {notificationToast && (
          <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between shadow-xl transition-all ${
            notificationToast.type === 'alert'
              ? 'bg-rose-950/80 border-rose-600/80 text-rose-200'
              : notificationToast.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-200'
              : 'bg-slate-900 border-slate-700 text-cyan-200'
          }`}>
            <div className="flex items-center gap-2">
              {notificationToast.type === 'alert' ? (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              ) : notificationToast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <span>{notificationToast.message}</span>
            </div>
            <button
              onClick={() => setNotificationToast(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View 1: Multi-Layer Directed Acyclic Graph (DAG) Canvas */}
        {activeView === 'graph' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">{currentDataset.name}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">{currentDataset.description}</span>
              </div>
              <div className="text-slate-400 font-mono">
                {currentNodes.length} Nodes ({currentNodes.filter(n => n.type === 'application').length} Apps, {currentNodes.filter(n => n.type === 'package').length} Packages) • {currentEdges.length} Edges
              </div>
            </div>

            <GraphCanvas
              nodes={currentNodes}
              edges={currentEdges}
              metricsMap={metricsMap}
              selectedNodeId={selectedNodeId}
              onSelectNode={(node) => setSelectedNodeId(node?.id || null)}
              simulationState={simConfig.timeHorizonHours > 0 ? simulationState : null}
              highlightCutVertices={highlightCutVertices}
              onToggleCutVertices={() => setHighlightCutVertices(!highlightCutVertices)}
              filterReachability={filterReachability}
              onToggleReachability={() => setFilterReachability(!filterReachability)}
              appliedMitigations={appliedMitigations}
            />

            {/* Canvas Quick Hint */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-1">
              <div>
                💡 Click any node to open in-depth inspection drawer • Drag nodes to customize DAG layout • Scroll to zoom
              </div>
              <div>
                Active Scenario: <span className="text-cyan-400 font-mono">{simConfig.scenario}</span> (T+{simConfig.timeHorizonHours}h)
              </div>
            </div>
          </div>
        )}

        {/* View 2: Structural Criticality & Centrality Analysis */}
        {activeView === 'structural' && (
          <MetricsPanel
            nodes={currentNodes}
            metricsMap={metricsMap}
            onSelectNode={(node) => setSelectedNodeId(node.id)}
            onOpenExplainability={(node) => setExplainNode(node)}
          />
        )}

        {/* View 3: Cascading Propagation Simulation Engine */}
        {activeView === 'simulation' && (
          <div className="space-y-6">
            <SimulationControls
              nodes={currentNodes}
              config={simConfig}
              onChangeConfig={setSimConfig}
              simulationState={simulationState}
              onRunStep={(hour) => setSimConfig(prev => ({ ...prev, timeHorizonHours: hour }))}
              onReset={() => setSimConfig(prev => ({ ...prev, timeHorizonHours: 0 }))}
              appliedMitigationsCount={appliedMitigations.length}
            />

            {/* Embedded Live Graph to observe propagation pulses */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                  <Network className="w-4 h-4" />
                  Live Topological Wave Monitor (T+{simConfig.timeHorizonHours} Hours)
                </span>
                <span>
                  Infected: {simulationState.infectedNodeIds.size} Nodes • Protected: {simulationState.lockfileProtectedNodeIds.size + simulationState.blockedNodeIds.size}
                </span>
              </div>

              <GraphCanvas
                nodes={currentNodes}
                edges={currentEdges}
                metricsMap={metricsMap}
                selectedNodeId={selectedNodeId}
                onSelectNode={(node) => setSelectedNodeId(node?.id || null)}
                simulationState={simulationState}
                highlightCutVertices={highlightCutVertices}
                onToggleCutVertices={() => setHighlightCutVertices(!highlightCutVertices)}
                filterReachability={filterReachability}
                onToggleReachability={() => setFilterReachability(!filterReachability)}
                appliedMitigations={appliedMitigations}
              />
            </div>
          </div>
        )}

        {/* View 4: Cut-Vertex Mitigation Ranking & Decision Engine */}
        {activeView === 'mitigation' && (
          <MitigationEngine
            mitigations={mitigationActions}
            onToggleMitigation={handleToggleMitigation}
            appliedMitigations={appliedMitigations}
          />
        )}
      </main>

      {/* Node Detail Drawer */}
      <NodeDetailDrawer
        node={selectedNode}
        metric={selectedNode ? metricsMap.get(selectedNode.id) : undefined}
        onClose={() => setSelectedNodeId(null)}
        onOpenExplainability={(node) => setExplainNode(node)}
        onSetAsSimulationTarget={(nodeId) => {
          setSimConfig(prev => ({ ...prev, targetNodeId: nodeId, timeHorizonHours: 0 }));
          setActiveView('simulation');
          showToast(`Set ${nodeId} as zero-patient for propagation simulation`, 'info');
        }}
        onApplyMitigation={(nodeId) => handleToggleMitigation(`cut-vertex-${nodeId}`)}
        isMitigated={appliedMitigations.some(m => m.includes(selectedNode?.id || ''))}
      />

      {/* Explainability & Attack Tree Modal */}
      {explainNode && (
        <ExplainabilityModal
          node={explainNode}
          nodes={currentNodes}
          edges={currentEdges}
          metricsMap={metricsMap}
          onClose={() => setExplainNode(null)}
          onApplyCounterfactual={handleApplyCounterfactual}
        />
      )}

      {/* Data Ingestion & SBOM Modal */}
      {isIngestionOpen && (
        <IngestionModal
          onClose={() => setIsIngestionOpen(false)}
          onImportCustomGraph={handleImportCustomGraph}
          onTriggerSimulatedWebhook={handleTriggerWebhook}
        />
      )}

      {/* Global Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        DependencyPulse • Intelligent Directed Network Supply Chain Criticality & Blast Radius Engine • OpenSSF & deps.dev Compatible
      </footer>
    </div>
  );
}
