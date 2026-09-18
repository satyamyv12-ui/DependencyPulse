/**
 * DependencyPulse - Core Domain Types
 */

export type NodeType = 'package' | 'application' | 'maintainer';
export type Ecosystem = 'npm' | 'pypi' | 'maven' | 'crates' | 'golang';
export type AppTier = 'tier-1' | 'tier-2' | 'tier-3';
export type DataClassification = 'PCI-DSS' | 'PII' | 'Financial' | 'Internal' | 'Public';

export type EdgeType = 
  | 'direct-runtime' 
  | 'transitive-runtime' 
  | 'build-ci' 
  | 'peer-optional';

export type PermissionScope = 
  | 'fs:read' 
  | 'fs:write' 
  | 'net:listen' 
  | 'net:outbound' 
  | 'env:read' 
  | 'process:exec';

export type ReachabilityStatus = 'reachable' | 'unreachable-dead-code' | 'conditional';
export type SubstitutabilityLevel = 'trivial' | 'moderate' | 'architectural-core';
export type LockfileStatus = 'pinned-sha512' | 'floating-range' | 'unpinned';

export interface CVEInfo {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvss: number;
  summary: string;
  publishDate: string;
  affectedVersions: string;
}

export interface OpenSSFScorecard {
  overallScore: number; // 0 - 10
  binaryArtifacts: number;
  branchProtection: number;
  ciTests: number;
  codeReview: number;
  dangerousWorkflow: number;
  dependencyUpdateTool: number;
  maintained: number;
  pinnedDependencies: number;
  sast: number;
  securityPolicy: number;
  signedReleases: number;
  tokenPermissions: number;
  vulnerabilities: number;
}

export interface DependencyNode {
  id: string;
  name: string;
  version: string;
  type: NodeType;
  ecosystem: Ecosystem;
  
  // Package-specific attributes
  maintainer?: string;
  maintainerEmail?: string;
  isSingleMaintainer?: boolean;
  maintainer2FA?: boolean;
  maintainerKeySigned?: boolean;
  releaseFrequencyPerYear?: number;
  commitActivityScore?: number; // 0 - 100
  hasInstallScripts?: boolean; // preinstall / postinstall
  license?: string;
  openSsfScorecard?: OpenSSFScorecard;
  cves?: CVEInfo[];
  substitutability?: SubstitutabilityLevel;
  
  // Application-specific attributes
  tier?: AppTier;
  dataClassifications?: DataClassification[];
  runtimeEnv?: 'Kubernetes' | 'Serverless' | 'Edge Worker' | 'Container';
  deployFrequency?: string;
  lockfileStatus?: LockfileStatus;

  // Reachability & Call graph
  reachability?: ReachabilityStatus;
  callGraphFunctions?: string[];
  sensitiveCapabilities?: PermissionScope[];

  // Graph layout coordinates (optional for SVG)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface DependencyEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  type: EdgeType;
  invocationDepth: number;
  reachability: ReachabilityStatus;
  permissionScopes: PermissionScope[];
  callGraphPath?: string[];
  isCutVertexEdge?: boolean;
}

export interface NodeMetrics {
  nodeId: string;
  reverseReachabilityBlastRadius: number; // Count of downstream apps
  downstreamTier1Count: number;
  betweennessCentrality: number; // 0 - 1
  keystoneScore: number; // PageRank authority 0 - 100
  maintainerChokepointScore: number; // 0 - 100
  
  // EDI breakdown
  topologicalReachScore: number; // 0 - 25
  assetCriticalityScore: number; // 0 - 25
  privilegeCapabilityScore: number; // 0 - 25
  substitutabilityScore: number; // 0 - 25
  ediScore: number; // 0 - 100
  
  traditionalCvssMax: number;
  cvssEdiDiscrepancy: number; // Difference showing how traditional CVSS misleads
}

export type SimulationScenario = 
  | 'maintainer-ato' 
  | 'malicious-patch' 
  | 'revoked-package' 
  | 'ci-secret-stealer';

export interface SimulationConfig {
  scenario: SimulationScenario;
  targetNodeId: string;
  propagationVector: 'all' | 'build-time' | 'runtime';
  lockfileResistanceActive: boolean;
  reachabilityPruningActive: boolean;
  timeHorizonHours: number; // 0 to 72
}

export interface SimulationStepResult {
  hour: number;
  newlyInfectedNodes: string[];
  blockedNodes: string[];
  stealthExploits: string[];
  cumulativeInfectedApps: number;
  cumulativeInfectedPackages: number;
  cumulativeDataExposure: DataClassification[];
  estimatedCostUSD: number;
}

export interface MitigationAction {
  id: string;
  targetNodeId: string;
  targetNodeName: string;
  title: string;
  type: 'tactical-ebpf' | 'tactical-sandbox' | 'strategic-override' | 'strategic-replace' | 'cut-vertex-pin';
  category: 'tactical' | 'strategic';
  isCutVertex: boolean;
  blastRadiusReduction: number;
  serviceCriticalityMultiplier: number;
  effortHours: number;
  roiScore: number; // (BlastRadiusReduction * Criticality) / EffortHours
  description: string;
  commandSnippet: string;
  applied: boolean;
}

export interface CounterfactualScenario {
  id: string;
  title: string;
  description: string;
  actionType: 'upgrade' | 'isolate-wasm' | 'remove' | 'pin-lockfile';
  targetNodeId: string;
  targetVersion?: string;
  baselineEdi: number;
  counterfactualEdi: number;
  blastRadiusDelta: number;
  affectedServicesDelta: number;
}
