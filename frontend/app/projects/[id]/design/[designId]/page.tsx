"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  FileText, MessageSquare, Cpu, Layers, Database,
  Code2, Download, ChevronRight, ChevronLeft,
  CheckCircle2, Clock, Loader2, ThumbsUp, ThumbsDown,
  Sparkles, AlertCircle, RefreshCw, Users, Star,
  GitMerge, Network, CheckSquare, Shield, HelpCircle,
  AlertOctagon, Server, Globe, Lock, Unlock, Table, Eye, X, Send, Maximize2, ArrowRight, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiGetDesign, apiResumeDesign, apiDownloadZip, apiDownloadFile, type Design } from "@/lib/api";
import dynamic from "next/dynamic";

const MermaidVisualizer = dynamic(() => import("./MermaidVisualizer"), {
  ssr: false,
});

const DatabaseSchemaVisualizer = dynamic(() => import("./DatabaseSchemaVisualizer"), {
  ssr: false,
});

// ── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "clarification", icon: MessageSquare, label: "Clarifications",       interrupt: "clarification" },
  { id: "cpm",           icon: Cpu,           label: "CPM Review",           interrupt: "cpm_approval" },
  { id: "architecture",  icon: Layers,        label: "Architecture Review",  interrupt: "architecture_approval" },
  { id: "database",      icon: Database,      label: "Database Review",      interrupt: "database_approval" },
  { id: "api",           icon: Code2,         label: "API Review",           interrupt: "api_approval" },
  { id: "exports",       icon: Download,      label: "Exports",              interrupt: null },
];

// Map interrupt_type → step id
const INTERRUPT_TO_STEP: Record<string, string> = {
  clarification:         "clarification",
  cpm_approval:          "cpm",
  architecture_approval: "architecture",
  database_approval:     "database",
  api_approval:          "api",
  approval:              "exports",
};

// Map workflow status → active step id
const STATUS_TO_STEP: Record<string, string> = {
  validating:                      "clarification",
  clarifying:                      "clarification",
  building_cpm:                    "cpm",
  awaiting_cpm_approval:           "cpm",
  building_architecture:           "architecture",
  awaiting_architecture_approval:  "architecture",
  building_database:               "database",
  awaiting_database_approval:      "database",
  building_api:                    "api",
  awaiting_api_approval:           "api",
  generating_requirements:         "exports",
  awaiting_requirements_approval:  "exports",
  completed:                       "exports",
};

type StepStatus = "pending" | "generating" | "awaiting" | "done";

function getStepStatuses(design: Design | null): Record<string, StepStatus> {
  if (!design) return Object.fromEntries(STEPS.map(s => [s.id, "pending"]));

  const status = design.status;
  const activeId = design.interrupt_type
    ? (INTERRUPT_TO_STEP[design.interrupt_type] ?? STATUS_TO_STEP[status] ?? "clarification")
    : (STATUS_TO_STEP[status] ?? "clarification");

  const activeIdx = STEPS.findIndex(s => s.id === activeId);

  return Object.fromEntries(STEPS.map((s, i) => {
    if (i < activeIdx) return [s.id, "done"];
    if (i === activeIdx) {
      if (status === "completed") return [s.id, "done"];
      if (design.interrupt_type) return [s.id, "awaiting"];
      if (["building_cpm","building_architecture","building_database","building_api","generating_requirements","validating"].includes(status)) return [s.id, "generating"];
      return [s.id, "awaiting"];
    }
    return [s.id, "pending"];
  }));
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DesignPage() {
  const { id: projectId, designId } = useParams<{ id: string; designId: string }>();

  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState("clarification");
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const designRef = useRef<Design | null>(null);
  const initialLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const d = await apiGetDesign(designId);
      
      const activeId = d.interrupt_type
        ? (INTERRUPT_TO_STEP[d.interrupt_type] ?? STATUS_TO_STEP[d.status])
        : STATUS_TO_STEP[d.status];
      
      const prevDesign = designRef.current;
      const wasLoaded = initialLoadedRef.current;

      if (!wasLoaded && activeId) {
        setActiveStep(activeId);
        initialLoadedRef.current = true;
        setInitialLoaded(true);
      } else if (prevDesign && activeId) {
        const prevActiveId = prevDesign.interrupt_type
          ? (INTERRUPT_TO_STEP[prevDesign.interrupt_type] ?? STATUS_TO_STEP[prevDesign.status])
          : STATUS_TO_STEP[prevDesign.status];
        if (activeId !== prevActiveId) {
          setActiveStep(activeId);
        }
      }
      
      designRef.current = d;
      setDesign(d);
      setError(null);
      // Stop polling when completed or awaiting human
      if (d.interrupt_type || d.status === "completed") {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load design");
    } finally {
      setLoading(false);
    }
  }, [designId]);

  // Initial load + polling while generating
  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [refresh]);

  const handleApprove = async () => {
    if (!design) return;
    setResuming(true);
    setShowFeedback(false);
    try {
      await apiResumeDesign(designId, "approve", { decision: "approve" });
      // Restart polling
      pollRef.current = setInterval(refresh, 4000);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Resume failed");
    } finally {
      setResuming(false);
    }
  };

  const handleFeedback = async () => {
    if (!design || !feedback.trim()) return;
    setResuming(true);
    setShowFeedback(false);
    try {
      await apiResumeDesign(designId, "feedback", { decision: "feedback", feedback });
      setFeedback("");
      pollRef.current = setInterval(refresh, 4000);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Resume failed");
    } finally {
      setResuming(false);
    }
  };

  const handleClarification = async (answers: Record<string, string>) => {
    if (!design) return;
    setResuming(true);
    try {
      await apiResumeDesign(designId, "clarification", answers);
      pollRef.current = setInterval(refresh, 4000);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Resume failed");
    } finally {
      setResuming(false);
    }
  };

  const stepStatuses = getStepStatuses(design);
  const currentIdx = STEPS.findIndex(s => s.id === activeStep);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen bg-[#0a0a0b]">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );

  if (error && !design) return (
    <div className="p-6">
      <Card className="bg-red-500/5 border-red-500/20 p-5 flex items-center gap-3">
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <p className="text-xs text-red-400">{error}</p>
      </Card>
    </div>
  );

  return (
    <div className="flex h-full min-h-screen bg-[#0a0a0b]">
      {/* ── Step rail ─────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 border-r border-zinc-800/60 p-4 flex flex-col gap-1">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-2 pb-3">
          Design Workflow
        </p>
        {STEPS.map((step, i) => {
          const state = stepStatuses[step.id];
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          return (
            <button
              key={step.id}
              onClick={() => state !== "pending" && setActiveStep(step.id)}
              disabled={state === "pending"}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                isActive ? "bg-indigo-950/60 border border-indigo-500/30" : "hover:bg-zinc-800/30",
                state === "pending" && "opacity-35 cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                state === "done"      ? "bg-emerald-500/20 border border-emerald-500/30" :
                state === "awaiting"  ? "bg-amber-500/20 border border-amber-500/30 ring-2 ring-amber-500/20" :
                state === "generating"? "bg-indigo-500/20 border border-indigo-500/30" :
                "bg-zinc-800 border border-zinc-700"
              )}>
                {state === "done"       && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {state === "awaiting"   && <Clock className="w-3 h-3 text-amber-400" />}
                {state === "generating" && <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />}
                {state === "pending"    && <span className="text-[10px] text-zinc-500">{i + 1}</span>}
              </div>
              <div className="min-w-0">
                <p className={cn("text-xs font-medium leading-none mb-0.5",
                  isActive ? "text-indigo-300" : state !== "pending" ? "text-zinc-300" : "text-zinc-600"
                )}>{step.label}</p>
                <p className="text-[10px] text-zinc-600 capitalize">
                  {state === "generating" ? "Generating…" : state === "awaiting" ? "Awaiting review" : state}
                </p>
              </div>
            </button>
          );
        })}

        {/* Status footer */}
        <div className="mt-auto pt-4 border-t border-zinc-800/60">
          <p className="text-[10px] text-zinc-600 px-2">Status</p>
          <p className="text-[10px] font-mono text-indigo-400 px-2 mt-0.5 truncate">{design?.status ?? "—"}</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-6 min-h-0 overflow-hidden">
        {/* Nav */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge state={stepStatuses[activeStep]} />
              <span className="text-xs text-zinc-500">Step {currentIdx + 1} of {STEPS.length}</span>
            </div>
            <h1 className="text-xl font-semibold text-zinc-100">{STEPS[currentIdx]?.label}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={currentIdx === 0}
              onClick={() => setActiveStep(STEPS[currentIdx - 1].id)}
              className="h-8 text-xs gap-1 text-zinc-400"
            ><ChevronLeft className="w-3.5 h-3.5" /> Prev</Button>
            <Button variant="ghost" size="sm"
              disabled={currentIdx >= STEPS.length - 1 || stepStatuses[STEPS[currentIdx + 1]?.id] === "pending"}
              onClick={() => setActiveStep(STEPS[currentIdx + 1].id)}
              className="h-8 text-xs gap-1 text-zinc-400"
            >Next <ChevronRight className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* ── Step: Clarification ── */}
        {activeStep === "clarification" && (
          <ClarificationPanel
            design={design}
            resuming={resuming}
            onSubmit={handleClarification}
          />
        )}

        {/* ── Step: CPM ── */}
        {activeStep === "cpm" && (
          <ModelPanel
            stepId="cpm"
            label="Conceptual Project Model"
            icon={<Cpu className="w-4 h-4 text-indigo-400" />}
            data={design?.project_model}
            status={stepStatuses.cpm}
            pendingMsg="CPM is being generated…"
            resuming={resuming}
            showFeedback={showFeedback}
            feedback={feedback}
            setFeedback={setFeedback}
            onApprove={handleApprove}
            onToggleFeedback={() => setShowFeedback(v => !v)}
            onFeedbackSubmit={handleFeedback}
          />
        )}

        {/* ── Step: Architecture ── */}
        {activeStep === "architecture" && (
          <ModelPanel
            stepId="architecture"
            label="System Architecture"
            icon={<Layers className="w-4 h-4 text-violet-400" />}
            data={design?.architecture_model}
            status={stepStatuses.architecture}
            pendingMsg="Architecture is being generated…"
            resuming={resuming}
            showFeedback={showFeedback}
            feedback={feedback}
            setFeedback={setFeedback}
            onApprove={handleApprove}
            onToggleFeedback={() => setShowFeedback(v => !v)}
            onFeedbackSubmit={handleFeedback}
          />
        )}

        {/* ── Step: Database ── */}
        {activeStep === "database" && (
          <ModelPanel
            stepId="database"
            label="Database Schema"
            icon={<Database className="w-4 h-4 text-emerald-400" />}
            data={design?.database_model}
            status={stepStatuses.database}
            pendingMsg="Database schema is being generated…"
            resuming={resuming}
            showFeedback={showFeedback}
            feedback={feedback}
            setFeedback={setFeedback}
            onApprove={handleApprove}
            onToggleFeedback={() => setShowFeedback(v => !v)}
            onFeedbackSubmit={handleFeedback}
          />
        )}

        {/* ── Step: API ── */}
        {activeStep === "api" && (
          <ModelPanel
            stepId="api"
            label="API Specification"
            icon={<Code2 className="w-4 h-4 text-blue-400" />}
            data={design?.openapi_model}
            status={stepStatuses.api}
            pendingMsg="API specification is being generated…"
            resuming={resuming}
            showFeedback={showFeedback}
            feedback={feedback}
            setFeedback={setFeedback}
            onApprove={handleApprove}
            onToggleFeedback={() => setShowFeedback(v => !v)}
            onFeedbackSubmit={handleFeedback}
          />
        )}

        {/* ── Step: Exports ── */}
        {activeStep === "exports" && stepStatuses.exports === "awaiting" && (
          <ModelPanel
            stepId="exports"
            label="Final Requirements Document"
            icon={<FileText className="w-4 h-4 text-pink-400" />}
            data={design?.requirements_doc}
            status={stepStatuses.exports}
            pendingMsg="Final report is being compiled…"
            resuming={resuming}
            showFeedback={showFeedback}
            feedback={feedback}
            setFeedback={setFeedback}
            onApprove={handleApprove}
            onToggleFeedback={() => setShowFeedback(v => !v)}
            onFeedbackSubmit={handleFeedback}
          />
        )}
        {activeStep === "exports" && stepStatuses.exports !== "awaiting" && (
          <ExportsPanel design={design} />
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ state }: { state: StepStatus }) {
  const cfg = {
    done:       { label: "Done",             color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", Icon: CheckCircle2 },
    awaiting:   { label: "Awaiting Approval",color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",   Icon: Clock },
    generating: { label: "Generating",       color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20",  Icon: Loader2 },
    pending:    { label: "Pending",           color: "text-zinc-500",    bg: "bg-zinc-800 border-zinc-700",            Icon: Clock },
  }[state];
  return (
    <Badge className={cn("text-[10px] border px-1.5 gap-1", cfg.bg, cfg.color)}>
      <cfg.Icon className={cn("w-3 h-3", state === "generating" && "animate-spin")} />
      {cfg.label}
    </Badge>
  );
}

function ClarificationPanel({ design, resuming, onSubmit }: {
  design: Design | null;
  resuming: boolean;
  onSubmit: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  let questions: string[] = [];
  try {
    const payload = design?.interrupt_payload ? JSON.parse(design.interrupt_payload) : {};
    questions = Array.isArray(payload.questions) ? payload.questions : [];
  } catch { /* ignore */ }

  if (design?.status === "validating" || design?.status === "clarifying") {
    if (!design.interrupt_type) {
      return (
        <Card className="bg-[#111113] border-zinc-800/60 p-8 flex flex-col items-center text-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
          <p className="text-sm text-zinc-400">Analyzing your PRD…</p>
        </Card>
      );
    }
  }

  if (questions.length === 0) {
    return (
      <Card className="bg-[#111113] border-zinc-800/60 p-8 flex flex-col items-center text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-4" />
        <p className="text-sm font-medium text-zinc-200 mb-1">No clarifications needed</p>
        <p className="text-xs text-zinc-500">Your PRD was clear enough. Moving to CPM generation.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 w-full flex-1 flex flex-col min-h-0">
      <Card className="bg-[#111113] border-amber-500/20 p-5 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Clarifying Questions</h2>
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] ml-auto">
            {questions.length} question{questions.length > 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">
          {questions.map((q, i) => (
            <div key={i}>
              <p className="text-xs text-zinc-300 mb-2 leading-relaxed">
                <span className="text-zinc-500 mr-1">{i + 1}.</span>{q}
              </p>
              <Textarea
                value={answers[q] ?? ""}
                onChange={e => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                placeholder="Your answer…"
                className="h-20 bg-zinc-950/60 border-zinc-800 text-xs text-zinc-300 focus:border-indigo-500/50 resize-none"
              />
            </div>
          ))}
        </div>
      </Card>
      <div className="flex-shrink-0">
        <Button
          id="submit-clarifications"
          onClick={() => onSubmit(answers)}
          disabled={resuming || questions.some(q => !answers[q]?.trim())}
          className="h-9 px-5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 font-semibold disabled:opacity-40"
        >
          {resuming ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…</> : <>Submit Answers <ChevronRight className="w-3.5 h-3.5" /></>}
        </Button>
      </div>
    </div>
  );
}

function renderTextWithBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold text-zinc-100">{part}</strong> : part);
}

function MarkdownView({ text }: { text: string }) {
  if (!text) return <p className="text-xs text-zinc-500 font-medium">No report content compiled yet.</p>;

  // Parse the markdown into typed blocks
  type Block =
    | { kind: "h1"; content: string }
    | { kind: "h2"; content: string; idx: number }
    | { kind: "h3"; content: string }
    | { kind: "bullet"; content: string }
    | { kind: "table"; headers: string[]; rows: string[][] }
    | { kind: "rule" }
    | { kind: "blank" }
    | { kind: "text"; content: string };

  const blocks: Block[] = [];
  const lines = text.split("\n");
  let h2Count = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table detection
    if (trimmed.startsWith("|") && i + 1 < lines.length && lines[i + 1].trim().match(/^\|[-| :]+\|$/)) {
      const headers = trimmed.split("|").filter(Boolean).map(h => h.trim());
      i += 2; // skip separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].trim().split("|").filter(Boolean).map(c => c.trim()));
        i++;
      }
      blocks.push({ kind: "table", headers, rows });
      continue;
    }

    if (trimmed.startsWith("# ")) {
      blocks.push({ kind: "h1", content: trimmed.slice(2) });
    } else if (trimmed.startsWith("## ")) {
      h2Count++;
      blocks.push({ kind: "h2", content: trimmed.slice(3), idx: h2Count });
    } else if (trimmed.startsWith("### ")) {
      blocks.push({ kind: "h3", content: trimmed.slice(4) });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      blocks.push({ kind: "bullet", content: trimmed.slice(2) });
    } else if (trimmed === "---" || trimmed === "***") {
      blocks.push({ kind: "rule" });
    } else if (trimmed === "") {
      blocks.push({ kind: "blank" });
    } else {
      blocks.push({ kind: "text", content: trimmed });
    }
    i++;
  }

  // Collect bullets under an h3 into groups
  const rendered: React.ReactNode[] = [];
  let bulletGroup: string[] = [];
  let bulletKey = 0;

  const flushBullets = () => {
    if (bulletGroup.length === 0) return;
    const key = `bl-${bulletKey++}`;
    rendered.push(
      <ul key={key} className="space-y-1.5 pl-1 mb-2">
        {bulletGroup.map((item, bi) => (
          <li key={bi} className="flex items-start gap-2.5">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400/70 flex-shrink-0" />
            <span className="text-[11px] text-zinc-350 leading-relaxed font-sans">{renderTextWithBold(item)}</span>
          </li>
        ))}
      </ul>
    );
    bulletGroup = [];
  };

  let sectionOpen = false;

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];

    if (block.kind !== "bullet" && bulletGroup.length > 0) {
      flushBullets();
    }

    if (block.kind === "h1") {
      if (sectionOpen) { sectionOpen = false; }
      rendered.push(
        <div key={bi} className="mb-6 pb-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-100 tracking-tight">{block.content}</h1>
              <p className="text-[10px] text-zinc-500 mt-0.5">Generated by Archon AI Design Platform</p>
            </div>
          </div>
        </div>
      );
    } else if (block.kind === "h2") {
      if (sectionOpen) { sectionOpen = false; }
      sectionOpen = true;
      const sectionColors = [
        "from-indigo-500/15 to-blue-500/15 border-indigo-500/20 text-indigo-300",
        "from-violet-500/15 to-purple-500/15 border-violet-500/20 text-violet-300",
        "from-emerald-500/15 to-teal-500/15 border-emerald-500/20 text-emerald-300",
        "from-amber-500/15 to-orange-500/15 border-amber-500/20 text-amber-300",
        "from-pink-500/15 to-rose-500/15 border-pink-500/20 text-pink-300",
        "from-cyan-500/15 to-sky-500/15 border-cyan-500/20 text-cyan-300",
      ];
      const colorClass = sectionColors[(block.idx - 1) % sectionColors.length];
      rendered.push(
        <div key={bi} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gradient-to-r ${colorClass} border mb-3 mt-5`}>
          <span className="text-[10px] font-bold opacity-60 tabular-nums">{String(block.idx).padStart(2, "0")}</span>
          <h2 className="text-xs font-bold tracking-wide">{block.content}</h2>
        </div>
      );
    } else if (block.kind === "h3") {
      rendered.push(
        <h3 key={bi} className="text-[11px] font-semibold text-zinc-300 mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="w-px h-3 bg-zinc-600 rounded-full" />
          {block.content}
        </h3>
      );
    } else if (block.kind === "bullet") {
      bulletGroup.push(block.content);
    } else if (block.kind === "table") {
      rendered.push(
        <div key={bi} className="overflow-x-auto mb-4 mt-2 rounded-lg border border-zinc-800/60">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-zinc-800">
                {block.headers.map((h, hi) => (
                  <th key={hi} className="text-left px-3 py-2 font-semibold text-zinc-300 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-zinc-400 leading-relaxed">{renderTextWithBold(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (block.kind === "rule") {
      rendered.push(
        <div key={bi} className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent" />
        </div>
      );
    } else if (block.kind === "blank") {
      // skip excessive blanks — bullets handle spacing
    } else if (block.kind === "text") {
      // Check for blockquote style lines starting with >
      if (block.content.startsWith("> ")) {
        rendered.push(
          <div key={bi} className="flex gap-2 pl-1 my-2">
            <div className="w-0.5 bg-indigo-500/40 rounded-full flex-shrink-0" />
            <p className="text-[11px] text-zinc-400 italic leading-relaxed">{renderTextWithBold(block.content.slice(2))}</p>
          </div>
        );
      } else {
        rendered.push(
          <p key={bi} className="text-[11px] text-zinc-400 leading-relaxed mb-1.5">{renderTextWithBold(block.content)}</p>
        );
      }
    }
  }

  // Flush any trailing bullets
  if (bulletGroup.length > 0) flushBullets();

  return (
    <div className="flex-1 overflow-y-auto min-h-0 pr-1">
      <div className="space-y-0.5 font-sans pb-4">
        {rendered}
      </div>
    </div>
  );
}

function CPMView({ data }: { data: any }) {
  if (!data) return <p className="text-xs text-zinc-500 font-medium">No model data available.</p>;
  
  const sections = [
    { title: "Actors / Users", items: data.actors, icon: Users, color: "text-blue-400" },
    { title: "Key Features", items: data.features, icon: Star, color: "text-amber-400" },
    { title: "User Stories", items: data.user_stories, icon: FileText, color: "text-purple-400" },
    { title: "Entities", items: data.entities, icon: Database, color: "text-emerald-400" },
    { title: "Relationships", items: data.relationships, icon: GitMerge, color: "text-pink-400" },
    { title: "Integrations", items: data.integrations, icon: Network, color: "text-indigo-400" },
    { title: "Functional Requirements", items: data.functional_requirements, icon: CheckSquare, color: "text-teal-400" },
    { title: "Non-Functional Requirements", items: data.non_functional_requirements, icon: Shield, color: "text-red-400" },
    { title: "Assumptions", items: data.assumptions, icon: HelpCircle, color: "text-orange-400" },
    { title: "Constraints", items: data.constraints, icon: AlertOctagon, color: "text-yellow-400" },
  ];

  const hasAnyItems = sections.some(sec => sec.items && sec.items.length > 0);
  if (!hasAnyItems) return <p className="text-xs text-zinc-500 font-medium">No model properties extracted yet.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
      {sections.map(sec => {
        if (!sec.items || sec.items.length === 0) return null;
        const Icon = sec.icon;
        return (
          <Card key={sec.title} className="bg-zinc-950/40 border-zinc-850 p-4 hover:border-zinc-750 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`w-3.5 h-3.5 ${sec.color}`} />
              <h3 className="text-xs font-semibold text-zinc-250">{sec.title}</h3>
              <Badge className="bg-zinc-900 text-zinc-500 text-[9px] border-zinc-800 ml-auto px-1.5 py-0 font-medium">
                {sec.items.length}
              </Badge>
            </div>
            <ul className="space-y-1.5">
              {sec.items.map((item: string, idx: number) => (
                <li key={idx} className="text-[11px] text-zinc-400 flex items-start gap-1.5 leading-relaxed font-sans">
                  <span className="text-zinc-600 select-none mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function ArchitectureView({ data }: { data: any }) {
  if (!data) return <p className="text-xs text-zinc-500 font-medium">No architecture model data available.</p>;

  const [activeSubTab, setActiveSubTab] = useState<"services" | "queues" | "diagram" | "raw_diagram">("services");

  // Helper to generate a fallback diagram locally if the system_diagram is missing
  const getClientFallbackMermaid = (archData: any): string => {
    const lines = ["graph TD"];
    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "_");

    archData.services?.forEach((svc: any) => {
      lines.push(`  ${sanitize(svc.name)}["${svc.name}"]`);
    });
    archData.datastores?.forEach((ds: any) => {
      lines.push(`  ${sanitize(ds.name)}[("${ds.name}")]`);
    });
    archData.external_integrations?.forEach((intg: any) => {
      lines.push(`  ${sanitize(intg.name)}{"${intg.name}"}`);
    });
    archData.queues?.forEach((q: any) => {
      lines.push(`  ${sanitize(q.name)}>"${q.name}"]`);
    });

    archData.services?.forEach((svc: any) => {
      const svcId = sanitize(svc.name);
      archData.datastores?.forEach((ds: any) => {
        lines.push(`  ${svcId} --> ${sanitize(ds.name)}`);
      });
      archData.external_integrations?.forEach((intg: any) => {
        lines.push(`  ${svcId} --> ${sanitize(intg.name)}`);
      });
    });

    archData.queues?.forEach((q: any) => {
      const qId = sanitize(q.name);
      if (q.producer) lines.push(`  ${sanitize(q.producer)} --> ${qId}`);
      if (q.consumer) lines.push(`  ${qId} --> ${sanitize(q.consumer)}`);
    });

    return lines.join("\n");
  };

  const mermaidChart = data.system_diagram || getClientFallbackMermaid(data);

  return (
    <div className="space-y-4">
      <div className="flex border-b border-zinc-850 pb-2 gap-1">
        <button
          onClick={() => setActiveSubTab("services")}
          className={cn("text-[11px] px-2.5 py-1 rounded-md transition-all font-semibold", activeSubTab === "services" ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20" : "text-zinc-400 hover:text-zinc-200")}
        >
          Services & Datastores
        </button>
        <button
          onClick={() => setActiveSubTab("queues")}
          className={cn("text-[11px] px-2.5 py-1 rounded-md transition-all font-semibold", activeSubTab === "queues" ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20" : "text-zinc-400 hover:text-zinc-200")}
        >
          Integrations & Channels
        </button>
        <button
          onClick={() => setActiveSubTab("diagram")}
          className={cn("text-[11px] px-2.5 py-1 rounded-md transition-all font-semibold", activeSubTab === "diagram" ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20" : "text-zinc-400 hover:text-zinc-200")}
        >
          Visual Topology
        </button>
        <button
          onClick={() => setActiveSubTab("raw_diagram")}
          className={cn("text-[11px] px-2.5 py-1 rounded-md transition-all font-semibold", activeSubTab === "raw_diagram" ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20" : "text-zinc-400 hover:text-zinc-200")}
        >
          Mermaid Source
        </button>
      </div>

      <div className="pr-1">
        {activeSubTab === "services" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-wider">Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.services?.map((svc: any, i: number) => (
                  <Card key={i} className="bg-zinc-950/40 border-zinc-850 p-4 hover:border-zinc-750 transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="w-3.5 h-3.5 text-violet-400" />
                      <h4 className="text-xs font-bold text-zinc-100">{svc.name}</h4>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {svc.technology_stack?.map((tech: string, j: number) => (
                        <Badge key={j} className="bg-indigo-950/30 text-indigo-350 border-indigo-900/30 text-[9px] px-1.5 py-0 font-mono">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                    <ul className="space-y-1">
                      {svc.responsibilities?.map((resp: string, j: number) => (
                        <li key={j} className="text-[11px] text-zinc-400 flex items-start gap-1 leading-normal font-sans">
                          <span className="text-zinc-600 select-none">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </div>

            {data.datastores && data.datastores.length > 0 && (
              <div className="pt-2">
                <h3 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-wider">Datastores</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.datastores.map((ds: any, i: number) => (
                    <Card key={i} className="bg-zinc-950/40 border-zinc-850 p-4 hover:border-zinc-750 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-3.5 h-3.5 text-emerald-400" />
                        <h4 className="text-xs font-bold text-zinc-100">{ds.name}</h4>
                        <Badge className="bg-emerald-950/30 text-emerald-350 border-emerald-900/30 text-[9px] px-1.5 ml-auto font-mono">
                          {ds.technology}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-zinc-500 mb-2 font-semibold capitalize">Type: {ds.type}</p>
                      <p className="text-[11px] text-zinc-450 leading-relaxed bg-zinc-900/30 p-2 rounded border border-zinc-850">
                        <span className="font-semibold text-zinc-300">Justification:</span> {ds.justification}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === "queues" && (
          <div className="space-y-4">
            {data.queues && data.queues.length > 0 ? (
              <div>
                <h3 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-wider">Message Queues & Streams</h3>
                <div className="space-y-2">
                  {data.queues.map((q: any, i: number) => (
                    <Card key={i} className="bg-zinc-950/40 border-zinc-855 p-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <div>
                          <h4 className="text-xs font-bold text-zinc-100">{q.name}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                            <span>Producer: <strong className="text-zinc-400">{q.producer}</strong></span>
                            <span>•</span>
                            <span>Consumer: <strong className="text-zinc-400">{q.consumer}</strong></span>
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-indigo-950/30 text-indigo-350 border-indigo-900/30 text-[9px] font-mono">
                        Async Channel
                      </Badge>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-zinc-600 text-xs">No asynchronous message queues defined.</div>
            )}

            {data.integrations && data.integrations.length > 0 && (
              <div className="pt-2">
                <h3 className="text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-wider">External Integrations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.integrations.map((integ: any, i: number) => (
                    <Card key={i} className="bg-zinc-950/40 border-zinc-850 p-3 hover:border-zinc-750 transition-all">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Globe className="w-3.5 h-3.5 text-amber-400" />
                        <h4 className="text-xs font-bold text-zinc-100">{integ.name}</h4>
                        <Badge className="bg-amber-950/30 text-amber-350 border-amber-900/30 text-[9px] ml-auto font-mono">
                          {integ.protocol_api}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans"><span className="text-zinc-500">Type:</span> {integ.type}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === "diagram" && (
          <div className="space-y-2">
            <p className="text-[10px] text-zinc-500 mb-2 font-mono">Visual architecture topology rendering:</p>
            <MermaidVisualizer chart={mermaidChart} />
          </div>
        )}

        {activeSubTab === "raw_diagram" && (
          <div className="space-y-2">
            <p className="text-[10px] text-zinc-500 mb-2 font-mono">Topology diagram layout in Mermaid notation:</p>
            <pre className="text-[11px] text-zinc-300 font-mono whitespace-pre bg-zinc-950/60 rounded-lg p-4 border border-zinc-850 overflow-x-auto leading-relaxed max-h-[70vh]">
              {mermaidChart}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function DatabaseView({ data }: { data: any }) {
  if (!data) return <p className="text-xs text-zinc-500 font-medium">No database model data available.</p>;

  const [activeTab, setActiveTab] = useState<"visual" | "tables">("visual");
  const [activeTableIdx, setActiveTableIdx] = useState(0);

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-850 pb-2 gap-1">
        <button
          onClick={() => setActiveTab("visual")}
          className={cn(
            "text-[11px] px-2.5 py-1 rounded-md transition-all font-semibold",
            activeTab === "visual"
              ? "bg-emerald-600/15 text-emerald-300 border border-emerald-500/20"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          Visual Schema Map
        </button>
        <button
          onClick={() => setActiveTab("tables")}
          className={cn(
            "text-[11px] px-2.5 py-1 rounded-md transition-all font-semibold",
            activeTab === "tables"
              ? "bg-emerald-600/15 text-emerald-300 border border-emerald-500/20"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          Table Details
        </button>
      </div>

      {activeTab === "visual" ? (
        <DatabaseSchemaVisualizer 
          tables={data.tables || []} 
          relationships={data.relationships || []} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-4">
            <Card className="bg-zinc-950/40 border-zinc-850 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <h3 className="text-xs font-bold text-zinc-250 uppercase tracking-wider">Selected Engine</h3>
              </div>
              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-2.5 mb-3">
                <span className="text-sm font-extrabold text-emerald-400">{data.database_selection}</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                <span className="font-semibold text-zinc-300">Justification:</span> {data.justification}
              </p>
            </Card>

            <Card className="bg-zinc-950/40 border-zinc-850 p-4">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5 font-mono">Schemas</h3>
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {data.tables?.map((table: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTableIdx(idx)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-2",
                      activeTableIdx === idx
                        ? "bg-emerald-600/15 text-emerald-300 border border-emerald-500/20"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
                    )}
                  >
                    <Table className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="truncate">{table.name}</span>
                    <Badge className="ml-auto bg-zinc-900 text-zinc-500 text-[9px] border-zinc-800 px-1 py-0">
                      {table.columns?.length || 0}
                    </Badge>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div className="md:col-span-2">
            {data.tables && data.tables[activeTableIdx] ? (
              <Card className="bg-zinc-950/40 border-zinc-850 p-5 h-full flex flex-col min-h-[300px]">
                <div className="flex items-center gap-2 mb-4 border-b border-zinc-850 pb-3">
                  <Table className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-zinc-100 font-mono">{data.tables[activeTableIdx].name}</h3>
                  {data.tables[activeTableIdx].partition_key && (
                    <Badge className="bg-amber-950/30 text-amber-350 border-amber-900/30 text-[9px] ml-auto font-mono">
                      PARTITION BY: {data.tables[activeTableIdx].partition_key}
                    </Badge>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto max-h-[55vh] mb-4 pr-1">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-zinc-850 text-zinc-500 font-bold uppercase tracking-wider text-[9px]">
                        <th className="pb-2 font-medium">Column Name</th>
                        <th className="pb-2 font-medium">Data Type</th>
                        <th className="pb-2 font-medium text-right">Constraints</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/40">
                      {data.tables[activeTableIdx].columns?.map((col: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-900/10">
                          <td className="py-2.5 font-bold text-zinc-300 font-mono">{col.name}</td>
                          <td className="py-2.5 text-zinc-450 font-mono">{col.type}</td>
                          <td className="py-2.5 text-right space-x-1">
                            {col.constraints?.map((c: string, j: number) => {
                              const isPK = c.toLowerCase().includes("primary");
                              return (
                                <Badge
                                  key={j}
                                  className={cn(
                                    "text-[9px] px-1 py-0 font-mono font-medium",
                                    isPK ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                                  )}
                                >
                                  {c}
                                </Badge>
                              );
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {data.tables[activeTableIdx].indexes && data.tables[activeTableIdx].indexes.length > 0 && (
                  <div className="border-t border-zinc-850 pt-3">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Recommended Indexes</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {data.tables[activeTableIdx].indexes.map((idxName: string, idx: number) => (
                        <Badge key={idx} className="bg-zinc-900 text-zinc-400 border-zinc-800 text-[9px] font-mono font-medium">
                          {idxName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="bg-zinc-950/40 border-zinc-850 p-8 flex items-center justify-center h-full text-zinc-600 text-xs">
                Select a table to view schema details.
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function APIView({ data }: { data: any }) {
  if (!data) return <p className="text-xs text-zinc-500 font-medium">No API model data available.</p>;

  const [activeEndpointIdx, setActiveEndpointIdx] = useState(0);

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "POST": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "PUT": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "DELETE": return "bg-red-500/10 text-red-400 border-red-500/20";
      default: return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  const renderSchemaJson = (schema: any): string | null => {
    if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) return null;
    const obj: Record<string, any> = {};
    const sortedEntries = Object.entries(schema.properties).sort(([a], [b]) => a.localeCompare(b));
    sortedEntries.forEach(([key, val]: [string, any]) => {
      if (typeof val === "object" && val !== null) {
        const type = val.type || "string";
        const desc = val.description ? ` // ${val.description}` : "";
        obj[key] = `<${type}>${desc}`;
      } else {
        obj[key] = `<${val}>`;
      }
    });
    return JSON.stringify(obj, null, 2);
  };

  const activeEp = data.endpoints?.[activeEndpointIdx];
  const requestText = activeEp ? (activeEp.request_body || renderSchemaJson(activeEp.request_schema)) : null;
  const responseText = activeEp ? (activeEp.response_body || renderSchemaJson(activeEp.response_schema)) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-zinc-950/40 border-zinc-850 p-4 md:col-span-1 flex flex-col h-[72vh]">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5 font-mono">Endpoints</h3>
        <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
          {data.endpoints?.map((ep: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setActiveEndpointIdx(idx)}
              className={cn(
                "w-full text-left px-2 py-2 rounded-md text-[11px] font-semibold transition-all flex items-center gap-2",
                activeEndpointIdx === idx
                  ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
              )}
            >
              <Badge className={cn("text-[9px] px-1 py-0 font-extrabold uppercase font-mono tracking-wider", getMethodColor(ep.method))}>
                {ep.method}
              </Badge>
              <span className="font-mono text-[10px] truncate flex-1">{ep.path}</span>
              {ep.authentication_required && <Lock className="w-2.5 h-2.5 text-zinc-500" />}
            </button>
          ))}
        </div>
      </Card>

      <div className="md:col-span-2">
        {activeEp ? (
          <Card className="bg-zinc-950/40 border-zinc-850 p-5 h-full flex flex-col min-h-[350px]">
            <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-850 pb-3">
              <Badge className={cn("text-[9px] px-1.5 py-0.5 font-extrabold uppercase font-mono tracking-wider", getMethodColor(activeEp.method))}>
                {activeEp.method}
              </Badge>
              <span className="font-mono text-xs font-bold text-zinc-250">{activeEp.path}</span>
              
              <div className="ml-auto flex items-center gap-1.5">
                {activeEp.authentication_required ? (
                  <Badge className="bg-amber-955 text-amber-400 border border-amber-900/30 text-[9px] px-2 gap-1 font-medium">
                    <Lock className="w-2.5 h-2.5" /> Private
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-900 text-zinc-500 border-zinc-800 text-[9px] px-2 gap-1 font-medium">
                    <Unlock className="w-2.5 h-2.5" /> Public
                  </Badge>
                )}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Overview</h4>
              <p className="text-xs text-zinc-350 leading-relaxed font-medium font-sans">
                {activeEp.summary}
              </p>
            </div>

            {/* Parameters list (if any) */}
            {activeEp.parameters && activeEp.parameters.length > 0 && (
              <div className="mb-4 pt-1">
                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">Parameters</h4>
                <div className="bg-zinc-950/40 border border-zinc-850 rounded-lg p-2.5 space-y-1.5 max-h-[150px] overflow-y-auto">
                  {activeEp.parameters.map((param: any, pIdx: number) => (
                    <div key={pIdx} className="flex items-start justify-between text-[11px] py-1 border-b border-zinc-900/40 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-350">{param.name}</span>
                        <Badge className={cn(
                          "text-[8px] px-1 py-0 font-mono font-bold uppercase",
                          param.in_type === "path" 
                            ? "bg-blue-950/40 text-blue-400 border border-blue-900/30" 
                            : param.in_type === "query"
                            ? "bg-teal-950/40 text-teal-400 border border-teal-900/30"
                            : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                        )}>
                          {param.in_type}
                        </Badge>
                        {param.required && (
                          <Badge className="bg-red-950/40 text-red-400 border border-red-900/30 text-[8px] px-1 py-0">
                            Required
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-zinc-500 text-[10px] mr-2">[{param.type}]</span>
                        {param.description && <span className="text-zinc-400 text-[10px] italic font-sans">{param.description}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto max-h-[55vh] pr-1">
              <div>
                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">Request Spec</h4>
                {requestText ? (
                  <pre className="text-[10px] text-zinc-300 font-mono whitespace-pre-wrap bg-zinc-950/60 rounded-lg p-3 border border-zinc-850 max-h-[220px] overflow-y-auto leading-relaxed">
                    {requestText}
                  </pre>
                ) : (
                  <div className="text-zinc-650 text-[10px] py-4 border border-dashed border-zinc-850 rounded-lg text-center font-medium font-mono">
                    No payload required
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">Response Spec</h4>
                {responseText ? (
                  <pre className="text-[10px] text-zinc-300 font-mono whitespace-pre-wrap bg-zinc-950/60 rounded-lg p-3 border border-zinc-850 max-h-[220px] overflow-y-auto leading-relaxed">
                    {responseText}
                  </pre>
                ) : (
                  <div className="text-zinc-650 text-[10px] py-4 border border-dashed border-zinc-850 rounded-lg text-center font-medium font-mono">
                    No schema specified
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-zinc-950/40 border-zinc-850 p-8 flex items-center justify-center h-full text-zinc-600 text-xs">
            Select an endpoint to view API documentation.
          </Card>
        )}
      </div>
    </div>
  );
}

function ModelPanel({ stepId, label, icon, data, status, pendingMsg, resuming, showFeedback, feedback, setFeedback, onApprove, onToggleFeedback, onFeedbackSubmit }: {
  stepId: string; label: string; icon: React.ReactNode; data?: string | null; status: StepStatus;
  pendingMsg: string; resuming: boolean; showFeedback: boolean; feedback: string;
  setFeedback: (v: string) => void;
  onApprove: () => void; onToggleFeedback: () => void; onFeedbackSubmit: () => void;
}) {
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: "user" | "agent"; text: string; time: string; }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isFullScreen) {
      const msgs: Record<string, string> = {
        cpm: "Hi, I'm the Requirements & CPM Agent. I've mapped out the conceptual models, actors, and user stories. Let me know if you'd like to refine any user stories or add specific requirements!",
        architecture: "Hello! As the System Architecture Agent, I designed the service boundaries, data flows, and infrastructure components. Ask me to adjust service structures or mock new queue configurations.",
        database: "Hi, I'm the Database Design Agent. I've generated the schemas, indexes, and engine selections. Let me know if you want to optimize specific indexes, rename tables, or add foreign keys.",
        api: "Hello! As the API Design Agent, I prepared the OpenAPI specification with REST endpoints. You can ask me to add new endpoints, change path variables, or restructure the request/response payloads.",
        exports: "Hi, I'm the Report assembly agent. I've aggregated all approved outputs into the final documentation. Ask me if you need any adjustments to the summary or report styling."
      };
      setChatMessages([
        { id: "1", sender: "agent", text: msgs[stepId] || "Hello, I am your Archon Design Agent. How can I help you refine this stage?", time: "Just now" }
      ]);
    }
  }, [isFullScreen, stepId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg = {
      id: Date.now().toString(),
      sender: "user" as const,
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");

    setTimeout(() => {
      const agentMsg = {
        id: (Date.now() + 1).toString(),
        sender: "agent" as const,
        text: `I've received your request: "${chatInput}". I am analyzing the model design and will propose updates shortly. (Note: AI chat integrations will be fully wired in the next stage!)`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, agentMsg]);
    }, 1000);
  };

  let parsed: any = null;
  try { parsed = data ? JSON.parse(data) : null; } catch { /* ignore */ }

  if (status === "generating" || (status === "pending" && !data)) {
    return (
      <Card className="bg-[#111113] border-zinc-800/60 p-8 flex flex-col items-center text-center">
        {status === "generating"
          ? <><RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-4" /><p className="text-sm text-zinc-400">{pendingMsg}</p></>
          : <><AlertCircle className="w-8 h-8 text-zinc-600 mb-4" /><p className="text-sm text-zinc-500">{pendingMsg}</p></>
        }
      </Card>
    );
  }

  const renderVisualContent = () => {
    if (stepId === "cpm") return <CPMView data={parsed} />;
    if (stepId === "architecture") return <ArchitectureView data={parsed} />;
    if (stepId === "database") return <DatabaseView data={parsed} />;
    if (stepId === "api") return <APIView data={parsed} />;
    if (stepId === "exports") return <MarkdownView text={data || ""} />;
    return (
      <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono bg-zinc-900/60 rounded-lg p-4 border border-zinc-800/60 max-h-[55vh] overflow-y-auto">
        {parsed ? JSON.stringify(parsed, null, 2) : data}
      </pre>
    );
  };

  const renderContent = () => {
    if (viewMode === "json" && stepId !== "exports") {
      return (
        <pre className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono bg-zinc-900/60 rounded-lg p-4 border border-zinc-800/60 max-h-[55vh] overflow-y-auto">
          {parsed ? JSON.stringify(parsed, null, 2) : data}
        </pre>
      );
    }
    return renderVisualContent();
  };

  return (
    <div className="space-y-4 w-full flex-1 flex flex-col min-h-0">
      <Card 
        className="bg-[#111113] border-zinc-800/60 p-5 flex-1 flex flex-col min-h-0 hover:border-zinc-700/50 transition-all cursor-pointer group"
        onClick={() => setIsFullScreen(true)}
      >
        <div className="flex items-center gap-2 mb-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {icon}
          <h2 className="text-sm font-semibold text-zinc-100">{label}</h2>
          <div className="ml-auto flex items-center gap-2">
            {status !== "pending" && stepId !== "exports" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode(v => v === "visual" ? "json" : "visual")}
                  className="h-6 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 px-2 gap-1"
                >
                  <Eye className="w-3 h-3" />
                  {viewMode === "visual" ? "Raw JSON" : "Visual View"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setIsFullScreen(true); }}
                  className="h-6 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 px-2 gap-1 group-hover:border-indigo-500/30 group-hover:bg-indigo-950/20"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand &amp; Chat
                </Button>
              </>
            )}
            {status === "done" && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Approved</Badge>}
            {status === "awaiting" && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">Awaiting Approval</Badge>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0" onClick={(e) => e.stopPropagation()}>
          {renderContent()}
        </div>
      </Card>

      {status === "awaiting" && (
        <Card className="bg-[#111113] border-zinc-800/60 p-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <p className="text-xs font-semibold text-zinc-300">Review &amp; Approve</p>
          </div>
          <div className="flex gap-2 mb-3">
            <Button id={`approve-btn`} size="sm" onClick={onApprove} disabled={resuming}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 disabled:opacity-40">
              {resuming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
              Approve
            </Button>
            <Button id={`feedback-btn`} variant="ghost" size="sm" onClick={onToggleFeedback} disabled={resuming}
              className="h-8 text-xs text-zinc-400 border border-zinc-800 gap-1.5">
              <ThumbsDown className="w-3.5 h-3.5" /> Request Changes
            </Button>
          </div>
          {showFeedback && (
            <div className="space-y-2">
              <Textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                placeholder="Describe what needs to change…"
                className="h-24 bg-zinc-950/60 border-zinc-800 text-xs text-zinc-300 focus:border-indigo-500/50 resize-none" />
              <Button size="sm" onClick={onFeedbackSubmit} disabled={!feedback.trim() || resuming}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40">
                {resuming ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Regenerate
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Fullscreen Workspace Modal */}
      {isFullScreen && (
        <div 
          className="fixed inset-0 bg-[#0a0a0b]/98 backdrop-blur-md z-50 flex flex-col animate-in fade-in duration-200" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div className="h-14 border-b border-zinc-800/60 flex items-center justify-between px-6 bg-zinc-950/80">
            <div className="flex items-center gap-2">
              {icon}
              <span className="text-sm font-semibold text-zinc-100">{label}</span>
              <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] ml-2">Interactive Workspace</Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsFullScreen(false)}
              className="text-zinc-400 hover:text-zinc-200 h-8 gap-1.5 border border-zinc-800 px-3 hover:bg-zinc-800/30"
            >
              <span className="text-[10px] text-zinc-550 border border-zinc-800 rounded px-1">ESC</span>
              <X className="w-4 h-4" /> Close
            </Button>
          </div>

          {/* Split view */}
          <div className="flex-1 flex min-h-0">
            {/* Left Panel: Content Preview */}
            <div className={cn(
              "h-full overflow-y-auto p-8 border-r border-zinc-800/60 bg-zinc-950/30 scrollbar-thin",
              (stepId === "architecture" || stepId === "database") ? "w-[82%]" : "w-[70%]"
            )}>
              <div className={cn(
                "mx-auto space-y-4",
                (stepId === "architecture" || stepId === "database") ? "max-w-7xl" : "max-w-4xl"
              )}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-250">Model Definition</h3>
                  {status !== "pending" && stepId !== "exports" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode(v => v === "visual" ? "json" : "visual")}
                      className="h-6 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 px-2 gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      {viewMode === "visual" ? "Raw JSON" : "Visual View"}
                    </Button>
                  )}
                </div>

                {/* Render the model contents */}
                {viewMode === "json" ? (
                  <pre className="text-xs text-zinc-350 whitespace-pre-wrap leading-relaxed font-mono bg-zinc-900/60 rounded-lg p-4 border border-zinc-800/60 max-h-[75vh] overflow-y-auto">
                    {parsed ? JSON.stringify(parsed, null, 2) : data}
                  </pre>
                ) : (
                  <div className="bg-[#111113]/30 rounded-xl border border-zinc-800/40 p-4">
                    {renderVisualContent()}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Chat Sidebar */}
            <div className={cn(
              "h-full flex flex-col bg-zinc-950/10",
              (stepId === "architecture" || stepId === "database") ? "w-[18%]" : "w-[30%]"
            )}>
              {/* Chat Header */}
              <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-950/40">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Archon AI Assistant</h4>
                  <p className="text-[10px] text-zinc-500">Refining {label}</p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] animate-pulse">Online</Badge>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-2", msg.sender === "user" ? "justify-end" : "justify-start")}>
                    {msg.sender === "agent" && (
                      <div className="w-6 h-6 rounded-full bg-indigo-650/20 border border-indigo-500/30 flex items-center justify-center text-[10px] text-indigo-300 font-bold flex-shrink-0">
                        A
                      </div>
                    )}
                    <div className={cn(
                      "border rounded-lg p-3 max-w-[85%]",
                      msg.sender === "user" 
                        ? "bg-indigo-600/10 border-indigo-500/20" 
                        : "bg-zinc-900/60 border-zinc-800/80"
                    )}>
                      <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                      <span className="text-[9px] text-zinc-500 mt-1 block">{msg.time}</span>
                    </div>
                    {msg.sender === "user" && (
                      <div className="w-6 h-6 rounded-full bg-zinc-700/80 flex items-center justify-center text-[10px] text-zinc-300 font-bold flex-shrink-0">
                        U
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="p-3 border-t border-zinc-800/40 flex flex-wrap gap-1.5 bg-zinc-950/40">
                {stepId === "cpm" && ["Explain Matching Logic", "Add Driver Feedback Loop", "Add Payment Gateway Story", "Simplify Actors"].map((chip) => (
                  <button 
                    key={chip} 
                    onClick={() => setChatInput(chip)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-full px-2.5 py-1 transition-all"
                  >
                    {chip}
                  </button>
                ))}
                {stepId === "architecture" && ["Explain Service Boundaries", "Add Message Queue", "Add Cache Layer", "Draw Sequence Flow"].map((chip) => (
                  <button 
                    key={chip} 
                    onClick={() => setChatInput(chip)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-full px-2.5 py-1 transition-all"
                  >
                    {chip}
                  </button>
                ))}
                {stepId === "database" && ["Optimize Indexes", "Show Keys & Constraints", "Partition Orders Table", "Explain Engine Choice"].map((chip) => (
                  <button 
                    key={chip} 
                    onClick={() => setChatInput(chip)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-full px-2.5 py-1 transition-all"
                  >
                    {chip}
                  </button>
                ))}
                {stepId === "api" && ["Add Security Headers", "Restructure GET endpoints", "Add Pagination Parameters", "Mock POST Payload"].map((chip) => (
                  <button 
                    key={chip} 
                    onClick={() => setChatInput(chip)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 rounded-full px-2.5 py-1 transition-all"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Message Input Box */}
              <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/60 space-y-2">
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type a request or change..." 
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg pl-3 pr-10 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim()}
                    className="absolute right-1.5 p-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-40 disabled:hover:bg-indigo-600"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[9px] text-zinc-655 text-center">AI updates will be applied to the current step.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExportsPanel({ design }: { design: Design | null }) {
  const items = [
    { label: "Project Model (CPM)",    key: "project_model",      ext: "JSON" },
    { label: "Architecture Model",     key: "architecture_model", ext: "JSON" },
    { label: "Database Schema",        key: "database_model",     ext: "JSON" },
    { label: "API Specification",      key: "openapi_model",      ext: "JSON" },
  ] as { label: string; key: keyof Design; ext: string }[];

  const downloadJSON = (key: keyof Design, label: string) => {
    const raw = design?.[key] as string | undefined;
    if (!raw) return;
    const blob = new Blob([raw], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${label.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
  };

  if (design?.status !== "completed") {
    return (
      <Card className="bg-[#111113] border-zinc-800/60 border-dashed p-12 flex flex-col items-center text-center">
        <AlertCircle className="w-8 h-8 text-zinc-600 mb-4" />
        <p className="text-sm text-zinc-500">Exports available once all phases are approved.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3 w-full flex-1 flex flex-col min-h-0">
      <Card className="bg-[#111113] border-zinc-800/60 p-5 flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <Download className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Export Artifacts</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {items.map(({ label, key, ext }) => {
            const available = !!design?.[key];
            return (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{ext}</span>
                  <span className="text-xs text-zinc-300">{label}</span>
                </div>
                <Button size="sm" variant="ghost" disabled={!available}
                  onClick={() => downloadJSON(key, label)}
                  className="h-7 text-xs text-zinc-400 hover:text-zinc-200 gap-1 disabled:opacity-30">
                  <Download className="w-3 h-3" /> Download
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
