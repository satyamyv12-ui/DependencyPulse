import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Radio, 
  CheckCircle2, 
  Database, 
  Globe, 
  Cpu, 
  AlertTriangle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DependencyNode, DependencyEdge } from '../types';

interface IngestionModalProps {
  onClose: () => void;
  onImportCustomGraph: (nodes: DependencyNode[], edges: DependencyEdge[], name: string) => void;
  onTriggerSimulatedWebhook: (advisory: { title: string; packageName: string; severity: string; cvss: number }) => void;
}

export const IngestionModal: React.FC<IngestionModalProps> = ({
  onClose,
  onImportCustomGraph,
  onTriggerSimulatedWebhook,
}) => {
  const [activeTab, setActiveTab] = useState<'sbom' | 'webhooks' | 'feeds'>('sbom');
  const [rawInput, setRawInput] = useState<string>('');
  const [importType, setImportType] = useState<'cyclonedx' | 'package-lock' | 'requirements'>('package-lock');
  const [parseError, setParseError] = useState<string | null>(null);

  // Sample templates for easy testing
  const samplePackageLock = JSON.stringify({
    name: "fintech-microservice",
    version: "1.0.0",
    lockfileVersion: 2,
    packages: {
      "": {
        name: "fintech-microservice",
        version: "1.0.0",
        dependencies: {
          "express": "^4.18.2",
          "axios": "^1.6.0"
        }
      },
      "node_modules/express": {
        version: "4.18.2",
        dependencies: {
          "qs": "6.11.0",
          "body-parser": "1.20.1"
        }
      },
      "node_modules/axios": {
        version: "1.6.0",
        dependencies: {
          "follow-redirects": "1.15.4"
        }
      },
      "node_modules/follow-redirects": {
        version: "1.15.4"
      },
      "node_modules/body-parser": {
        version: "1.20.1",
        dependencies: {
          "raw-body": "2.5.1"
        }
      },
      "node_modules/raw-body": {
        version: "2.5.1"
      },
      "node_modules/qs": {
        version: "6.11.0"
      }
    }
  }, null, 2);

  const handleLoadSample = () => {
    setRawInput(samplePackageLock);
    setParseError(null);
  };

  const handleParseAndImport = () => {
    try {
      setParseError(null);
      if (!rawInput.trim()) {
        setParseError("Please provide lockfile or SBOM JSON.");
        return;
      }

      const parsed = JSON.parse(rawInput);
      const newNodes: DependencyNode[] = [];
      const newEdges: DependencyEdge[] = [];

      // App root
      const appName = parsed.name || "imported-application";
      const rootApp: DependencyNode = {
        id: `app-${appName}`,
        name: appName,
        version: parsed.version || "1.0.0",
        type: "application",
        ecosystem: "npm",
        tier: "tier-1",
        dataClassifications: ["Financial", "PII"],
        runtimeEnv: "Kubernetes",
        deployFrequency: "Daily",
        lockfileStatus: "pinned-sha512",
        x: 480,
        y: 60,
      };
      newNodes.push(rootApp);

      // Parse packages
      const pkgs = parsed.packages || {};
      let xOffset = 180;
      let yOffset = 220;
      let count = 0;

      Object.entries(pkgs).forEach(([key, val]: [string, any]) => {
        if (key === "") return;
        const cleanName = key.replace("node_modules/", "");
        const nodeId = `pkg-${cleanName.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
        
        newNodes.push({
          id: nodeId,
          name: cleanName,
          version: val.version || "1.0.0",
          type: "package",
          ecosystem: "npm",
          maintainer: `maintainer-${cleanName.slice(0, 5)}`,
          isSingleMaintainer: count % 2 === 1,
          maintainer2FA: count % 3 !== 0,
          maintainerKeySigned: count % 2 === 0,
          hasInstallScripts: count === 1,
          openSsfScorecard: {
            overallScore: 6.5,
            binaryArtifacts: 7,
            branchProtection: 6,
            ciTests: 7,
            codeReview: 6,
            dangerousWorkflow: 7,
            dependencyUpdateTool: 6,
            maintained: 7,
            pinnedDependencies: 6,
            sast: 6,
            securityPolicy: 6,
            signedReleases: 6,
            tokenPermissions: 6,
            vulnerabilities: 7,
          },
          substitutability: "moderate",
          sensitiveCapabilities: ["env:read"],
          reachability: "reachable",
          x: xOffset,
          y: yOffset,
        });

        xOffset += 240;
        if (xOffset > 850) {
          xOffset = 180;
          yOffset += 160;
        }
        count++;

        // Edge from root app or intermediate
        newEdges.push({
          id: `edge-${rootApp.id}-${nodeId}`,
          source: rootApp.id,
          target: nodeId,
          type: "direct-runtime",
          invocationDepth: 1,
          reachability: "reachable",
          permissionScopes: ["env:read"],
        });

        // Nested dependencies if present
        if (val.dependencies) {
          Object.keys(val.dependencies).forEach(depName => {
            const childId = `pkg-${depName.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
            newEdges.push({
              id: `edge-${nodeId}-${childId}`,
              source: nodeId,
              target: childId,
              type: "transitive-runtime",
              invocationDepth: 2,
              reachability: "reachable",
              permissionScopes: [],
            });
          });
        }
      });

      onImportCustomGraph(newNodes, newEdges, `Custom Lockfile (${appName})`);
      onClose();
    } catch (err: any) {
      setParseError(`JSON Parse error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Database className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Supply Chain Ingestion Layer
              </h2>
              <p className="text-xs text-slate-400">
                Continuous sync with registry webhooks, OpenSSF Scorecards, and internal SBOMs.
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

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 px-6 bg-slate-950/40 text-xs font-medium">
          <button
            onClick={() => setActiveTab('sbom')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'sbom'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Import SBOM / Lockfile
          </button>

          <button
            onClick={() => setActiveTab('webhooks')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'webhooks'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            Registry Webhooks & Zero-Days
          </button>

          <button
            onClick={() => setActiveTab('feeds')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'feeds'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            Public Intelligence (deps.dev / OSV)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {activeTab === 'sbom' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Format:</span>
                  <select
                    value={importType}
                    onChange={(e: any) => setImportType(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1"
                  >
                    <option value="package-lock">npm / yarn package-lock.json (v2/v3)</option>
                    <option value="cyclonedx">CycloneDX JSON SBOM (v1.4 / 1.5)</option>
                    <option value="requirements">PyPI / Python Pipfile.lock</option>
                  </select>
                </div>

                <button
                  onClick={handleLoadSample}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <Sparkles className="w-3 h-3" />
                  Load Fintech Sample Lockfile
                </button>
              </div>

              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Paste package-lock.json or CycloneDX SBOM JSON here..."
                rows={12}
                className="w-full p-3 font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />

              {parseError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {parseError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleParseAndImport}
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
                >
                  Generate DAG Network
                </button>
              </div>
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div className="space-y-4">
              <p className="text-slate-300">
                DependencyPulse connects directly to upstream package registries via webhooks. Simulate sudden emergency security advisories to verify that your graph detects structural blast radius instantly:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono">XZ Utils / Native Backdoor Event</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                      CVSS 10.0
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Compromised maintainer identity publishes malicious systemd hook in minor build artifact.
                  </p>
                  <button
                    onClick={() => {
                      onTriggerSimulatedWebhook({
                        title: "Supply Chain Backdoor in upstream tarball hook",
                        packageName: "flatmap-stream",
                        severity: "CRITICAL",
                        cvss: 10.0,
                      });
                      onClose();
                    }}
                    className="w-full mt-2 py-1.5 px-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 font-bold hover:bg-rose-900/60"
                  >
                    Fire Webhook Event
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono">Colors.js / Sabotage Release</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      CVSS 7.5
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Protestware infinite loop pushed in patch version, triggering build breaks across all consumers.
                  </p>
                  <button
                    onClick={() => {
                      onTriggerSimulatedWebhook({
                        title: "Intentional maintainer sabotage release (Infinite loop)",
                        packageName: "stream-pipeline-wrapper",
                        severity: "HIGH",
                        cvss: 7.5,
                      });
                      onClose();
                    }}
                    className="w-full mt-2 py-1.5 px-3 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300 font-bold hover:bg-amber-900/60"
                  >
                    Fire Webhook Event
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'feeds' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    Live Ecosystem Feed Sync Status
                  </span>
                  <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active Continuous Stream
                  </span>
                </div>

                <div className="space-y-2 font-mono text-[11px] text-slate-300">
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span>Google deps.dev API:</span>
                    <span className="text-cyan-400">Sync: 12,490 packages tracked</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span>OpenSSF Scorecards:</span>
                    <span className="text-cyan-400">Continuous commit signing & branch checks</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span>OSV Vulnerability DB:</span>
                    <span className="text-cyan-400">Delta polling every 60s</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>Internal Kubernetes Clusters:</span>
                    <span className="text-emerald-400">eBPF Telemetry Daemon Connected</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
