"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Hexagon, 
  ArrowRight, 
  Layers, 
  Activity, 
  Cpu, 
  ShieldCheck, 
  Database, 
  Sparkles, 
  GitCompare, 
  FileText,
  Workflow,
  CheckCircle2,
  Terminal,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<"scalability" | "security" | "reliability" | "database">("scalability");

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem("archon_auth_token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-[#070709] text-zinc-100 overflow-x-hidden selection:bg-indigo-500/30 font-sans selection:text-white">
      {/* Premium Linear-style Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.12] pointer-events-none" />
      
      {/* Premium Ambient Lights */}
      <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[70vw] h-[50vh] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,rgba(139,92,246,0.03)_50%,transparent_100%)] blur-[100px] pointer-events-none" />
      <div className="absolute top-[80vh] left-[-20vw] w-[50vw] h-[50vh] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[160vh] right-[-20vw] w-[50vw] h-[50vh] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      {/* Styled Micro Animations */}
      <style jsx global>{`
        @keyframes shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .text-shine {
          background: linear-gradient(to right, #fff 20%, #a5b4fc 40%, #c084fc 60%, #fff 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine 6s linear infinite;
        }
        .glass-header {
          background: rgba(8, 8, 10, 0.4);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .premium-glow {
          box-shadow: 0 0 40px rgba(99, 102, 241, 0.15), 0 0 1px rgba(99, 102, 241, 0.5) inset;
        }
        .linear-border {
          position: relative;
        }
        .linear-border::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.01));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .active-glow {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.1);
        }
      `}</style>

      {/* 1. STUNNING FIXED TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-header px-6 md:px-12 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Hexagon className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold tracking-tight text-white group-hover:text-zinc-200 transition-colors">Archon</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">Features</a>
            <a href="#method" className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">Method</a>
            <a href="#security" className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">Security</a>
            <a href="#pricing" className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">Pricing</a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isMounted && isLoggedIn ? (
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="h-8 text-xs bg-zinc-950 border-zinc-800 hover:bg-zinc-900 hover:text-white transition-all text-zinc-300">
                Go to Workspace
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <span className="text-xs font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors px-3 py-1.5">Sign In</span>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/10 px-4 rounded-md transition-all active:scale-[0.98]">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-6 max-w-5xl mx-auto text-center space-y-8">
        {/* Glow Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/15 text-[10px] font-semibold text-indigo-400 tracking-wider uppercase active-glow pointer-events-none">
          <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
          Introducing Archon 2026 Baseline Scans
        </div>

        {/* Master Sleek Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.08] max-w-4xl mx-auto">
          Archon is a new way to <br className="hidden md:inline" />
          <span className="text-shine">review software architecture.</span>
        </h1>

        {/* High-quality subtext description */}
        <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
          Connect your GitHub repository or paste a product requirements document. Archon reconstruction maps your services, reviews scaling limits, and catches structural drift instantly.
        </p>

        {/* Hero CTA Button container */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {isMounted && isLoggedIn ? (
            <Link href="/dashboard">
              <Button className="h-11 px-6 bg-white hover:bg-zinc-200 text-black font-semibold text-sm rounded-lg gap-2 shadow-xl shadow-white/5 group transition-all">
                Enter Dashboard
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signup">
                <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-lg gap-2 shadow-xl shadow-indigo-600/20 group transition-all">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="h-11 px-6 bg-zinc-950/80 border-zinc-800 hover:bg-zinc-900/60 text-zinc-300 font-semibold text-sm rounded-lg gap-2 transition-all">
                  Sign In to Workspace
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Sub-hero metadata */}
        <p className="text-[10px] text-zinc-500 tracking-wider uppercase font-medium">
          Backed by secure local peer pgx integrations. No complex setup.
        </p>

        {/* 3. PREMIUM CENTRAL UI VIEWPORT SHOWCASE (Looks exactly like Linear's glowing app snapshot) */}
        <div className="relative max-w-5xl mx-auto pt-16 pointer-events-none">
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#070709] to-transparent z-10" />
          
          <div className="linear-border rounded-xl bg-zinc-950/30 overflow-hidden shadow-2xl shadow-indigo-500/5 active-glow border border-zinc-850 p-3 md:p-4">
            
            {/* Top Mock Window chrome */}
            <div className="flex items-center gap-1.5 pb-3 border-b border-zinc-800/40 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
              <div className="h-3.5 w-44 rounded bg-zinc-900/60 border border-zinc-850 mx-auto text-[9px] text-zinc-500 flex items-center justify-center font-mono tracking-tight gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-indigo-400" />
                archon.sh/acme-corp/dashboard
              </div>
            </div>

            {/* Mock Dashboard Visual Canvas */}
            <div className="grid grid-cols-12 gap-3 pt-3 h-[250px] sm:h-[350px] md:h-[420px] overflow-hidden text-left">
              
              {/* Left sidebar mock */}
              <div className="col-span-3 border-r border-zinc-850/60 pr-3 space-y-4 hidden sm:block">
                <div className="space-y-1.5">
                  <div className="h-3 w-16 bg-indigo-500/10 rounded border border-indigo-500/20" />
                  <div className="h-5 w-full bg-zinc-900/60 rounded border border-zinc-850" />
                </div>
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5].map(idx => (
                    <div key={idx} className={`h-6 w-full rounded flex items-center px-1.5 gap-1.5 ${idx === 1 ? "bg-indigo-950/20 border border-indigo-900/30" : "bg-transparent"}`}>
                      <div className="w-3 h-3 rounded bg-zinc-800" />
                      <div className="h-2 w-14 bg-zinc-800 rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Central canvas panel */}
              <div className="col-span-12 sm:col-span-9 space-y-4 px-1">
                {/* Header elements */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-850/30">
                  <div className="space-y-1">
                    <div className="h-4 w-32 bg-zinc-800 rounded" />
                    <div className="h-2 w-20 bg-zinc-900 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-indigo-600/10 border border-indigo-500/20 rounded flex items-center justify-center text-[10px] font-semibold text-indigo-400 uppercase">
                    Active Run
                  </div>
                </div>

                {/* Score Cards & Visuals */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { title: "Architecture Score", value: "88", color: "text-indigo-400" },
                    { title: "Scalability Limit", value: "10k RPS", color: "text-amber-400" },
                    { title: "Security Vulnerabilities", value: "0", color: "text-emerald-400" }
                  ].map((card, i) => (
                    <div key={i} className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-lg space-y-2">
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">{card.title}</div>
                      <div className={`text-xl sm:text-2xl font-bold tracking-tight ${card.color}`}>{card.value}</div>
                    </div>
                  ))}
                </div>

                {/* Simulated Graph Node Canvas */}
                <div className="relative border border-zinc-850/60 rounded-xl h-[120px] sm:h-[190px] md:h-[220px] bg-zinc-950/60 overflow-hidden flex items-center justify-center p-4">
                  {/* Flow grid */}
                  <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] bg-[size:10px_10px] opacity-40" />

                  {/* Render Mock Nodes with SVGs connecting them */}
                  <svg className="absolute inset-0 w-full h-full text-indigo-500/20 stroke-2" fill="none">
                    <path d="M 120,95 Q 260,35 400,95" />
                    <path d="M 120,95 Q 260,165 400,95" />
                    <path d="M 400,95 Q 520,35 640,95" strokeDasharray="4 4" className="text-zinc-600" />
                    <path d="M 400,95 Q 520,165 640,95" />
                  </svg>

                  <div className="relative z-10 flex items-center justify-between w-full max-w-xl">
                    <div className="bg-zinc-950 border border-indigo-500/30 p-2 rounded-lg flex items-center gap-2 active-glow">
                      <div className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono text-[9px]">API</div>
                      <div className="text-[10px] font-bold">go-gateway</div>
                    </div>

                    <div className="bg-zinc-950 border border-purple-500/30 p-2 rounded-lg flex items-center gap-2 active-glow">
                      <div className="w-5 h-5 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-mono text-[9px]">SRV</div>
                      <div className="text-[10px] font-bold">payments-service</div>
                    </div>

                    <div className="bg-zinc-950 border border-emerald-500/30 p-2 rounded-lg flex items-center gap-2 active-glow">
                      <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono text-[9px]">DB</div>
                      <div className="text-[10px] font-bold">postgresql</div>
                    </div>
                  </div>

                  {/* Absolute subtle glowing sphere */}
                  <div className="absolute top-[40%] left-[45%] w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(99,102,241,1)] animate-ping" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE INTERACTIVE ARCHITECTURAL AGENTS PORTAL (Tabs that users can switch between) */}
      <section id="features" className="py-20 border-t border-zinc-900 bg-[#08080a] relative px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
              Specialized AI review intelligence.
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Archon deploys isolated domain-expert review nodes to profile, evaluate, and provide architecture fixes.
            </p>
          </div>

          {/* Premium tabs list */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 border-b border-zinc-900 pb-2">
            {[
              { id: "scalability", label: "Scalability Agent", icon: Activity },
              { id: "security", label: "Security Agent", icon: ShieldCheck },
              { id: "reliability", label: "Reliability Agent", icon: Sparkles },
              { id: "database", label: "Database Agent", icon: Database }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    active 
                      ? "bg-indigo-600/10 border-indigo-500/40 text-white shadow-md active-glow" 
                      : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-indigo-400" : "text-zinc-500"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Dynamic Tab Body */}
          <div className="linear-border rounded-xl bg-zinc-950/40 border border-zinc-850 p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center min-h-[300px]">
            <div className="md:col-span-7 space-y-4">
              {activeTab === "scalability" && (
                <>
                  <div className="text-indigo-400 uppercase text-[10px] tracking-wider font-bold">Scalability Bottlenecks</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Throughput Limit Auditing</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Evaluates network bottlenecks, caching thresholds, and CPU utilization across load spikes. Flag server limits at 10,000+ Requests Per Second natively.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">Throughput Bottlenecks</span>
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">Caching Opportunities</span>
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">Scaling Limitations</span>
                  </div>
                </>
              )}

              {activeTab === "security" && (
                <>
                  <div className="text-red-400 uppercase text-[10px] tracking-wider font-bold">Security Analysis</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Data Exposure and Masking Risks</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Scans configuration templates and codebase imports to find authorization holes, secret leaks, raw tokens, and missing cryptographic middleware.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">Auth Token Verification</span>
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">Masked API Secrets</span>
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">Data Cryptography</span>
                  </div>
                </>
              )}

              {activeTab === "reliability" && (
                <>
                  <div className="text-blue-400 uppercase text-[10px] tracking-wider font-bold">Reliability Auditing</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Single Points of Failure</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Maps system design topologies to evaluate disaster recovery strategies, cluster setups, circuit breakers, and database failover limits.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">Availability Targets</span>
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">Circuit Breakers</span>
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">Failover Testing</span>
                  </div>
                </>
              )}

              {activeTab === "database" && (
                <>
                  <div className="text-emerald-400 uppercase text-[10px] tracking-wider font-bold">Database Recommendations</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Access Patterns and Schemes</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Analyzes database configuration metrics to recommend missing query indexes, schema layout updates, and read replica configurations to alleviate storage bottlenecks.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">Query Optimization</span>
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">Index Auto-Tuning</span>
                    <span className="px-2.5 py-1 rounded text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">Replica Controls</span>
                  </div>
                </>
              )}
            </div>

            {/* Right side representation */}
            <div className="md:col-span-5 bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl font-mono text-[11px] text-zinc-400 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-900 text-zinc-500">
                <span>terminal - archon-agent</span>
                <span>bash</span>
              </div>
              
              {activeTab === "scalability" && (
                <div className="space-y-1.5">
                  <p className="text-zinc-500">&gt; archon scan --scalability</p>
                  <p className="text-indigo-400">⚡ Initialized Scalability Agent...</p>
                  <p>✔ Scanned 12 network routes in go-gateway</p>
                  <p className="text-amber-400">⚠ Found bottleneck: Missing Cache-Control on GET /api/v1/projects</p>
                  <p className="text-zinc-300">✔ Recalculating baseline score: 74 -&gt; 88</p>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-1.5">
                  <p className="text-zinc-500">&gt; archon scan --security</p>
                  <p className="text-red-400">🔒 Initialized Security Agent...</p>
                  <p>✔ Scanned environment properties schema</p>
                  <p className="text-emerald-400">✔ Checked 4 postgresql user privileges</p>
                  <p className="text-zinc-300">✔ Verification complete: 0 vulnerabilities found.</p>
                </div>
              )}

              {activeTab === "reliability" && (
                <div className="space-y-1.5">
                  <p className="text-zinc-500">&gt; archon scan --reliability</p>
                  <p className="text-blue-400">✨ Initialized Reliability Agent...</p>
                  <p>✔ Verified replica settings for pgx pool connection</p>
                  <p className="text-amber-400">⚠ Alert: Single db instance detected. Adding failover target...</p>
                  <p className="text-zinc-300">✔ Recommendation: Configure read-replica cluster.</p>
                </div>
              )}

              {activeTab === "database" && (
                <div className="space-y-1.5">
                  <p className="text-zinc-500">&gt; archon scan --database</p>
                  <p className="text-emerald-400">📂 Initialized Database Agent...</p>
                  <p>✔ Inspected raw query schema schemas</p>
                  <p>✔ Found table `analyses` requires INDEX on `project_id` column</p>
                  <p className="text-indigo-400">💡 Recommended SQL: CREATE INDEX idx_analyses_project_id ON analyses(project_id);</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* 5. METALLIC CORE DETAILS SECTION (The Grid of Highlights) */}
      <section id="method" className="py-20 px-6 max-w-5xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="linear-border bg-zinc-950/30 rounded-xl border border-zinc-850 p-6 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400">
              <Workflow className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white tracking-tight">Reconstruction</h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Auto-generate dependency graphs, trace microservice connections, and inspect database schemes from raw repository structures.
            </p>
          </div>

          <div className="linear-border bg-zinc-950/30 rounded-xl border border-zinc-850 p-6 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400">
              <GitCompare className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white tracking-tight">Architecture Drift</h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Compare planned product requirements directly with codebase schemas. Flag added, deleted, or changed structures automatically.
            </p>
          </div>

          <div className="linear-border bg-zinc-950/30 rounded-xl border border-zinc-850 p-6 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white tracking-tight">Resilience Metrics</h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Ensure your codebase matches the critical SLA standards (99.9% - 99.999%) and database parameters required by enterprise specs.
            </p>
          </div>

        </div>
      </section>

      {/* 6. CALL TO ACTION BAND */}
      <section className="py-24 border-t border-zinc-900 text-center space-y-6 relative px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.04)_0%,transparent_70%)] pointer-events-none" />
        
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
          Reconstruct your design. <br />
          Start reviewing today.
        </h2>
        <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
          Create a developer account, register your active project registries, and launch baseline AI reviews in seconds.
        </p>

        <div className="pt-4">
          {isMounted && isLoggedIn ? (
            <Link href="/dashboard">
              <Button className="h-11 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-lg gap-2 shadow-lg shadow-indigo-600/20 transition-all">
                Go to Workspace
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/signup">
              <Button className="h-11 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-lg gap-2 shadow-lg shadow-indigo-600/20 transition-all">
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* 7. PREMIUM FOOTER */}
      <footer className="border-t border-zinc-900/60 py-12 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6 max-w-5xl mx-auto text-zinc-650 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Hexagon className="w-3 h-3 text-indigo-400" />
          </div>
          <span className="font-semibold text-zinc-500">Archon</span>
          <span>© 2026. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-zinc-400 transition-colors">Security docs</a>
          <a href="#security" className="hover:text-zinc-400 transition-colors">Privacy policy</a>
          <a href="#method" className="hover:text-zinc-400 transition-colors">Status</a>
          <a href="https://github.com" className="flex items-center gap-1 hover:text-zinc-400 transition-colors">
            GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>

    </div>
  );
}
