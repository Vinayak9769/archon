"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Hexagon, ArrowRight, ChevronRight, ExternalLink,
  Layers, FileText, Activity, Database, Zap,
  Shield, AlertTriangle, DollarSign, GitCompare,
  CheckCircle2, Circle, RefreshCw, ZoomIn, ZoomOut, Maximize2,
  Terminal, Server, Play, Code, AlertCircle, Sparkles
} from "lucide-react";
import { 
  analyses, 
  findings, 
  jobTimeline, 
  agentProgress, 
  scoreBreakdown, 
  systemRequirements,
  capacitySpecs,
  databaseSchema,
  apiSpecs,
  costBreakdown,
  tradeoffsCompare
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { notFound } from "next/navigation";

type SidebarTab = 
  | "overview" 
  | "requirements" 
  | "capacity" 
  | "architecture" 
  | "data-model" 
  | "apis" 
  | "security" 
  | "reliability" 
  | "tradeoffs"
  | "export";

export default function WorkspaceIDEPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const analysis = analyses.find(a => a.id === id);
  if (!analysis) return notFound();

  // Selected tab state
  const [activeTab, setActiveTab] = useState<SidebarTab>("architecture");

  // Pannable/Zoomable state for Architecture Diagram Canvas
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Severity config
  const severityConfig = {
    critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    high: { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
    medium: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    low: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    info: { color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-700/40" },
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30">
      
      {/* 1. TOP BREADCRUMB HEADER */}
      <header className="h-12 border-b border-zinc-900 bg-[#08080a] px-6 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            Projects
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
          <span className="text-zinc-300 font-mono">{analysis.repo}</span>
          <Badge className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 ml-2">
            branch: {analysis.branch}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Workspace Active
          </div>
          <Link href={`https://github.com/${analysis.repo}`} target="_blank">
            <Button variant="outline" size="sm" className="h-7 text-[10px] bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200">
              <ExternalLink className="w-3 h-3 mr-1.5" /> Repository
            </Button>
          </Link>
        </div>
      </header>

      {/* 2. THREE COLUMN SYSTEM DESIGN IDE WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMN A: LEFT SIDEBAR (10 navigation tab choices) */}
        <aside className="w-56 border-r border-zinc-900 bg-[#08080a] flex flex-col justify-between py-4 flex-shrink-0">
          <div className="space-y-6">
            <div className="px-4">
              <p className="text-[10px] font-bold text-zinc-650 uppercase tracking-widest font-mono">Architect Workspace</p>
            </div>

            <nav className="space-y-1 px-2">
              {[
                { id: "overview", label: "Overview", icon: Layers },
                { id: "requirements", label: "Requirements", icon: FileText },
                { id: "capacity", label: "Capacity", icon: Activity },
                { id: "architecture", label: "Architecture", icon: Hexagon },
                { id: "data-model", label: "Data Model", icon: Database },
                { id: "apis", label: "APIs", icon: Zap },
                { id: "security", label: "Security", icon: Shield },
                { id: "reliability", label: "Reliability", icon: Sparkles },
                { id: "tradeoffs", label: "Tradeoffs", icon: GitCompare },
                { id: "export", label: "Export", icon: ExternalLink }
              ].map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as SidebarTab)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left",
                      active 
                        ? "bg-indigo-600/10 border border-indigo-500/25 text-white" 
                        : "border border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/40"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", active ? "text-indigo-400" : "text-zinc-650")} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Metrics at bottom of sidebar */}
          <div className="px-4 pt-4 border-t border-zinc-900">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase font-mono mb-2">
              <span>Overall Score</span>
              <span className="font-bold text-indigo-400">{analysis.score}/100</span>
            </div>
            <Progress value={analysis.score} className="h-1 bg-zinc-900" />
          </div>
        </aside>

        {/* COLUMN B: MAIN CENTER AREA (Dynamic layout dependent on selected sidebarTab) */}
        <main className="flex-1 bg-[#09090b]/40 relative overflow-y-auto flex flex-col justify-between">
          
          {/* Header context band */}
          <div className="h-10 border-b border-zinc-900/60 bg-[#08080a]/60 flex items-center justify-between px-6 text-xs text-zinc-500">
            <span className="capitalize font-mono text-zinc-400">View &gt; {activeTab.replace("-", " ")}</span>
            <span>Target: Payments Service Core (PCI-DSS compliant)</span>
          </div>

          {/* Core dynamic body components */}
          <div className="flex-1 p-6">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                
                {/* Scorecards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="bg-[#0b0b0d] border-zinc-800 p-4 space-y-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Architecture Baseline Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white font-mono">{analysis.score}</span>
                      <span className="text-xs text-zinc-650">/ 100 limit</span>
                    </div>
                    <Progress value={analysis.score} className="h-1 bg-zinc-900" />
                  </Card>

                  <Card className="bg-[#0b0b0d] border-zinc-800 p-4 space-y-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Total Flagged Findings</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-amber-500 font-mono">{findings.length}</span>
                      <span className="text-xs text-zinc-650">items active</span>
                    </div>
                    <Badge className="text-[9px] bg-red-950/20 text-red-400 border border-red-900/30">
                      {findings.filter(f => f.severity === "critical").length} Critical Security alerts
                    </Badge>
                  </Card>

                  <Card className="bg-[#0b0b0d] border-zinc-800 p-4 space-y-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Capacity Bounds</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-emerald-400 font-mono">10k+</span>
                      <span className="text-xs text-zinc-650">peak requests/sec</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">Auto-calculated delta load constraints verified</span>
                  </Card>
                </div>

                {/* Job timeline indicator */}
                <Card className="bg-[#0b0b0d] border-zinc-800 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-400">Agent Compilation Runs</h3>
                  
                  <div className="space-y-0.5">
                    {jobTimeline.map((step, idx) => {
                      const completed = step.status === "done";
                      const running = step.status === "running";
                      return (
                        <div key={idx} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center border text-[9px] font-bold flex-shrink-0",
                              completed ? "bg-green-500/10 border-green-500/30 text-green-400" :
                              running ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 animate-pulse" :
                              "bg-zinc-950 border-zinc-800 text-zinc-650"
                            )}>
                              {completed ? "✓" : idx + 1}
                            </div>
                            {idx < jobTimeline.length - 1 && (
                              <div className="w-px h-6 bg-zinc-800" />
                            )}
                          </div>
                          <div className="flex-1 pb-4 flex items-center justify-between text-xs">
                            <span className={cn("font-medium", completed ? "text-zinc-350" : running ? "text-indigo-400 font-semibold" : "text-zinc-600")}>{step.step}</span>
                            <span className="font-mono text-zinc-650">{step.duration}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

              </div>
            )}

            {/* TAB 2: REQUIREMENTS */}
            {activeTab === "requirements" && (
              <div className="space-y-6 max-w-4xl">
                
                <div className="pb-2 border-b border-zinc-900">
                  <h2 className="text-lg font-bold text-white tracking-tight">Structured System Requirements</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Auto-compiled from target codebase integrations and specifications.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Functional Requirements */}
                  <Card className="bg-[#0b0b0d] border-zinc-800/80 p-5 space-y-3">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Functional Scope</div>
                    <ul className="space-y-2">
                      {systemRequirements.functional.map((r, i) => (
                        <li key={i} className="text-xs text-zinc-300 leading-relaxed flex gap-2 items-start">
                          <span className="text-indigo-500 font-bold mt-0.5">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  {/* Non-Functional Requirements */}
                  <Card className="bg-[#0b0b0d] border-zinc-800/80 p-5 space-y-3">
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Non-Functional Limits</div>
                    <ul className="space-y-2">
                      {systemRequirements.nonFunctional.map((r, i) => (
                        <li key={i} className="text-xs text-zinc-300 leading-relaxed flex gap-2 items-start">
                          <span className="text-purple-500 font-bold mt-0.5">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>

                {/* Constraints & Assumptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Constraints */}
                  <Card className="bg-[#0b0b0d] border-zinc-800/80 p-5 space-y-3">
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Architectural Constraints</div>
                    <ul className="space-y-2">
                      {systemRequirements.constraints.map((r, i) => (
                        <li key={i} className="text-xs text-zinc-300 leading-relaxed flex gap-2 items-start">
                          <span className="text-red-500 font-bold mt-0.5">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  {/* Assumptions */}
                  <Card className="bg-[#0b0b0d] border-zinc-800/80 p-5 space-y-3">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Platform Assumptions</div>
                    <ul className="space-y-2">
                      {systemRequirements.assumptions.map((r, i) => (
                        <li key={i} className="text-xs text-zinc-300 leading-relaxed flex gap-2 items-start">
                          <span className="text-emerald-500 font-bold mt-0.5">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>

                {/* Open Questions */}
                <Card className="bg-[#0b0b0d] border-zinc-800/80 p-5 space-y-3">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Unresolved Architectural Questions
                  </div>
                  <ul className="space-y-2">
                    {systemRequirements.openQuestions.map((r, i) => (
                      <li key={i} className="text-xs text-zinc-300 leading-relaxed flex gap-2 items-start">
                        <span className="text-amber-500 font-bold mt-0.5">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </Card>

              </div>
            )}

            {/* TAB 3: CAPACITY PLANNING */}
            {activeTab === "capacity" && (
              <div className="space-y-6 max-w-4xl">
                
                <div className="pb-2 border-b border-zinc-900">
                  <h2 className="text-lg font-bold text-white tracking-tight">Scale & Capacity Estimates</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Calculated workloads at full peak retail traffic thresholds.</p>
                </div>

                {/* Metrics grids */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Daily Active Users", val: capacitySpecs.dau, color: "text-indigo-400" },
                    { label: "Peak QPS Volume", val: capacitySpecs.peakQps, color: "text-amber-400" },
                    { label: "Monthly Data Storage", val: capacitySpecs.storage, color: "text-emerald-400" },
                    { label: "Egress Bandwidth", val: capacitySpecs.bandwidth, color: "text-purple-400" }
                  ].map((spec, i) => (
                    <Card key={i} className="bg-[#0b0b0d] border-zinc-800 p-4 space-y-1">
                      <div className="text-[9px] font-bold text-zinc-550 uppercase tracking-wide">{spec.label}</div>
                      <div className={cn("text-base sm:text-lg font-extrabold font-mono", spec.color)}>{spec.val}</div>
                    </Card>
                  ))}
                </div>

                {/* Simulated visual bar charts */}
                <Card className="bg-[#0b0b0d] border-zinc-800 p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase text-zinc-400 tracking-wider">Active Bandwidth Resource Footprint</h3>
                  
                  <div className="space-y-3 pt-2">
                    {[
                      { label: "Peak Ingress Load", val: 25, color: "bg-indigo-500" },
                      { label: "Peak Egress load", val: 85, color: "bg-purple-500" },
                      { label: "Database Disk Inbound IOPS limits", val: 40, color: "bg-emerald-500" }
                    ].map((bar, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>{bar.label}</span>
                          <span className="font-mono text-[10px] text-zinc-500">{bar.val}% utilization SLA</span>
                        </div>
                        <div className="h-2 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", bar.color)} style={{ width: `${bar.val}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

              </div>
            )}

            {/* TAB 4: ARCHITECTURE SPEC (Interactive pannable canvas diagram) */}
            {activeTab === "architecture" && (
              <div className="space-y-4 h-full flex flex-col">
                
                <div className="flex items-center justify-between pb-2 border-b border-zinc-900 flex-shrink-0">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Interactive Topology Spec</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Drag to pan, scroll or click zoom keys to audit node routing values.</p>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-900 p-1 rounded-lg">
                    <button onClick={() => setZoomLevel(z => Math.min(z + 0.1, 1.8))} className="p-1.5 rounded hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setZoomLevel(z => Math.max(z - 0.1, 0.6))} className="p-1.5 rounded hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-zinc-800 mx-1" />
                    <button onClick={resetZoom} className="p-1.5 rounded hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Canvas viewport wrapper */}
                <div 
                  className="flex-1 border border-zinc-850 rounded-xl bg-zinc-950/80 relative overflow-hidden h-[380px] sm:h-[450px] cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  
                  {/* Micro-dot grid */}
                  <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] bg-[size:16px_16px] opacity-40" />

                  {/* Render Pannable & Zoomable content layer */}
                  <div 
                    className="absolute inset-0 origin-center transition-transform duration-75"
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
                    }}
                  >
                    
                    {/* SVG Connector links */}
                    <svg className="absolute inset-0 w-full h-full text-indigo-500/20 stroke-2" fill="none">
                      <path d="M 400,60 Q 250,160 200,240" />
                      <path d="M 400,60 Q 400,160 400,240" />
                      <path d="M 400,60 Q 550,160 600,240" />
                      
                      <path d="M 200,240 Q 250,320 280,360" />
                      <path d="M 400,240 Q 440,300 480,360" strokeDasharray="4 4" className="text-zinc-650" />
                      <path d="M 400,240 Q 340,300 280,360" />
                      <path d="M 600,240 Q 540,300 480,360" />
                    </svg>

                    {/* Nodes positioning */}
                    
                    {/* Gateway Node */}
                    <div className="absolute top-[30px] left-[320px] w-[160px] bg-zinc-950 border border-indigo-500/40 p-2.5 rounded-lg active-glow">
                      <div className="text-[8px] font-bold text-indigo-400 font-mono uppercase tracking-wider mb-1">API GATEWAY</div>
                      <div className="text-xs font-bold text-white">go-gateway</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Port 8080 · Chi Router</div>
                    </div>

                    {/* Auth Svc */}
                    <div className="absolute top-[200px] left-[100px] w-[150px] bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg">
                      <div className="text-[8px] font-bold text-zinc-400 font-mono uppercase tracking-wider mb-1">MICROSERVICE</div>
                      <div className="text-xs font-bold text-white">auth-service</div>
                      <div className="text-[10px] text-zinc-550 mt-0.5">JWT Session validation</div>
                    </div>

                    {/* Payment Svc */}
                    <div className="absolute top-[200px] left-[320px] w-[160px] bg-zinc-950 border border-red-500/40 p-2.5 rounded-lg">
                      <div className="text-[8px] font-bold text-red-400 font-mono uppercase tracking-wider mb-1">MICROSERVICE</div>
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        payments-service
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">1 SPOF vulnerability</div>
                    </div>

                    {/* Notification Svc */}
                    <div className="absolute top-[200px] left-[520px] w-[150px] bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg">
                      <div className="text-[8px] font-bold text-zinc-400 font-mono uppercase tracking-wider mb-1">MICROSERVICE</div>
                      <div className="text-xs font-bold text-white">notification-service</div>
                      <div className="text-[10px] text-zinc-550 mt-0.5">Kafka async events publisher</div>
                    </div>

                    {/* PostgreSQL */}
                    <div className="absolute top-[340px] left-[200px] w-[160px] bg-zinc-950 border border-emerald-500/30 p-2.5 rounded-lg">
                      <div className="text-[8px] font-bold text-emerald-400 font-mono uppercase tracking-wider mb-1">RELATIONAL STORE</div>
                      <div className="text-xs font-bold text-white">postgresql (pgx pool)</div>
                      <div className="text-[10px] text-zinc-550 mt-0.5">3 schema tables indexed</div>
                    </div>

                    {/* Redis Cache */}
                    <div className="absolute top-[340px] left-[400px] w-[150px] bg-zinc-950 border border-blue-500/30 p-2.5 rounded-lg">
                      <div className="text-[8px] font-bold text-blue-400 font-mono uppercase tracking-wider mb-1">IN-MEMORY CACHE</div>
                      <div className="text-xs font-bold text-white">redis-cache</div>
                      <div className="text-[10px] text-zinc-550 mt-0.5">TTL: 900s tokens storage</div>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* TAB 5: DATABASE DESIGN */}
            {activeTab === "data-model" && (
              <div className="space-y-6 max-w-4xl">
                
                <div className="pb-2 border-b border-zinc-900">
                  <h2 className="text-lg font-bold text-white tracking-tight">Database Architecture Schema</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Recommended engine selection, active composite indexing scripts, and partitioned schemas.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="bg-[#0b0b0d] border-zinc-800 p-4 space-y-1.5">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase">Recommended Storage Engine</div>
                    <p className="text-sm font-bold text-white">{databaseSchema.recommendation}</p>
                  </Card>

                  <Card className="bg-[#0b0b0d] border-zinc-800 p-4 space-y-1.5">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase">Partition Strategy</div>
                    <p className="text-sm font-bold text-white font-mono text-xs">{databaseSchema.partitioning}</p>
                  </Card>
                </div>

                {/* Indexing Recommendations */}
                <Card className="bg-[#0b0b0d] border-zinc-800 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase text-zinc-400 tracking-wider">Index Auto-Tuning recommendations</h3>
                  <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-3 font-mono text-[10px] text-zinc-400 space-y-2 leading-relaxed">
                    {databaseSchema.indexing.map((idx, i) => (
                      <p key={i} className="text-indigo-300">{idx}</p>
                    ))}
                  </div>
                </Card>

                {/* Dynamic Table Schemas */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase text-zinc-400 tracking-wider">Indexed Schema Fields</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {databaseSchema.tables.map(table => (
                      <Card key={table.name} className="bg-[#0b0b0d] border-zinc-850 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                          <span className="text-xs font-bold font-mono text-white">{table.name}</span>
                          <Badge className="text-[9px] bg-zinc-900 text-zinc-500 border border-zinc-800">table</Badge>
                        </div>
                        <div className="space-y-2">
                          {table.columns.map(col => (
                            <div key={col.name} className="text-[10px] space-y-0.5">
                              <div className="flex items-center justify-between font-mono">
                                <span className="text-zinc-300 font-semibold">{col.name}</span>
                                <span className="text-indigo-400/80">{col.type}</span>
                              </div>
                              <p className="text-zinc-600 leading-snug">{col.desc}</p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 6: API DESIGN */}
            {activeTab === "apis" && (
              <div className="space-y-6 max-w-4xl">
                
                <div className="pb-2 border-b border-zinc-900">
                  <h2 className="text-lg font-bold text-white tracking-tight">API Interface Contracts</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Structured REST querying endpoints and inter-service gRPC protobuf specifications.</p>
                </div>

                {/* REST Endpoint Grid */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase text-zinc-400 tracking-wider">REST Gateway Endpoint payload Contracts</h3>
                  
                  <div className="border border-zinc-850 rounded-lg overflow-hidden bg-zinc-950/20">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-900 bg-zinc-900/10">
                          <th className="text-left p-3 text-zinc-650 uppercase font-mono text-[9px]">Method</th>
                          <th className="text-left p-3 text-zinc-650 uppercase font-mono text-[9px]">Endpoint Path</th>
                          <th className="text-left p-3 text-zinc-650 uppercase font-mono text-[9px]">Diagnostic Scope</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {apiSpecs.rest.map((endpoint, i) => (
                          <tr key={i} className="hover:bg-zinc-900/10">
                            <td className="p-3">
                              <Badge className={cn(
                                "text-[9px] font-bold font-mono px-1.5",
                                endpoint.method === "POST" ? "bg-indigo-500/10 text-indigo-450 border border-indigo-500/20" : "bg-emerald-500/10 text-emerald-450"
                              )}>
                                {endpoint.method}
                              </Badge>
                            </td>
                            <td className="p-3 font-mono text-[10px] text-zinc-250">{endpoint.path}</td>
                            <td className="p-3 text-zinc-500 leading-snug">{endpoint.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* gRPC Protobuf Spec */}
                <Card className="bg-[#0b0b0d] border-zinc-800 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase text-zinc-400 tracking-wider">Inter-Service gRPC Protobuf Spec</h3>
                  <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 font-mono text-[10.5px] text-indigo-300 leading-relaxed overflow-x-auto whitespace-pre">
                    {apiSpecs.grpc}
                  </div>
                </Card>

              </div>
            )}

            {/* TAB 7 & 8: SECURITY & RELIABILITY */}
            {(activeTab === "security" || activeTab === "reliability") && (
              <div className="space-y-6 max-w-4xl">
                
                <div className="pb-2 border-b border-zinc-900">
                  <h2 className="text-lg font-bold text-white tracking-tight capitalize">{activeTab} Review Findings</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Critical, high, and informational findings compiled by isolated AI agent review nodes.</p>
                </div>

                <div className="space-y-3">
                  {findings
                    .filter(f => activeTab === "security" ? f.agent.includes("Security") : !f.agent.includes("Security"))
                    .map(finding => {
                      const config = severityConfig[finding.severity] || severityConfig.info;
                      return (
                        <Card key={finding.id} className="bg-[#0b0b0d] border-zinc-800 p-4 space-y-3 shadow-md">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 border", config.bg, config.color)}>
                                {finding.severity}
                              </Badge>
                              <span className="text-[10px] text-zinc-550 font-mono">{finding.agent}</span>
                            </div>
                            <Badge className="text-[9px] bg-zinc-950 text-zinc-500 border border-zinc-900">
                              {finding.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-white">{finding.title}</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed">{finding.description}</p>
                          </div>

                          {finding.file && (
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-650 font-mono bg-zinc-950/60 p-1.5 rounded border border-zinc-900">
                              <Code className="w-3.5 h-3.5 text-zinc-600" />
                              {finding.file}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                </div>

              </div>
            )}

            {/* TAB 9: EXPORT DOCUMENTATION */}
            {activeTab === "export" && (
              <div className="space-y-6 max-w-4xl animate-fade-in">
                
                <div className="pb-2 border-b border-zinc-900">
                  <h2 className="text-lg font-bold text-white tracking-tight">Export Architecture Artifacts</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Download or export complete system spec sheets, interactive schemas, and ADR logs.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* PDF Export */}
                  <Card className="bg-[#0b0b0d] border-zinc-800/80 p-5 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="w-8 h-8 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-red-400" />
                      </div>
                      <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Executive PDF Report</h3>
                      <p className="text-xs text-zinc-550 leading-relaxed">
                        Compiles functional requirements, capacity estimations, API contracts, threat model, reliability checklists, and tradeoff rationales into a single premium engineering document.
                      </p>
                    </div>
                    <Button className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs h-9 font-semibold">
                      Download PDF Document
                    </Button>
                  </Card>

                  {/* Markdown Export */}
                  <Card className="bg-[#0b0b0d] border-zinc-800/80 p-5 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="w-8 h-8 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <Code className="w-4 h-4 text-indigo-400" />
                      </div>
                      <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">GitHub Flavored Markdown</h3>
                      <p className="text-xs text-zinc-550 leading-relaxed">
                        Generates a single markdown file optimized for direct placement inside your project wiki directories, GitHub repository docs, or Notion engineering databases.
                      </p>
                    </div>
                    <Button className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs h-9 font-semibold">
                      Download Markdown Spec
                    </Button>
                  </Card>

                  {/* Mermaid Export */}
                  <Card className="bg-[#0b0b0d] border-zinc-800/80 p-5 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Hexagon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Mermaid Flowchart Code</h3>
                      <p className="text-xs text-zinc-550 leading-relaxed">
                        Extracts the central active topology spec into fully compatible Mermaid flowchart code that renders dynamically inside GitHub READMEs and markdown files.
                      </p>
                    </div>
                    <Button className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs h-9 font-semibold">
                      Copy Mermaid Code
                    </Button>
                  </Card>

                  {/* PlantUML Export */}
                  <Card className="bg-[#0b0b0d] border-zinc-800/80 p-5 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="w-8 h-8 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-purple-400" />
                      </div>
                      <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">PlantUML Spec Sheet</h3>
                      <p className="text-xs text-zinc-550 leading-relaxed">
                        Compiles class-like service definitions and ER mappings to PlantUML syntax models, ideal for enterprise systems reviews.
                      </p>
                    </div>
                    <Button className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs h-9 font-semibold">
                      Download PlantUML Spec
                    </Button>
                  </Card>

                </div>

              </div>
            )}

            {/* TAB 10: TRADEOFFS */}
            {activeTab === "tradeoffs" && (
              <div className="space-y-6 max-w-4xl">
                
                <div className="pb-2 border-b border-zinc-900">
                  <h2 className="text-lg font-bold text-white tracking-tight">Architectural Tradeoff Analysis (ADR)</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Architecture Decision Records comparing selected approaches against alternatives.</p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold font-mono text-zinc-400">{tradeoffsCompare.title}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tradeoffsCompare.prosCons.map((node, i) => (
                      <Card key={i} className="bg-[#0b0b0d] border-zinc-800/80 p-5 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                          <span className="text-sm font-bold text-white">{node.engine}</span>
                          {i === 0 && <Badge className="text-[9px] bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">Selected</Badge>}
                        </div>

                        {/* Pros */}
                        <div className="space-y-2">
                          <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">PROS</div>
                          <ul className="space-y-1.5">
                            {node.pros.map((pro, pidx) => (
                              <li key={pidx} className="text-xs text-zinc-300 leading-relaxed flex gap-2 items-start">
                                <span className="text-emerald-500 font-bold mt-0.5">•</span>
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Cons */}
                        <div className="space-y-2">
                          <div className="text-[9px] font-bold text-red-400 uppercase tracking-widest">CONS</div>
                          <ul className="space-y-1.5">
                            {node.cons.map((con, cidx) => (
                              <li key={cidx} className="text-xs text-zinc-300 leading-relaxed flex gap-2 items-start">
                                <span className="text-red-500 font-bold mt-0.5">•</span>
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Rationale */}
                        <div className="pt-3 border-t border-zinc-900 space-y-1">
                          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Decision Rationale</div>
                          <p className="text-xs text-zinc-400 leading-relaxed italic">{node.decision}</p>
                        </div>

                      </Card>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Simple canvas controls footer */}
          <div className="h-10 border-t border-zinc-900/60 bg-[#08080a]/60 flex items-center justify-between px-6 text-[10px] text-zinc-600 flex-shrink-0 font-mono">
            <span>Terminal socket: verified OK</span>
            <span>Archon Architect Engine v0.1.0</span>
          </div>
        </main>

        {/* COLUMN C: RIGHT PANEL (Design rationale and agent recommendations) */}
        <aside className="w-72 border-l border-zinc-900 bg-[#08080a] p-4 flex flex-col justify-between overflow-y-auto flex-shrink-0">
          
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-zinc-650 uppercase tracking-widest font-mono">Agent Recommendations</p>
              <h3 className="text-xs font-semibold text-zinc-300 mt-2">Acme Payments Service</h3>
            </div>

            {/* Recommendations bullet blocks */}
            <div className="space-y-4">
              {[
                { title: "Fix permanent JWT expiration", desc: "JWT bearer auth tokens are currently issued with no expiration limit. Switch to a standard 15-minute token lifetime.", severity: "critical" },
                { title: "Add circuit breakers on Stripe integration", desc: "Outages on external APIs will lock the gateway hot-path threads. Implement robust failure fallbacks.", severity: "high" },
                { title: "Index payment transaction records query", desc: "Query scans are currently linear. Generate query composite index idx_payments_status on table schema.", severity: "medium" }
              ].map((rec, i) => (
                <div key={i} className="bg-zinc-950/60 border border-zinc-900 p-3.5 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className={cn(
                      "w-3.5 h-3.5",
                      rec.severity === "critical" ? "text-red-400" :
                      rec.severity === "high" ? "text-orange-400" :
                      "text-amber-400"
                    )} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">{rec.severity}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{rec.title}</h4>
                  <p className="text-[11px] text-zinc-550 leading-relaxed">{rec.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick diagnostic timeline at bottom of right drawer */}
          <div className="pt-4 border-t border-zinc-900 space-y-2">
            <div className="text-[10px] font-bold text-zinc-650 uppercase tracking-widest font-mono mb-2">Agent Health</div>
            <div className="space-y-2 text-xs">
              {[
                { name: "Scalability Agent", status: "completed", val: 100 },
                { name: "Security Agent", status: "completed", val: 100 },
                { name: "Database Agent", status: "completed", val: 100 }
              ].map(ag => (
                <div key={ag.name} className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">{ag.name}</span>
                  <Badge className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 font-mono">ok</Badge>
                </div>
              ))}
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
}
