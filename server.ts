import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Lazy initialization for Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    try {
      geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.warn("Failed to initialize GoogleGenAI client:", err);
      return null;
    }
  }
  return geminiClient;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// AI Narrative & Supply Chain Reasoning Endpoint
app.post("/api/generate-narrative", async (req, res) => {
  const { node, parents, downstreamApps, metrics, scenario } = req.body;

  if (!node) {
    return res.status(400).json({ error: "Node metadata required" });
  }

  const ai = getGemini();

  if (ai) {
    try {
      const prompt = `You are a Lead Software Supply Chain Security Architect analyzing risk in DependencyPulse.
Generate a concise, razor-sharp, human-readable natural language security narrative explaining the structural risk of this dependency.

Node Data:
- Name: ${node.name} (${node.version})
- Ecosystem: ${node.ecosystem}
- Maintainer: ${node.maintainer} (Single Maintainer: ${node.isSingleMaintainer ? "YES - Chokepoint" : "No, Multi-maintainer"})
- OpenSSF Scorecard: ${node.openSsfScore}/10
- Has Pre/Post Install Scripts: ${node.hasInstallScripts ? "YES (Arbitrary execution at install)" : "No"}
- Blast Radius: Affects ${metrics?.blastRadiusApps || downstreamApps?.length || 0} downstream applications (${downstreamApps?.filter((a: any) => a.tier === 'tier-1').length || 0} Tier-1 Production services)
- Keystone PageRank Score: ${metrics?.keystoneScore?.toFixed(2) || "N/A"}
- Environmental Downstream Impact (EDI): ${metrics?.ediScore?.toFixed(1) || "N/A"}/100
- Reachability status: ${node.reachability || "Full invocation"}
- Scenario simulated: ${scenario || "Baseline topological review"}

Format requirement:
Produce a 2-3 paragraph executive-grade briefing explaining:
1. Exact structural threat vectors (e.g. single maintainer account takeover, pre-install script token exfiltration, bridge centrality).
2. Why relying on traditional CVSS alone misses this threat (e.g. zero active CVEs, but massive reach into customer payment/auth tier).
3. Concrete recommended cut-vertex mitigation or sandboxing step.

Keep it direct, professional, and authoritative. Do not use generic hype.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });

      const text = response.text || "";
      return res.json({ narrative: text, source: "gemini-3.8-flash" });
    } catch (error: any) {
      console.warn("Gemini API call failed, falling back to deterministic synthesis:", error?.message);
    }
  }

  // Deterministic fallback generator if no key or error
  const tier1Count = downstreamApps?.filter((a: any) => a.tier === 'tier-1')?.length || 0;
  const appCount = metrics?.blastRadiusApps ?? (downstreamApps?.length || 1);
  const isChoke = node.isSingleMaintainer;
  const hasScripts = node.hasInstallScripts;
  const edi = metrics?.ediScore ? Math.round(metrics.ediScore) : 78;

  const fallbackNarrative = `Package ${node.name}@${node.version} presents high structural criticality (EDI Score: ${edi}/100)${
    node.cveCount === 0 ? " despite having 0 active CVEs logged in the NVD" : ` with ${node.cveCount} known advisories`
  }. It is transitively required by ${appCount} internal service${appCount === 1 ? "" : "s"}, including ${tier1Count} Tier-1 production workloads (${
    downstreamApps?.map((a: any) => a.name).slice(0, 3).join(", ") || "payment-api, auth-core"
  }).

${
  isChoke
    ? `CRITICAL CHOKEPOINT: Controlled by a single maintainer identity (${node.maintainer}). A credential compromise or targeted spear-phishing attack against this identity would grant silent code propagation across your deployment boundary without triggering conventional scanner alerts.`
    : `CENTRALITY BRIDGE: Sits on key shortest paths across intermediate enterprise microservices, compounding reachability if a regression or malicious patch payload is introduced.`
} ${
    hasScripts
      ? `Furthermore, the package executes lifecycle install scripts (pre/post-install), granting immediate shell execution inside CI/CD runners with potential access to build-time environment secrets.`
      : `The component binds sensitive capabilities including environment variable access and external network socket invocations.`
  }

RECOMMENDED ACTION: Implement Cut-Vertex mitigation at the immediate upstream wrapper layer or enforce strict cryptographic lockfile integrity verification. Consider isolating execution within an unprivileged WebAssembly/container sandbox or pinning to a vetted internal mirror.`;

  return res.json({ narrative: fallbackNarrative, source: "deterministic-engine" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DependencyPulse Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
