"use client";

import { useState } from "react";
import {
  FileText, MessageSquare, Cpu, Layers, Database, 
  Code2, Download, ChevronRight, ChevronLeft,
  CheckCircle2, Clock, Loader2, ThumbsUp, ThumbsDown,
  Sparkles, AlertCircle, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Workflow steps definition ────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  { id: "prd",           icon: FileText,      label: "PRD Upload",          desc: "Requirements document" },
  { id: "clarification", icon: MessageSquare, label: "Clarifications",       desc: "AI questions answered" },
  { id: "cpm",           icon: Cpu,           label: "CPM Review",           desc: "Conceptual project model" },
  { id: "architecture",  icon: Layers,        label: "Architecture Review",  desc: "High-level system design" },
  { id: "database",      icon: Database,      label: "Database Review",      desc: "Schema & storage design" },
  { id: "api",           icon: Code2,         label: "API Review",           desc: "OpenAPI specification" },
  { id: "exports",       icon: Download,      label: "Exports",              desc: "Download final report" },
];

type StepState = "pending" | "active" | "awaiting" | "done" | "error";

// Mock state for UI demo
const MOCK_STEP_STATES: Record<string, StepState> = {
  prd: "done",
  clarification: "done",
  cpm: "done",
  architecture: "awaiting",
  database: "pending",
  api: "pending",
  exports: "pending",
};

const MOCK_ARCHITECTURE = `## System Architecture

**Pattern**: Microservices

### Services

**API Gateway**
- Route all client traffic
- Rate limiting, auth validation
- Tech: Kong / Nginx

**User Service**
- Registration, authentication, profile
- Tech: Go + PostgreSQL

**Order Service**  
- Order lifecycle management
- Tech: Go + PostgreSQL + Redis

**Payment Service**
- Stripe integration, transaction ledger
- Tech: Go + PostgreSQL

**Notification Service**
- Email / push / SMS delivery
- Tech: Python + RabbitMQ

### Infrastructure
- Load Balancer: AWS ALB
- Cache: Redis Cluster
- Queue: RabbitMQ
- Storage: S3 + RDS PostgreSQL`;

const MOCK_CPM = `## Conceptual Project Model

**Actors**: Customer, Driver, Admin, System

**Core Entities**
- User, Trip, Payment, Vehicle, Rating

**Key Features**
- Real-time driver matching
- GPS tracking
- Payment processing (Stripe)
- Rating system
- Surge pricing

**Integrations**
- Stripe Payments
- Google Maps API
- Twilio SMS
- Firebase Push Notifications

**Scale Requirements**
- 10M DAU, 25,000 peak QPS
- 99.99% availability
- <200ms API latency`;

export default function DesignPage() {
  const [activeStep, setActiveStep] = useState("architecture");
  const [stepStates, setStepStates] = useState(MOCK_STEP_STATES);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const currentIdx = WORKFLOW_STEPS.findIndex(s => s.id === activeStep);

  const handleApprove = (stepId: string) => {
    setStepStates(prev => ({ ...prev, [stepId]: "done" }));
    // Activate next step
    const idx = WORKFLOW_STEPS.findIndex(s => s.id === stepId);
    if (idx < WORKFLOW_STEPS.length - 1) {
      const nextId = WORKFLOW_STEPS[idx + 1].id;
      setStepStates(prev => ({ ...prev, [nextId]: "awaiting" }));
      setActiveStep(nextId);
    }
    setShowFeedback(false);
    setFeedback("");
  };

  const handleFeedbackSubmit = (stepId: string) => {
    setStepStates(prev => ({ ...prev, [stepId]: "active" }));
    setShowFeedback(false);
    setFeedback("");
    // Simulate regeneration
    setTimeout(() => {
      setStepStates(prev => ({ ...prev, [stepId]: "awaiting" }));
    }, 1500);
  };

  return (
    <div className="flex h-full min-h-screen bg-[#0a0a0b]">
      {/* ── Left: step rail ─────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 border-r border-zinc-800/60 p-4 flex flex-col gap-1">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-2 pb-2">Design Workflow</p>
        {WORKFLOW_STEPS.map((step, i) => {
          const state = stepStates[step.id];
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          return (
            <button
              key={step.id}
              onClick={() => state !== "pending" && setActiveStep(step.id)}
              disabled={state === "pending"}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
                isActive ? "bg-indigo-950/60 border border-indigo-500/30" : "hover:bg-zinc-800/30",
                state === "pending" && "opacity-40 cursor-not-allowed"
              )}
            >
              {/* Step number / status icon */}
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all",
                state === "done" ? "bg-emerald-500/20 border border-emerald-500/30" :
                state === "awaiting" ? "bg-amber-500/20 border border-amber-500/30 ring-2 ring-amber-500/20" :
                state === "active" ? "bg-indigo-500/20 border border-indigo-500/30 animate-pulse" :
                "bg-zinc-800 border border-zinc-700"
              )}>
                {state === "done" ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> :
                 state === "awaiting" ? <Clock className="w-3 h-3 text-amber-400" /> :
                 state === "active" ? <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" /> :
                 <span className="text-zinc-500">{i + 1}</span>}
              </div>

              <div className="min-w-0">
                <p className={cn("text-xs font-medium leading-none mb-0.5", isActive ? "text-indigo-300" : state !== "pending" ? "text-zinc-300" : "text-zinc-600")}>
                  {step.label}
                </p>
                <p className="text-[10px] text-zinc-600 truncate">{step.desc}</p>
              </div>

              {i < WORKFLOW_STEPS.length - 1 && (
                <div className={cn("absolute left-[1.85rem] mt-10 w-px h-3 bg-zinc-800")} />
              )}
            </button>
          );
        })}
      </aside>

      {/* ── Right: active step content ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-6 max-w-4xl">
        {/* Step header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StepBadge state={stepStates[activeStep]} />
              <span className="text-xs text-zinc-500">Step {currentIdx + 1} of {WORKFLOW_STEPS.length}</span>
            </div>
            <h1 className="text-xl font-semibold text-zinc-100">
              {WORKFLOW_STEPS[currentIdx]?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" size="sm"
              onClick={() => currentIdx > 0 && setActiveStep(WORKFLOW_STEPS[currentIdx - 1].id)}
              disabled={currentIdx === 0}
              className="h-8 text-xs gap-1 text-zinc-400"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => currentIdx < WORKFLOW_STEPS.length - 1 && setActiveStep(WORKFLOW_STEPS[currentIdx + 1].id)}
              disabled={currentIdx === WORKFLOW_STEPS.length - 1 || stepStates[WORKFLOW_STEPS[currentIdx + 1]?.id] === "pending"}
              className="h-8 text-xs gap-1 text-zinc-400"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* ── PRD (done) ─────────────────────────────────── */}
        {activeStep === "prd" && (
          <StepDoneCard title="PRD Uploaded" message="Your product requirements document has been processed successfully." />
        )}

        {/* ── Clarifications (done) ─────────────────────── */}
        {activeStep === "clarification" && (
          <StepDoneCard title="Clarifications Resolved" message="All clarifying questions have been answered. The AI has a complete understanding of your requirements." />
        )}

        {/* ── CPM (done) ─────────────────────────────────── */}
        {activeStep === "cpm" && (
          <div>
            <Card className="bg-[#111113] border-zinc-800/60 p-5 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Conceptual Project Model</h2>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] ml-auto">Approved</Badge>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono bg-zinc-900/60 rounded-lg p-4 border border-zinc-800/60">{MOCK_CPM}</pre>
              </div>
            </Card>
          </div>
        )}

        {/* ── Architecture (awaiting) ────────────────────── */}
        {activeStep === "architecture" && (
          <div className="space-y-4">
            {stepStates.architecture === "active" ? (
              <RegeneratingCard label="Regenerating architecture..." />
            ) : (
              <>
                <Card className="bg-[#111113] border-zinc-800/60 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <h2 className="text-sm font-semibold text-zinc-100">System Architecture</h2>
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] ml-auto">Awaiting Approval</Badge>
                  </div>
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono bg-zinc-900/60 rounded-lg p-4 border border-zinc-800/60">{MOCK_ARCHITECTURE}</pre>
                </Card>

                <ApprovalPanel
                  stepId="architecture"
                  onApprove={handleApprove}
                  onFeedback={() => setShowFeedback(v => !v)}
                  showFeedback={showFeedback}
                  feedback={feedback}
                  setFeedback={setFeedback}
                  onFeedbackSubmit={handleFeedbackSubmit}
                />
              </>
            )}
          </div>
        )}

        {/* ── Database (pending) ─────────────────────────── */}
        {activeStep === "database" && stepStates.database === "pending" && (
          <PendingCard label="Database design will be generated after architecture is approved." />
        )}
        {activeStep === "database" && stepStates.database === "awaiting" && (
          <div className="space-y-4">
            <Card className="bg-[#111113] border-zinc-800/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Database Schema</h2>
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] ml-auto">Awaiting Approval</Badge>
              </div>
              <p className="text-xs text-zinc-400">Database schema will be generated here...</p>
            </Card>
            <ApprovalPanel stepId="database" onApprove={handleApprove} onFeedback={() => setShowFeedback(v => !v)} showFeedback={showFeedback} feedback={feedback} setFeedback={setFeedback} onFeedbackSubmit={handleFeedbackSubmit} />
          </div>
        )}

        {/* ── API (pending) ──────────────────────────────── */}
        {activeStep === "api" && stepStates.api === "pending" && (
          <PendingCard label="API specification will be generated after database design is approved." />
        )}

        {/* ── Exports (pending) ─────────────────────────── */}
        {activeStep === "exports" && stepStates.exports === "pending" && (
          <PendingCard label="Exports will be available once all design phases are approved." />
        )}
        {activeStep === "exports" && stepStates.exports !== "pending" && (
          <ExportsPanel />
        )}
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StepBadge({ state }: { state: StepState }) {
  if (state === "done") return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] gap-1"><CheckCircle2 className="w-3 h-3" />Done</Badge>;
  if (state === "awaiting") return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] gap-1"><Clock className="w-3 h-3" />Awaiting Approval</Badge>;
  if (state === "active") return <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] gap-1"><Loader2 className="w-3 h-3 animate-spin" />Generating</Badge>;
  return <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-[10px] gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
}

function StepDoneCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="bg-[#111113] border-zinc-800/60 p-8 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
      </div>
      <h2 className="text-base font-semibold text-zinc-100 mb-2">{title}</h2>
      <p className="text-sm text-zinc-400 max-w-md">{message}</p>
    </Card>
  );
}

function PendingCard({ label }: { label: string }) {
  return (
    <Card className="bg-[#111113] border-zinc-800/60 border-dashed p-8 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-zinc-600" />
      </div>
      <p className="text-sm text-zinc-500 max-w-md">{label}</p>
    </Card>
  );
}

function RegeneratingCard({ label }: { label: string }) {
  return (
    <Card className="bg-[#111113] border-zinc-800/60 p-8 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
      <p className="text-sm text-zinc-400">{label}</p>
    </Card>
  );
}

function ApprovalPanel({
  stepId, onApprove, onFeedback, showFeedback, feedback, setFeedback, onFeedbackSubmit
}: {
  stepId: string;
  onApprove: (id: string) => void;
  onFeedback: () => void;
  showFeedback: boolean;
  feedback: string;
  setFeedback: (v: string) => void;
  onFeedbackSubmit: (id: string) => void;
}) {
  return (
    <Card className="bg-[#111113] border-zinc-800/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <p className="text-xs font-semibold text-zinc-300">Review & Approve</p>
      </div>
      <div className="flex gap-2 mb-3">
        <Button
          id={`approve-${stepId}`}
          size="sm"
          onClick={() => onApprove(stepId)}
          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
        >
          <ThumbsUp className="w-3.5 h-3.5" /> Approve
        </Button>
        <Button
          id={`feedback-${stepId}`}
          variant="ghost"
          size="sm"
          onClick={onFeedback}
          className="h-8 text-xs text-zinc-400 hover:text-zinc-200 gap-1.5 border border-zinc-800"
        >
          <ThumbsDown className="w-3.5 h-3.5" /> Request Changes
        </Button>
      </div>
      {showFeedback && (
        <div className="space-y-2">
          <Textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Describe what needs to change..."
            className="h-24 bg-zinc-950/60 border-zinc-800 text-xs text-zinc-300 focus:border-indigo-500/50 resize-none"
          />
          <Button
            size="sm"
            onClick={() => onFeedbackSubmit(stepId)}
            disabled={!feedback.trim()}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
          >
            Regenerate
          </Button>
        </div>
      )}
    </Card>
  );
}

function ExportsPanel() {
  const exports = [
    { label: "Architecture Report", ext: "PDF", size: "2.4 MB" },
    { label: "Database Schema", ext: "SQL", size: "18 KB" },
    { label: "API Specification", ext: "YAML", size: "42 KB" },
    { label: "Full Design Bundle", ext: "ZIP", size: "5.1 MB" },
  ];
  return (
    <div className="space-y-3">
      <Card className="bg-[#111113] border-zinc-800/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Export Artifacts</h2>
        </div>
        <div className="space-y-2">
          {exports.map(e => (
            <div key={e.label} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700/60 transition-all">
              <div className="flex items-center gap-3">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{e.ext}</span>
                <span className="text-xs text-zinc-300">{e.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-600">{e.size}</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-400 hover:text-zinc-200 gap-1">
                  <Download className="w-3 h-3" /> Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
