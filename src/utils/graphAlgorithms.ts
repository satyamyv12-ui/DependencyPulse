import { DependencyNode, DependencyEdge, NodeMetrics, MitigationAction } from '../types';

/**
 * Calculates topological structural criticality metrics for all nodes in the DAG
 * Edge convention: source -> target means "source requires target"
 * Therefore, vulnerability or compromise propagates from target -> source (upwards to apps)
 */
export function computeGraphMetrics(
  nodes: DependencyNode[],
  edges: DependencyEdge[]
): Map<string, NodeMetrics> {
  const nodeMap = new Map<string, DependencyNode>(nodes.map(n => [n.id, n]));
  
  // Build adjacency lists
  // outEdges: who does this node depend on? (source -> targets)
  // inEdges: who depends on this node? (reverse: target -> sources)
  const dependentsMap = new Map<string, string[]>(); // node -> list of parents/consumers
  const dependenciesMap = new Map<string, string[]>(); // node -> list of children/dependencies

  nodes.forEach(n => {
    dependentsMap.set(n.id, []);
    dependenciesMap.set(n.id, []);
  });

  edges.forEach(e => {
    // source depends on target
    dependenciesMap.get(e.source)?.push(e.target);
    dependentsMap.get(e.target)?.push(e.source);
  });

  // 1. REVERSE REACHABILITY BLAST RADIUS
  // For each node, traverse dependents upwards to find all reachable 'application' nodes
  const blastRadiusMap = new Map<string, { totalApps: number; tier1Count: number; affectedAppIds: string[] }>();

  nodes.forEach(node => {
    if (node.type === 'application') {
      blastRadiusMap.set(node.id, { totalApps: 1, tier1Count: node.tier === 'tier-1' ? 1 : 0, affectedAppIds: [node.id] });
      return;
    }

    const visited = new Set<string>();
    const queue: string[] = [node.id];
    visited.add(node.id);
    const affectedApps = new Set<string>();

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const parents = dependentsMap.get(currId) || [];

      for (const parentId of parents) {
        if (!visited.has(parentId)) {
          visited.add(parentId);
          const parentNode = nodeMap.get(parentId);
          if (parentNode?.type === 'application') {
            affectedApps.add(parentId);
          }
          queue.push(parentId);
        }
      }
    }

    const appList = Array.from(affectedApps).map(id => nodeMap.get(id)).filter(Boolean) as DependencyNode[];
    const tier1 = appList.filter(a => a.tier === 'tier-1').length;
    blastRadiusMap.set(node.id, {
      totalApps: appList.length,
      tier1Count: tier1,
      affectedAppIds: Array.from(affectedApps)
    });
  });

  // 2. KEYSTONE SCORE (Modified PageRank over dependency DAG)
  // Applications have initial seed authority based on Tier.
  // Authority flows DOWN to the dependencies they rely on.
  const keystoneScores = new Map<string, number>();
  const totalNodes = nodes.length || 1;

  // Initialize scores: applications get base score from Tier, packages get baseline
  nodes.forEach(node => {
    if (node.type === 'application') {
      const tierWeight = node.tier === 'tier-1' ? 50 : node.tier === 'tier-2' ? 30 : 15;
      keystoneScores.set(node.id, tierWeight);
    } else {
      keystoneScores.set(node.id, 5);
    }
  });

  // Run 15 PageRank-style power iterations
  const damping = 0.85;
  for (let iter = 0; iter < 15; iter++) {
    const nextScores = new Map<string, number>();
    nodes.forEach(n => nextScores.set(n.id, (1 - damping) * 5));

    nodes.forEach(node => {
      const currentScore = keystoneScores.get(node.id) || 5;
      const deps = dependenciesMap.get(node.id) || [];
      if (deps.length > 0) {
        const share = (currentScore * damping) / deps.length;
        deps.forEach(depId => {
          nextScores.set(depId, (nextScores.get(depId) || 0) + share);
        });
      } else {
        // Distribute to all nodes evenly
        const share = (currentScore * damping) / totalNodes;
        nodes.forEach(n => {
          nextScores.set(n.id, (nextScores.get(n.id) || 0) + share);
        });
      }
    });

    // Update
    nextScores.forEach((val, key) => keystoneScores.set(key, val));
  }

  // Normalize Keystone Scores to 0 - 100
  let maxKeystone = 0.001;
  keystoneScores.forEach(val => { if (val > maxKeystone) maxKeystone = val; });
  keystoneScores.forEach((val, key) => {
    keystoneScores.set(key, Math.min(100, Math.round((val / maxKeystone) * 100)));
  });

  // 3. BETWEENNESS CENTRALITY (Brandes algorithm simplified for DAG)
  const betweennessMap = new Map<string, number>();
  nodes.forEach(n => betweennessMap.set(n.id, 0));

  nodes.forEach(sNode => {
    const S: string[] = [];
    const P = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const d = new Map<string, number>();
    const delta = new Map<string, number>();

    nodes.forEach(w => {
      P.set(w.id, []);
      sigma.set(w.id, 0);
      d.set(w.id, -1);
      delta.set(w.id, 0);
    });

    sigma.set(sNode.id, 1);
    d.set(sNode.id, 0);
    const Q: string[] = [sNode.id];

    while (Q.length > 0) {
      const v = Q.shift()!;
      S.push(v);
      const neighbors = dependenciesMap.get(v) || [];

      for (const w of neighbors) {
        if (d.get(w)! < 0) {
          Q.push(w);
          d.set(w, d.get(v)! + 1);
        }
        if (d.get(w) === d.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          P.get(w)!.push(v);
        }
      }
    }

    while (S.length > 0) {
      const w = S.pop()!;
      for (const v of P.get(w)!) {
        const c = (sigma.get(v)! / (sigma.get(w)! || 1)) * (1 + delta.get(w)!);
        delta.set(v, delta.get(v)! + c);
      }
      if (w !== sNode.id) {
        betweennessMap.set(w, betweennessMap.get(w)! + delta.get(w)!);
      }
    }
  });

  // Normalize betweenness
  let maxBetweenness = 0.001;
  betweennessMap.forEach(val => { if (val > maxBetweenness) maxBetweenness = val; });
  betweennessMap.forEach((val, key) => {
    betweennessMap.set(key, Math.round((val / maxBetweenness) * 100) / 100);
  });

  // 4. MULTI-FACTOR ENVIRONMENTAL DOWNSTREAM IMPACT (EDI)
  const result = new Map<string, NodeMetrics>();
  const totalAppsCount = nodes.filter(n => n.type === 'application').length || 1;

  nodes.forEach(node => {
    const blast = blastRadiusMap.get(node.id) || { totalApps: 0, tier1Count: 0, affectedAppIds: [] };
    const keystone = keystoneScores.get(node.id) || 0;
    const betweenness = betweennessMap.get(node.id) || 0;

    // Pillar 1: Topological Reach (0 - 25)
    // Based on ratio of internal apps affected + Keystone PageRank
    const reachRatio = Math.min(1, blast.totalApps / totalAppsCount);
    const topologicalScore = Math.min(25, (reachRatio * 15) + ((keystone / 100) * 10));

    // Pillar 2: Asset Criticality (0 - 25)
    // How critical are the affected workloads?
    let assetScore = 5;
    if (node.type === 'application') {
      assetScore = node.tier === 'tier-1' ? 25 : node.tier === 'tier-2' ? 18 : 10;
      if (node.dataClassifications?.includes('PCI-DSS') || node.dataClassifications?.includes('Financial')) {
        assetScore = Math.min(25, assetScore + 5);
      }
    } else {
      const appObjects = blast.affectedAppIds.map(id => nodeMap.get(id)).filter(Boolean) as DependencyNode[];
      const hasPCI = appObjects.some(a => a.dataClassifications?.includes('PCI-DSS') || a.dataClassifications?.includes('Financial'));
      const hasPII = appObjects.some(a => a.dataClassifications?.includes('PII'));
      const tier1Proportion = blast.totalApps > 0 ? blast.tier1Count / blast.totalApps : 0;
      assetScore = Math.min(25, (tier1Proportion * 15) + (hasPCI ? 6 : hasPII ? 4 : 2) + Math.min(4, blast.tier1Count * 1.5));
    }

    // Pillar 3: Privilege and Capability (0 - 25)
    let privScore = 4;
    if (node.hasInstallScripts) privScore += 9; // lifecycle execution
    if (node.sensitiveCapabilities?.includes('process:exec')) privScore += 5;
    if (node.sensitiveCapabilities?.includes('net:outbound')) privScore += 4;
    if (node.sensitiveCapabilities?.includes('env:read')) privScore += 3;
    if (node.sensitiveCapabilities?.includes('fs:write')) privScore += 4;
    privScore = Math.min(25, privScore);

    // Pillar 4: Substitutability (0 - 25)
    // How tightly coupled is the codebase?
    let subScore = 8;
    if (node.substitutability === 'architectural-core') subScore = 24;
    else if (node.substitutability === 'moderate') subScore = 15;
    else subScore = 6;

    // Chokepoint Score (0 - 100)
    let chokeScore = 0;
    if (node.type === 'package') {
      if (node.isSingleMaintainer) chokeScore += 45;
      if (!node.maintainer2FA) chokeScore += 20;
      if (!node.maintainerKeySigned) chokeScore += 15;
      if (blast.totalApps >= 3) chokeScore += 20;
      chokeScore = Math.min(100, chokeScore);
    }

    // Total EDI
    const ediTotal = Math.min(100, Math.round(topologicalScore + assetScore + privScore + subScore));

    // Traditional CVSS max
    const maxCvss = node.cves && node.cves.length > 0 
      ? Math.max(...node.cves.map(c => c.cvss))
      : 0;

    // Discrepancy shows where CVSS is low (e.g. 0 or 3.5) but EDI is severe (85+)
    const scaledCvss = maxCvss * 10;
    const discrepancy = Math.max(0, ediTotal - scaledCvss);

    result.set(node.id, {
      nodeId: node.id,
      reverseReachabilityBlastRadius: blast.totalApps,
      downstreamTier1Count: blast.tier1Count,
      betweennessCentrality: betweenness,
      keystoneScore: keystone,
      maintainerChokepointScore: chokeScore,
      topologicalReachScore: Math.round(topologicalScore * 10) / 10,
      assetCriticalityScore: Math.round(assetScore * 10) / 10,
      privilegeCapabilityScore: Math.round(privScore * 10) / 10,
      substitutabilityScore: Math.round(subScore * 10) / 10,
      ediScore: ediTotal,
      traditionalCvssMax: maxCvss,
      cvssEdiDiscrepancy: Math.round(discrepancy * 10) / 10,
    });
  });

  return result;
}

/**
 * Identifies Cut-Vertices (articulation points) in the dependency graph
 * where introducing an override, pinned version, or sandbox neutralizes risk
 * for the highest number of downstream applications per engineering effort.
 */
export function calculateMitigationROI(
  nodes: DependencyNode[],
  edges: DependencyEdge[],
  metricsMap: Map<string, NodeMetrics>
): MitigationAction[] {
  const actions: MitigationAction[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Find intermediate packages that act as bridge wrappers
  const packages = nodes.filter(n => n.type === 'package');

  packages.forEach(pkg => {
    const metric = metricsMap.get(pkg.id);
    if (!metric) return;

    // Check if package has significant downstream blast radius
    if (metric.reverseReachabilityBlastRadius >= 2 || metric.ediScore >= 55 || metric.maintainerChokepointScore >= 60) {
      const isCutVertexCandidate = metric.betweennessCentrality > 0.15 || metric.reverseReachabilityBlastRadius >= 3;
      
      // Calculate Service Criticality Multiplier
      const criticalityMult = metric.downstreamTier1Count > 0 ? 3.0 : 1.5;

      // 1. Cut-Vertex Pin / Override Action
      if (isCutVertexCandidate) {
        const effortHours = pkg.substitutability === 'architectural-core' ? 6 : 2;
        const blastReduction = Math.round(metric.reverseReachabilityBlastRadius * 0.85 * 10) / 10;
        const roi = Math.round(((blastReduction * criticalityMult) / effortHours) * 10) / 10;

        actions.push({
          id: `cut-vertex-${pkg.id}`,
          targetNodeId: pkg.id,
          targetNodeName: pkg.name,
          title: `Cut-Vertex Override: Pin & Shim at Upstream Wrapper`,
          type: 'cut-vertex-pin',
          category: 'tactical',
          isCutVertex: true,
          blastRadiusReduction: blastReduction,
          serviceCriticalityMultiplier: criticalityMult,
          effortHours,
          roiScore: roi,
          description: `Neutralize risk for ${metric.reverseReachabilityBlastRadius} downstream internal workloads simultaneously by overriding this bridge dependency with a cryptographically pinned checksum in root lockfiles.`,
          commandSnippet: `// package.json overrides\n"overrides": {\n  "${pkg.name}": "${pkg.version}-hardened.1"\n}`,
          applied: false,
        });
      }

      // 2. Tactical eBPF / Container Sandbox Action
      if (pkg.sensitiveCapabilities?.includes('net:outbound') || pkg.hasInstallScripts) {
        const effortHours = 1.5;
        const blastReduction = Math.round(metric.reverseReachabilityBlastRadius * 0.7 * 10) / 10;
        const roi = Math.round(((blastReduction * criticalityMult) / effortHours) * 10) / 10;

        actions.push({
          id: `ebpf-${pkg.id}`,
          targetNodeId: pkg.id,
          targetNodeName: pkg.name,
          title: `Tactical eBPF Egress Filter & Script Sandbox`,
          type: 'tactical-ebpf',
          category: 'tactical',
          isCutVertex: false,
          blastRadiusReduction: blastReduction,
          serviceCriticalityMultiplier: criticalityMult,
          effortHours,
          roiScore: roi,
          description: `Apply immediate zero-code container policy blocking outbound TCP/UDP socket calls and disabling lifecycle install scripts (--ignore-scripts).`,
          commandSnippet: `cilium egress-gateway apply --node ${pkg.name} --block-external-egress`,
          applied: false,
        });
      }

      // 3. Strategic Replacement Action
      if (pkg.isSingleMaintainer || metric.ediScore >= 75) {
        const effortHours = pkg.substitutability === 'architectural-core' ? 16 : 8;
        const blastReduction = metric.reverseReachabilityBlastRadius;
        const roi = Math.round(((blastReduction * criticalityMult) / effortHours) * 10) / 10;

        actions.push({
          id: `replace-${pkg.id}`,
          targetNodeId: pkg.id,
          targetNodeName: pkg.name,
          title: `Strategic Migration to Hardened Multi-Maintainer Fork`,
          type: 'strategic-replace',
          category: 'strategic',
          isCutVertex: false,
          blastRadiusReduction: blastReduction,
          serviceCriticalityMultiplier: criticalityMult,
          effortHours,
          roiScore: roi,
          description: `Vendor or migrate away from single-maintainer dependency to an OpenSSF Best Practices badged, sigstore-attested replacement.`,
          commandSnippet: `npm uninstall ${pkg.name} && npm install @enterprise-hardened/${pkg.name}`,
          applied: false,
        });
      }
    }
  });

  // Sort by highest ROI first
  return actions.sort((a, b) => b.roiScore - a.roiScore);
}
