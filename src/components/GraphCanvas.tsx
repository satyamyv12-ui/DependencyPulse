import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  ShieldCheck, 
  AlertTriangle, 
  Cpu, 
  Layers, 
  Terminal, 
  FileCode, 
  Key, 
  Lock, 
  Unlock, 
  Sparkles,
  Search,
  Eye,
  Crosshair,
  Filter
} from 'lucide-react';
import { DependencyNode, DependencyEdge, NodeMetrics } from '../types';
import { SimulationState } from '../utils/propagationEngine';

interface GraphCanvasProps {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  metricsMap: Map<string, NodeMetrics>;
  selectedNodeId: string | null;
  onSelectNode: (node: DependencyNode | null) => void;
  simulationState?: SimulationState | null;
  highlightCutVertices: boolean;
  onToggleCutVertices: () => void;
  filterReachability: boolean;
  onToggleReachability: () => void;
  appliedMitigations: string[];
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  metricsMap,
  selectedNodeId,
  onSelectNode,
  simulationState,
  highlightCutVertices,
  onToggleCutVertices,
  filterReachability,
  onToggleReachability,
  appliedMitigations,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.95);
  const [pan, setPan] = useState({ x: 30, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedPathEdges, setFocusedPathEdges] = useState<Set<string>>(new Set());

  // Initialize and update node positions
  useEffect(() => {
    const posMap = new Map<string, { x: number; y: number }>();
    nodes.forEach((node, idx) => {
      if (node.x !== undefined && node.y !== undefined) {
        posMap.set(node.id, { x: node.x, y: node.y });
      } else {
        // Fallback grid placement if coordinates not set
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        posMap.set(node.id, { x: 120 + col * 240, y: 80 + row * 160 });
      }
    });
    setNodePositions(posMap);
  }, [nodes]);

  // Compute selected node's upstream & downstream path
  useEffect(() => {
    if (!selectedNodeId) {
      setFocusedPathEdges(new Set());
      return;
    }

    const pathEdges = new Set<string>();
    // Collect edges connected to selected node
    edges.forEach(e => {
      if (e.source === selectedNodeId || e.target === selectedNodeId) {
        pathEdges.add(e.id);
      }
    });
    setFocusedPathEdges(pathEdges);
  }, [selectedNodeId, edges]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking canvas background
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'canvas-bg') {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (draggedNodeId) {
      // Dragging a specific node
      const currentPos = nodePositions.get(draggedNodeId) || { x: 0, y: 0 };
      const newX = currentPos.x + e.movementX / zoom;
      const newY = currentPos.y + e.movementY / zoom;
      setNodePositions(prev => new Map(prev).set(draggedNodeId, { x: newX, y: newY }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom(prev => Math.min(2.5, Math.max(0.4, prev * zoomFactor)));
  };

  const resetView = () => {
    setZoom(0.95);
    setPan({ x: 30, y: 30 });
  };

  // Filter nodes matching search
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodes;
    const q = searchQuery.toLowerCase();
    return nodes.filter(n => n.name.toLowerCase().includes(q) || n.maintainer?.toLowerCase().includes(q));
  }, [nodes, searchQuery]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[640px] lg:h-[720px] bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden select-none shadow-2xl"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Background Grid Pattern */}
      <div 
        id="canvas-bg"
        className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-auto"
      />

      {/* Floating Canvas HUD Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {/* Search filter input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search package, app, or maintainer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-56 sm:w-64"
          />
        </div>

        {/* Highlight Cut-Vertices Toggle */}
        <button
          onClick={onToggleCutVertices}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all backdrop-blur-md border ${
            highlightCutVertices
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/20'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Cut-Vertices</span>
        </button>

        {/* Dead-Code Reachability Filter Toggle */}
        <button
          onClick={onToggleReachability}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all backdrop-blur-md border ${
            filterReachability
              ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Reachability Filter</span>
        </button>
      </div>

      {/* Floating Zoom Controls & Status */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-lg">
        <button
          onClick={() => setZoom(prev => Math.min(2.5, prev * 1.15))}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.4, prev * 0.85))}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="px-2 text-[11px] font-mono text-slate-400 border-l border-slate-800">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Bottom Legend */}
      <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-4 px-3.5 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
          <span>Application</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span>Direct Dep</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Transitive Bridge</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/40 animate-pulse" />
          <span>Compromised / Chokepoint</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/40" />
          <span>Optimal Cut-Vertex</span>
        </div>
      </div>

      {/* SVG DAG Canvas */}
      <svg
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        <defs>
          {/* Arrowhead Markers */}
          <marker
            id="arrow-cyan"
            viewBox="0 0 10 10"
            refX="24"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#22d3ee" />
          </marker>

          <marker
            id="arrow-amber"
            viewBox="0 0 10 10"
            refX="24"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
          </marker>

          <marker
            id="arrow-slate"
            viewBox="0 0 10 10"
            refX="24"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
          </marker>

          <marker
            id="arrow-rose"
            viewBox="0 0 10 10"
            refX="24"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
          </marker>

          <marker
            id="arrow-emerald"
            viewBox="0 0 10 10"
            refX="24"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
          </marker>

          {/* Gradients for Nodes */}
          <linearGradient id="appGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="cutVertexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>

          <linearGradient id="infectedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#881337" />
            <stop offset="100%" stopColor="#4c0519" />
          </linearGradient>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          
          {/* 1. RENDER EDGES */}
          {edges.map(edge => {
            const sourcePos = nodePositions.get(edge.source);
            const targetPos = nodePositions.get(edge.target);
            if (!sourcePos || !targetPos) return null;

            // Check if pruned by dead-code reachability filter
            const isPruned = filterReachability && edge.reachability === 'unreachable-dead-code';
            if (isPruned) return null;

            // Is active in propagation simulation?
            const isPulseActive = simulationState?.activePulseEdgeIds.has(edge.id);
            const isFocused = focusedPathEdges.has(edge.id);
            const isCutEdge = highlightCutVertices && edge.isCutVertexEdge;

            // Compute curved path for DAG aesthetics
            const dx = targetPos.x - sourcePos.x;
            const dy = targetPos.y - sourcePos.y;
            const cx1 = sourcePos.x;
            const cy1 = sourcePos.y + dy * 0.5;
            const cx2 = targetPos.x;
            const cy2 = sourcePos.y + dy * 0.5;
            const pathD = `M ${sourcePos.x} ${sourcePos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${targetPos.x} ${targetPos.y}`;

            // Determine edge stroke styling
            let strokeColor = '#475569';
            let strokeWidth = 1.5;
            let strokeDasharray = 'none';
            let markerEnd = 'url(#arrow-slate)';

            if (isPulseActive) {
              strokeColor = '#f43f5e';
              strokeWidth = 3;
              strokeDasharray = '6,4';
              markerEnd = 'url(#arrow-rose)';
            } else if (isCutEdge) {
              strokeColor = '#10b981';
              strokeWidth = 2.5;
              strokeDasharray = '4,3';
              markerEnd = 'url(#arrow-emerald)';
            } else if (edge.type === 'direct-runtime') {
              strokeColor = '#0ea5e9';
              strokeWidth = 2;
              markerEnd = 'url(#arrow-cyan)';
            } else if (edge.type === 'build-ci') {
              strokeColor = '#f59e0b';
              strokeWidth = 1.8;
              strokeDasharray = '4,4';
              markerEnd = 'url(#arrow-amber)';
            } else if (edge.type === 'transitive-runtime') {
              strokeColor = '#64748b';
              strokeWidth = 1.5;
              strokeDasharray = '5,4';
            }

            if (isFocused) {
              strokeWidth += 1.5;
              strokeColor = '#38bdf8';
            }

            return (
              <g key={edge.id} className="transition-opacity duration-300">
                {/* Glow underlay if active pulse */}
                {isPulseActive && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="8"
                    strokeOpacity="0.3"
                    className="animate-pulse"
                  />
                )}

                {/* Primary Edge Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  markerEnd={markerEnd}
                  className={isPulseActive ? 'animate-[dash_1s_linear_infinite]' : ''}
                />

                {/* Permission Scope badge on edge if present */}
                {edge.permissionScopes.length > 0 && (
                  <g transform={`translate(${(sourcePos.x + targetPos.x) / 2}, ${(sourcePos.y + targetPos.y) / 2})`}>
                    <rect
                      x="-20"
                      y="-8"
                      width="40"
                      height="16"
                      rx="4"
                      fill="#0f172a"
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {edge.permissionScopes[0]?.replace(':exec', '!').replace('net:', '🌐')}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 2. RENDER NODES */}
          {filteredNodes.map(node => {
            const pos = nodePositions.get(node.id) || { x: 100, y: 100 };
            const metric = metricsMap.get(node.id);
            const isSelected = selectedNodeId === node.id;
            const isInfected = simulationState?.infectedNodeIds.has(node.id);
            const isBlocked = simulationState?.blockedNodeIds.has(node.id) || appliedMitigations.some(m => m.includes(node.id));
            const isPruned = simulationState?.reachabilityPrunedNodeIds.has(node.id);
            const isLockfileProtected = simulationState?.lockfileProtectedNodeIds.has(node.id);
            const isCutVertex = highlightCutVertices && (metric?.betweennessCentrality ?? 0) > 0.15;

            // Dimensions and shape
            const width = node.type === 'application' ? 180 : node.type === 'maintainer' ? 170 : 160;
            const height = node.type === 'application' ? 68 : node.type === 'maintainer' ? 56 : 64;

            // Severity color for packages
            const edi = metric?.ediScore ?? 50;
            const ediColor = edi >= 75 ? '#f43f5e' : edi >= 50 ? '#f59e0b' : '#10b981';

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x - width / 2}, ${pos.y - height / 2})`}
                className="cursor-pointer group"
                onClick={() => onSelectNode(node)}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggedNodeId(node.id);
                }}
              >
                {/* Aura for infected or cut-vertex */}
                {isInfected && (
                  <rect
                    x="-6"
                    y="-6"
                    width={width + 12}
                    height={height + 12}
                    rx="16"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="3"
                    className="animate-pulse"
                    strokeOpacity="0.8"
                  />
                )}

                {isCutVertex && !isInfected && (
                  <rect
                    x="-5"
                    y="-5"
                    width={width + 10}
                    height={height + 10}
                    rx="16"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeDasharray="4,2"
                    strokeOpacity="0.8"
                  />
                )}

                {/* Node Body Card */}
                <rect
                  x="0"
                  y="0"
                  width={width}
                  height={height}
                  rx={node.type === 'application' ? 12 : node.type === 'maintainer' ? 24 : 12}
                  fill={
                    isInfected 
                      ? 'url(#infectedGradient)'
                      : isCutVertex 
                      ? 'url(#cutVertexGradient)'
                      : node.type === 'application'
                      ? 'url(#appGradient)'
                      : '#090d16'
                  }
                  stroke={
                    isSelected
                      ? '#38bdf8'
                      : isInfected
                      ? '#f43f5e'
                      : isBlocked
                      ? '#3b82f6'
                      : isCutVertex
                      ? '#10b981'
                      : node.type === 'application'
                      ? '#4338ca'
                      : '#1e293b'
                  }
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  className="transition-all duration-200 shadow-xl group-hover:stroke-slate-500"
                />

                {/* Top status indicator strip */}
                <rect
                  x="0"
                  y="0"
                  width={width}
                  height="3"
                  rx="1.5"
                  fill={
                    isInfected
                      ? '#f43f5e'
                      : node.type === 'application'
                      ? (node.tier === 'tier-1' ? '#6366f1' : '#38bdf8')
                      : ediColor
                  }
                />

                {/* Node Title and Ecosystem */}
                <text
                  x="14"
                  y="22"
                  fill="#f1f5f9"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="monospace"
                  className="pointer-events-none"
                >
                  {node.name.length > 18 ? node.name.substring(0, 16) + '…' : node.name}
                </text>

                {/* Subtitle / Version / Maintainer */}
                <text
                  x="14"
                  y="38"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  className="pointer-events-none"
                >
                  {node.type === 'application'
                    ? `${node.runtimeEnv || 'App'} • ${node.version}`
                    : node.type === 'maintainer'
                    ? (node.version || 'Maintainer')
                    : `${node.ecosystem}:${node.version}`}
                </text>

                {/* Badges / Metrics inside Card */}
                {node.type === 'package' && (
                  <g transform={`translate(${width - 46}, 12)`}>
                    {/* EDI Score Pill */}
                    <rect
                      x="0"
                      y="0"
                      width="38"
                      height="20"
                      rx="6"
                      fill="#0f172a"
                      stroke={ediColor}
                      strokeWidth="1"
                    />
                    <text
                      x="19"
                      y="14"
                      textAnchor="middle"
                      fill={ediColor}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {edi}
                    </text>
                  </g>
                )}

                {node.type === 'application' && (
                  <g transform={`translate(${width - 54}, 12)`}>
                    {/* Tier badge */}
                    <rect
                      x="0"
                      y="0"
                      width="46"
                      height="18"
                      rx="4"
                      fill={node.tier === 'tier-1' ? '#312e81' : '#1e293b'}
                      stroke={node.tier === 'tier-1' ? '#6366f1' : '#475569'}
                      strokeWidth="1"
                    />
                    <text
                      x="23"
                      y="13"
                      textAnchor="middle"
                      fill={node.tier === 'tier-1' ? '#c7d2fe' : '#94a3b8'}
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {node.tier?.toUpperCase()}
                    </text>
                  </g>
                )}

                {/* Bottom Attribute Chips */}
                <g transform="translate(14, 46)">
                  {node.type === 'application' ? (
                    <text fill="#64748b" fontSize="9" fontWeight="500">
                      🔒 {node.lockfileStatus === 'pinned-sha512' ? 'Pinned sha512' : 'Floating range'}
                    </text>
                  ) : node.type === 'maintainer' ? (
                    <text fill="#a855f7" fontSize="9" fontWeight="500">
                      {node.maintainer2FA ? '🛡️ 2FA Verified' : '⚠️ No 2FA (Risk)'}
                    </text>
                  ) : (
                    <g className="flex items-center">
                      <text fill="#64748b" fontSize="9">
                        Blast: <tspan fill="#e2e8f0" fontWeight="bold">{metric?.reverseReachabilityBlastRadius ?? 0} apps</tspan>
                      </text>
                      {node.isSingleMaintainer && (
                        <text x="66" fill="#f59e0b" fontSize="8" fontWeight="bold">
                          • Solo
                        </text>
                      )}
                      {node.hasInstallScripts && (
                        <text x="96" fill="#f43f5e" fontSize="8" fontWeight="bold">
                          • Script
                        </text>
                      )}
                    </g>
                  )}
                </g>

                {/* Status Badges Overlay (Infected / Blocked / Shield) */}
                {isInfected && (
                  <g transform={`translate(${width - 12}, -6)`}>
                    <circle r="9" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                      !
                    </text>
                  </g>
                )}

                {isBlocked && (
                  <g transform={`translate(${width - 12}, -6)`}>
                    <circle r="9" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9">
                      🛡️
                    </text>
                  </g>
                )}

                {isLockfileProtected && (
                  <g transform={`translate(${width - 12}, -6)`}>
                    <circle r="9" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9">
                      🔒
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
