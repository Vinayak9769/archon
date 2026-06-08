"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Upload, FileText, CheckCircle2, Circle,
  TrendingUp, Database, Shield, DollarSign,
  Zap, Loader2, Play, Sparkles, AlertCircle, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const AGENT_OPTIONS = [
  { id: "capacity", label: "Capacity Planning Node", icon: TrendingUp, desc: "Profiles DAU, storage loads, and network bandwidth spikes.", color: "text-indigo-400" },
  { id: "database", label: "Database Design Node", icon: Database, desc: "Recommends query index schema updates and replication topology.", color: "text-blue-400" },
  { id: "api", label: "API Design Node", icon: Zap, desc: "Constructs gRPC contracts and secure REST payloads.", color: "text-yellow-400" },
  { id: "security", label: "Security Review Node", icon: Shield, desc: "Checks credential authorization mapping and secrets leaks.", color: "text-red-400" },
  { id: "reliability", label: "Reliability Review Node", icon: Sparkles, desc: "Evaluates single point failure mitigation strategies.", color: "text-purple-400" },
  { id: "cost", label: "Cost Estimation Node", icon: DollarSign, desc: "Estimates monthly database, cache, and token usage footprints.", color: "text-green-400" },
];

export default function NewDesignPage() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // 7 core inputs
  const [formData, setFormData] = useState({
    productName: "Acme Payments Service",
    problemStatement: "High-latency transactional pipeline and single point database master failover hazards.",
    description: "A secure, resilient developer payment gateway mapping multiple regional processors to standard pgx databases.",
    expectedUsers: "2.5 Million Active Developers",
    expectedScale: "Peak load reaching 12,500 Requests/Sec during season releases.",
    availability: "99.99% critical-path transaction availability SLA.",
    latency: "Sub-150ms round-trip REST processing limits.",
  });

  // Optional PRD state
  const [prdUploaded, setPrdUploaded] = useState(false);
  const [bizReqUploaded, setBizReqUploaded] = useState(false);

  // Enabled Agents options
  const [enabledAgents, setEnabledAgents] = useState<Record<string, boolean>>({
    capacity: true,
    database: true,
    api: true,
    security: true,
    reliability: true,
    cost: false,
  });

  const toggleAgent = (id: string) => setEnabledAgents(p => ({ ...p, [id]: !p[id] }));

  const handleGenerate = () => {
    setRunning(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 8;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          router.push("/analyses/anl_01"); // Route straight to payments-service completed view
        }, 300);
      }
    }, 120);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 relative selection:bg-indigo-500/30">
      
      {/* Glow Backdrop */}
      <div className="absolute top-[-10%] right-[10%] w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="pb-4 border-b border-zinc-900">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono text-indigo-400 mb-2.5 tracking-wider uppercase">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          Workspace Architect Engine
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Create New Design Project</h1>
        <p className="text-sm text-zinc-400 mt-1">Specify problem structures, SLA targets, and activate analysis review nodes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Form: Inputs */}
        <div className="md:col-span-7 space-y-6">
          
          <Card className="bg-[#0b0b0d]/80 border-zinc-800/80 p-5 md:p-6 space-y-5 shadow-xl shadow-black/20">
            <h2 className="text-sm font-bold text-white tracking-tight uppercase text-zinc-400 border-b border-zinc-900 pb-2">1. Core Design Inputs</h2>

            <div className="space-y-4">
              {/* Product Name */}
              <div className="space-y-1.5">
                <Label htmlFor="productName" className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Product Name</Label>
                <Input 
                  id="productName" 
                  value={formData.productName} 
                  onChange={e => setFormData({ ...formData, productName: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 focus:border-indigo-500 text-zinc-200 text-sm h-9" 
                  placeholder="e.g. Acme Billing Engine"
                />
              </div>

              {/* Problem Statement */}
              <div className="space-y-1.5">
                <Label htmlFor="problemStatement" className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Problem Statement</Label>
                <Textarea 
                  id="problemStatement" 
                  value={formData.problemStatement} 
                  onChange={e => setFormData({ ...formData, problemStatement: e.target.value })}
                  rows={2}
                  className="bg-zinc-950 border-zinc-800 focus:border-indigo-500 text-zinc-200 text-sm resize-none"
                  placeholder="What architectural issues are we addressing?"
                />
              </div>

              {/* Product Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Product Description</Label>
                <Textarea 
                  id="description" 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="bg-zinc-950 border-zinc-800 focus:border-indigo-500 text-zinc-200 text-sm resize-none"
                  placeholder="Describe the product narrative and active functionalities..."
                />
              </div>

              {/* Grid for users & scale */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="expectedUsers" className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Expected Users</Label>
                  <Input 
                    id="expectedUsers" 
                    value={formData.expectedUsers} 
                    onChange={e => setFormData({ ...formData, expectedUsers: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 text-zinc-200 text-sm h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expectedScale" className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Expected Scale</Label>
                  <Input 
                    id="expectedScale" 
                    value={formData.expectedScale} 
                    onChange={e => setFormData({ ...formData, expectedScale: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 text-zinc-200 text-sm h-9"
                  />
                </div>
              </div>

              {/* Grid for availability & latency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="availability" className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Availability (SLA)</Label>
                  <Input 
                    id="availability" 
                    value={formData.availability} 
                    onChange={e => setFormData({ ...formData, availability: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 text-zinc-200 text-sm h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="latency" className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Latency SLA</Label>
                  <Input 
                    id="latency" 
                    value={formData.latency} 
                    onChange={e => setFormData({ ...formData, latency: e.target.value })}
                    className="bg-zinc-950 border-zinc-800 text-zinc-200 text-sm h-9"
                  />
                </div>
              </div>

            </div>
          </Card>

          {/* Optional Upload Section */}
          <Card className="bg-[#0b0b0d]/80 border-zinc-800/80 p-5 md:p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white tracking-tight uppercase text-zinc-400 border-b border-zinc-900 pb-2">2. Optional Specifications</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* PRD Upload */}
              <div 
                onClick={() => setPrdUploaded(!prdUploaded)}
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                  prdUploaded ? "border-indigo-500/50 bg-indigo-500/5" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"
                )}
              >
                <FileText className={cn("w-6 h-6 mx-auto mb-2", prdUploaded ? "text-indigo-400" : "text-zinc-500")} />
                <p className="text-xs font-semibold text-zinc-300">Upload Product PRD</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">Supports MD, PDF, DOCX</p>
                {prdUploaded && (
                  <Badge className="text-[9px] bg-indigo-600/10 text-indigo-400 border-indigo-500/20 mt-2 px-1.5 font-mono">
                    payments-service-prd.md
                  </Badge>
                )}
              </div>

              {/* Biz Requirements Upload */}
              <div 
                onClick={() => setBizReqUploaded(!bizReqUploaded)}
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
                  bizReqUploaded ? "border-indigo-500/50 bg-indigo-500/5" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/20"
                )}
              >
                <Upload className={cn("w-6 h-6 mx-auto mb-2", bizReqUploaded ? "text-indigo-400" : "text-zinc-500")} />
                <p className="text-xs font-semibold text-zinc-300">Business Requirements</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">Supports PDF, JSON, PPTX</p>
                {bizReqUploaded && (
                  <Badge className="text-[9px] bg-indigo-600/10 text-indigo-400 border-indigo-500/20 mt-2 px-1.5 font-mono">
                    acme-biz-caps.pdf
                  </Badge>
                )}
              </div>

            </div>
          </Card>

        </div>

        {/* Right Sidebar: Agent Selections & CTA */}
        <div className="md:col-span-5 space-y-6">
          
          <Card className="bg-[#0b0b0d]/80 border-zinc-800/80 p-5 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-white tracking-tight uppercase text-zinc-400 border-b border-zinc-900 pb-2">3. Analysis Options</h2>

            <div className="space-y-2">
              {AGENT_OPTIONS.map(({ id, label, icon: Icon, desc, color }) => {
                const active = !!enabledAgents[id];
                return (
                  <div 
                    key={id} 
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                      active ? "border-zinc-850 bg-zinc-900/20" : "border-transparent bg-transparent opacity-50"
                    )}
                  >
                    <div className="w-7 h-7 rounded bg-zinc-950 border border-zinc-850 flex items-center justify-center flex-shrink-0">
                      <Icon className={cn("w-3.5 h-3.5", color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-300">{label}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug truncate">{desc}</p>
                    </div>
                    <Switch 
                      checked={active} 
                      onCheckedChange={() => toggleAgent(id)}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>
                );
              })}
            </div>

            {/* Run generation CTA */}
            <div className="pt-4 border-t border-zinc-900 space-y-3">
              {running && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                      Bootstrapping analysis...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1 bg-zinc-900" />
                </div>
              )}

              <Button 
                onClick={handleGenerate} 
                disabled={running}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 text-white font-semibold text-sm rounded-lg gap-2 shadow-lg shadow-indigo-600/10 transition-all active:scale-[0.98]"
              >
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Architecture...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Generate Architecture
                  </>
                )}
              </Button>
            </div>
          </Card>

        </div>

      </div>

    </div>
  );
}
