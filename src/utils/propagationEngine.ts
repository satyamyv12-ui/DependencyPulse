import { DependencyNode, DependencyEdge, SimulationConfig, SimulationStepResult, DataClassification } from '../types';

export interface SimulationState {
  currentHour: number;
  infectedNodeIds: Set<string>;
  blockedNodeIds: Set<string>;
  reachabilityPrunedNodeIds: Set<string>;
  lockfileProtectedNodeIds: Set<string>;
  activePulseEdgeIds: Set<string>;
  stealthExfiltrations: string[];
  exposedData: Set<DataClassification>;
  timelineHistory: SimulationStepResult[];
}

/**
 * Runs a step-by-step propagation simulation over time
 */
export function runSimulationStep(
  config: SimulationConfig,
  currentHour: number,
  nodes: DependencyNode[],
  edges: DependencyEdge[],
  appliedMitigations: string[] = []
): SimulationState {
  const nodeMap = new Map<string, DependencyNode>(nodes.map(n => [n.id, n]));
  
  // Dependents: who depends on whom (target -> parents)
  const dependentsMap = new Map<string, { parentId: string; edge: DependencyEdge }[]>();
  nodes.forEach(n => dependentsMap.set(n.id, []));
  edges.forEach(e => {
    dependentsMap.get(e.target)?.push({ parentId: e.source, edge: e });
  });

  const infectedNodeIds = new Set<string>();
  const blockedNodeIds = new Set<string>();
  const reachabilityPrunedNodeIds = new Set<string>();
  const lockfileProtectedNodeIds = new Set<string>();
  const activePulseEdgeIds = new Set<string>();
  const stealthExfiltrations: string[] = [];
  const exposedData = new Set<DataClassification>();

  // Target zero patient
  const patientZero = nodeMap.get(config.targetNodeId);
  if (!patientZero) {
    return {
      currentHour,
      infectedNodeIds,
      blockedNodeIds,
      reachabilityPrunedNodeIds,
      lockfileProtectedNodeIds,
      activePulseEdgeIds,
      stealthExfiltrations,
      exposedData,
      timelineHistory: [],
    };
  }

  // Initial infection
  infectedNodeIds.add(patientZero.id);

  // Check if mitigation is applied to target
  if (appliedMitigations.some(m => m.includes(patientZero.id))) {
    blockedNodeIds.add(patientZero.id);
  }

  // Breadth-first wave propagation across time
  // Each hour allows the infection to travel up to 1-2 hops depending on bot speed
  // Max propagation depth is proportional to hours elapsed: depth = Math.floor(currentHour / 6) + 1
  const maxDepth = Math.max(1, Math.min(8, Math.floor(currentHour / 8) + 1));
  
  // Queue: [nodeId, currentHopDepth, hoursSinceInfection]
  const queue: { nodeId: string; depth: number }[] = [{ nodeId: patientZero.id, depth: 0 }];
  const visited = new Set<string>([patientZero.id]);

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    const parents = dependentsMap.get(nodeId) || [];

    for (const { parentId, edge } of parents) {
      const parentNode = nodeMap.get(parentId);
      if (!parentNode) continue;

      // 1. Check if an applied cut-vertex / mitigation blocks this edge or parent
      const isMitigated = appliedMitigations.some(m => m.includes(parentId) || m.includes(nodeId));
      if (isMitigated) {
        blockedNodeIds.add(parentId);
        continue;
      }

      // 2. Propagation Vector Check (Build-Time vs Runtime)
      if (config.propagationVector === 'build-time') {
        // Build-time vector: only affects CI/CD if node has install scripts or edge is build-ci
        const isBuildVulnerable = (nodeMap.get(nodeId)?.hasInstallScripts) || edge.type === 'build-ci';
        if (!isBuildVulnerable && parentNode.type !== 'application') {
          // dampened propagation for pure runtime packages in build-time vector
          continue;
        }
      } else if (config.propagationVector === 'runtime') {
        // Runtime vector: doesn't affect packages that are purely build-ci tools
        if (edge.type === 'build-ci') {
          continue;
        }
      }

      // 3. Reachability Pruning Dynamics
      if (config.reachabilityPruningActive) {
        if (edge.reachability === 'unreachable-dead-code' || parentNode.reachability === 'unreachable-dead-code') {
          reachabilityPrunedNodeIds.add(parentId);
          // Blocked due to dead-code elimination / uncalled AST path!
          continue;
        }
      }

      // 4. Lockfile Resistance Dynamics
      if (config.lockfileResistanceActive && parentNode.type === 'application') {
        if (parentNode.lockfileStatus === 'pinned-sha512') {
          // Pinned lockfiles with integrity hashes reject floating updates
          // Needs Renovate bot PR to absorb (requires at least 48 hours to merge)
          if (currentHour < 48) {
            lockfileProtectedNodeIds.add(parentId);
            continue;
          }
        }
      }

      // If passed all filters, node is infected
      infectedNodeIds.add(parentId);
      activePulseEdgeIds.add(edge.id);

      if (parentNode.type === 'application') {
        // Record data exposure
        parentNode.dataClassifications?.forEach(c => exposedData.add(c));
        
        if (parentNode.tier === 'tier-1') {
          stealthExfiltrations.push(
            `[${parentNode.name}] Credential exfiltration attempt on live ${parentNode.runtimeEnv} cluster (PCI/PII boundary crossed).`
          );
        }
      }

      if (!visited.has(parentId)) {
        visited.add(parentId);
        queue.push({ nodeId: parentId, depth: depth + 1 });
      }
    }
  }

  // Calculate estimated financial impact
  const infectedApps = Array.from(infectedNodeIds).map(id => nodeMap.get(id)).filter(n => n?.type === 'application') as DependencyNode[];
  const tier1Count = infectedApps.filter(a => a.tier === 'tier-1').length;
  const tier2Count = infectedApps.filter(a => a.tier === 'tier-2').length;
  const estimatedCost = (tier1Count * 145000) + (tier2Count * 38000) + (infectedNodeIds.size * 2500);

  // Generate historical timeline points for the graph slider
  const history: SimulationStepResult[] = [];
  const hoursCheckpoints = [0, 6, 12, 24, 48, 72];

  hoursCheckpoints.forEach(h => {
    if (h <= currentHour) {
      const stepFraction = Math.min(1, h / (currentHour || 1));
      const appsCount = Math.round(infectedApps.length * stepFraction);
      const pkgCount = Math.max(1, Math.round((infectedNodeIds.size - infectedApps.length) * stepFraction));

      history.push({
        hour: h,
        newlyInfectedNodes: [],
        blockedNodes: Array.from(blockedNodeIds),
        stealthExploits: stealthExfiltrations.slice(0, 3),
        cumulativeInfectedApps: appsCount,
        cumulativeInfectedPackages: pkgCount,
        cumulativeDataExposure: Array.from(exposedData),
        estimatedCostUSD: Math.round(estimatedCost * stepFraction),
      });
    }
  });

  return {
    currentHour,
    infectedNodeIds,
    blockedNodeIds,
    reachabilityPrunedNodeIds,
    lockfileProtectedNodeIds,
    activePulseEdgeIds,
    stealthExfiltrations,
    exposedData,
    timelineHistory: history,
  };
}
