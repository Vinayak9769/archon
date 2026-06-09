"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Layers, RefreshCw, Loader2, AlertCircle,
  ChevronDown, Server, Database, LayoutDashboard, TestTube2,
  UserPlus, X, CheckCircle2, Clock, Circle, Users
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  apiGetDesign, apiGenerateBacklog, apiListWorkspaceMembers, apiGetProject,
  apiListDesignTasks, apiAssignTask, apiUnassignTask,
  type Design, type WorkspaceMember, type TaskAssignment
} from "@/lib/api";
import { getToken } from "@/lib/api";

function getCurrentUserId(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || payload.user_id || null;
  } catch { return null; }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ImplementationTask {
  title: string;
  description: string;
  category: string;
  estimated_complexity: string;
  dependencies: string[];
}
interface Story { name: string; description: string; tasks: ImplementationTask[]; }
interface Epic  { name: string; description: string; stories: Story[]; }
interface ImplementationBacklog { project_name: string; description: string; epics: Epic[]; }

// ── Constants ─────────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  backend:        { bg: "bg-zinc-800/10",    text: "text-zinc-350",    border: "border-zinc-700/20",    icon: Server },
  frontend:       { bg: "bg-zinc-800/10",    text: "text-zinc-350",    border: "border-zinc-700/20",    icon: LayoutDashboard },
  database:       { bg: "bg-zinc-800/10",    text: "text-zinc-350",    border: "border-zinc-700/20",    icon: Database },
  infrastructure: { bg: "bg-zinc-800/10",    text: "text-zinc-350",    border: "border-zinc-700/20",    icon: Server },
  testing:        { bg: "bg-zinc-800/10",    text: "text-zinc-350",    border: "border-zinc-700/20",    icon: TestTube2 },
};

const COMP_COLORS: Record<string, string> = {
  XS: "text-zinc-400 bg-zinc-800/10 border-zinc-700/20",
  S:  "text-zinc-400  bg-zinc-800/10  border-zinc-700/20",
  M:  "text-zinc-400 bg-zinc-800/10 border-zinc-700/20",
  L:  "text-zinc-400 bg-zinc-800/10 border-zinc-700/20",
  XL: "text-zinc-400    bg-zinc-800/10    border-zinc-700/20",
};

const STATUS_ICONS = { todo: Circle, in_progress: Clock, done: CheckCircle2 };
const STATUS_COLORS = {
  todo:        "text-zinc-500",
  in_progress: "text-zinc-300",
  done:        "text-zinc-100",
};

// ── Context ───────────────────────────────────────────────────────────────────
interface BacklogContext {
  designId: string;
  members: WorkspaceMember[];
  assignments: Map<string, TaskAssignment>; // key = `epic|story|title`
  isOwner: boolean;
  onAssign: (epicName: string, storyName: string, taskTitle: string, assigneeId: string) => Promise<void>;
  onUnassign: (epicName: string, storyName: string, taskTitle: string) => Promise<void>;
}

function taskKey(epic: string, story: string, title: string) {
  return `${epic}|||${story}|||${title}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BacklogPage() {
  const params = useParams<{ id: string; designId: string }>();
  const { id: projectId, designId } = params;
  const currentUserId = getCurrentUserId();

  const [design, setDesign] = useState<Design | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const backlog: ImplementationBacklog | null = useMemo(() => {
    if (!design?.backlog_model) return null;
    try { return JSON.parse(design.backlog_model); } catch { return null; }
  }, [design]);

  const assignmentMap = useMemo(() => {
    const m = new Map<string, TaskAssignment>();
    assignments.forEach((a) => m.set(taskKey(a.epic_name, a.story_name, a.task_title), a));
    return m;
  }, [assignments]);

  const isOwner = useMemo(() => {
    if (!design || !currentUserId) return false;
    return members.find(m => m.user_id === currentUserId)?.role === "owner";
  }, [design, currentUserId, members]);

  useEffect(() => {
    if (!designId) return;
    Promise.all([
      apiGetDesign(designId),
      apiListDesignTasks(designId),
    ])
      .then(async ([d, a]) => {
        setDesign(d);
        setAssignments(a || []);
        // Load workspace members
        if (d.project_id) {
          try {
            const project = await apiGetProject(d.project_id);
            if (project.workspace_id) {
              const mems = await apiListWorkspaceMembers(project.workspace_id);
              setMembers(mems || []);
            }
          } catch { /* non-fatal */ }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [designId]);

  async function handleGenerate() {
    if (!design) return;
    setGenerating(true);
    setGenError(null);
    try {
      const updated = await apiGenerateBacklog(design.id, feedback || undefined);
      setDesign(updated);
      setFeedback("");
      setShowFeedback(false);
    } catch (e: any) { setGenError(e.message); }
    finally { setGenerating(false); }
  }

  async function handleAssign(epicName: string, storyName: string, taskTitle: string, assigneeId: string) {
    if (!design) return;
    const ta = await apiAssignTask(design.id, epicName, storyName, taskTitle, assigneeId);
    setAssignments(prev => {
      const next = prev.filter(a =>
        !(a.epic_name === epicName && a.story_name === storyName && a.task_title === taskTitle)
      );
      return [...next, ta];
    });
  }

  async function handleUnassign(epicName: string, storyName: string, taskTitle: string) {
    if (!design) return;
    await apiUnassignTask(design.id, epicName, storyName, taskTitle);
    setAssignments(prev =>
      prev.filter(a =>
        !(a.epic_name === epicName && a.story_name === storyName && a.task_title === taskTitle)
      )
    );
  }

  const ctx: BacklogContext = {
    designId: designId,
    members,
    assignments: assignmentMap,
    isOwner,
    onAssign: handleAssign,
    onUnassign: handleUnassign,
  };

  const totalStories = useMemo(() => backlog?.epics?.reduce((s, e) => s + (e.stories?.length || 0), 0) ?? 0, [backlog]);
  const totalTasks   = useMemo(() => backlog?.epics?.reduce((s, e) => s + e.stories?.reduce((ts, st) => ts + (st.tasks?.length || 0), 0), 0) ?? 0, [backlog]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b]">
      <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
    </div>
  );

  if (error || !design) return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="bg-red-500/5 border-red-500/20 p-5 flex items-center gap-3">
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <p className="text-xs text-red-400">{error || "Design not found"}</p>
      </Card>
    </div>
  );

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[#0a0a0b]">
      {/* Nav */}
      <Link href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-350 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Project
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center">
            <Layers className="w-6 h-6 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Implementation Backlog</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {backlog?.project_name || "Project"} · Engineering task breakdown
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {backlog && (
            <div className="flex items-center gap-3">
              <Stat label="Epics" value={backlog.epics.length} />
              <Stat label="Stories" value={totalStories} />
              <Stat label="Tasks" value={totalTasks} />
              {members.length > 0 && <Stat label="Members" value={members.length} icon={<Users className="w-3 h-3 text-zinc-400" />} />}
            </div>
          )}
          <Button size="sm" disabled={generating} onClick={() => setShowFeedback(!showFeedback)}
            className="bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-200 border border-zinc-700/60 text-xs font-bold gap-1.5" variant="outline">
            <RefreshCw className={cn("w-3.5 h-3.5", generating && "animate-spin")} />
            {backlog ? "Regenerate" : "Generate Backlog"}
          </Button>
        </div>
      </div>

      {/* Generate Panel */}
      {(showFeedback || !backlog) && (
        <Card className="bg-[#111113] border-zinc-800/60 p-5 space-y-3">
          <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            {backlog ? "Refinement Feedback" : "Generate from Design Artifacts"}
          </h2>
          <p className="text-[11px] text-zinc-500">
            {backlog ? "Provide optional feedback to guide regeneration." : "The AI agent will analyze your Architecture, Database, and API designs."}
          </p>
          <Textarea placeholder="e.g. Focus more on payment integration tasks..." value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs placeholder:text-zinc-700 focus:border-zinc-600/60 resize-none h-20" />
          {genError && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{genError}</p>}
          <div className="flex justify-end gap-2">
            {backlog && (
              <Button size="sm" variant="ghost" onClick={() => { setShowFeedback(false); setFeedback(""); }}
                className="text-zinc-500 hover:text-zinc-300 text-xs">Cancel</Button>
            )}
            <Button size="sm" disabled={generating} onClick={handleGenerate}
              className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold gap-1.5">
              {generating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Layers className="w-3.5 h-3.5" />{backlog ? "Regenerate" : "Generate Backlog"}</>}
            </Button>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!backlog && !showFeedback && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center mb-5">
            <Layers className="w-8 h-8 text-zinc-400 opacity-60" />
          </div>
          <h2 className="text-base font-bold text-zinc-300 mb-2">No backlog generated yet</h2>
          <p className="text-xs text-zinc-600 max-w-sm mb-6">Click &quot;Generate Backlog&quot; to produce a full engineering backlog from your design artifacts.</p>
          <Button size="sm" onClick={() => setShowFeedback(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Generate Backlog
          </Button>
        </div>
      )}

      {/* Backlog Tree */}
      {backlog?.epics && (
        <div className="space-y-4">
          {backlog.epics.map((epic, ei) => (
            <EpicCard key={`epic-${ei}`} epic={epic} epicIndex={ei} defaultOpen={ei === 0} ctx={ctx} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/40 border border-zinc-800/40">
      {icon}
      <span className="text-xs font-bold text-zinc-200">{value}</span>
      <span className="text-[10px] text-zinc-500 font-semibold">{label}</span>
    </div>
  );
}

// ── EpicCard ──────────────────────────────────────────────────────────────────
function EpicCard({ epic, epicIndex, defaultOpen, ctx }: { epic: Epic; epicIndex: number; defaultOpen: boolean; ctx: BacklogContext }) {
  const [open, setOpen] = useState(defaultOpen);
  const totalTasks = epic.stories?.reduce((s, st) => s + (st.tasks?.length || 0), 0) ?? 0;

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-[#0e0e10] overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 py-4 px-5 hover:bg-zinc-900/20 transition-colors text-left">
        <ChevronDown className={cn("w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform", open && "rotate-180")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-zinc-200">{epic.name}</span>
            <Badge className="bg-zinc-900/40 text-zinc-400 border-zinc-800/40 text-[11px] px-2">
              {epic.stories?.length || 0} stories · {totalTasks} tasks
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-1 truncate">{epic.description}</p>
        </div>
      </button>
      {open && (
        <div className="border-t border-zinc-800/50 divide-y divide-zinc-900/60">
          {epic.stories?.map((story, si) => (
            <StoryRow key={`story-${epicIndex}-${si}`} story={story} epicName={epic.name} ctx={ctx} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── StoryRow ──────────────────────────────────────────────────────────────────
function StoryRow({ story, epicName, ctx }: { story: Story; epicName: string; ctx: BacklogContext }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#0c0c0e]">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 py-3 px-6 hover:bg-zinc-900/30 transition-colors text-left">
        <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-600 flex-shrink-0 transition-transform", open && "rotate-180")} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-zinc-300">{story.name}</span>
          {!open && <p className="text-xs text-zinc-600 mt-0.5 truncate">{story.description}</p>}
        </div>
        <Badge className="bg-zinc-900 text-zinc-500 border-zinc-800 text-[10px] flex-shrink-0">
          {story.tasks?.length || 0} tasks
        </Badge>
      </button>
      {open && (
        <div className="pb-3 px-6 space-y-2">
          <p className="text-xs text-zinc-500 mb-4">{story.description}</p>
          {story.tasks?.map((task, ti) => (
            <TaskRow key={`task-${ti}`} task={task} epicName={epicName} storyName={story.name} ctx={ctx} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── TaskRow ───────────────────────────────────────────────────────────────────
function TaskRow({ task, epicName, storyName, ctx }: {
  task: ImplementationTask; epicName: string; storyName: string; ctx: BacklogContext;
}) {
  const cat = CAT_COLORS[task.category] || CAT_COLORS.backend;
  const CatIcon = cat.icon;
  const assignment = ctx.assignments.get(taskKey(epicName, storyName, task.title));
  const [showAssign, setShowAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const StatusIcon = assignment ? STATUS_ICONS[assignment.status] : null;

  async function doAssign(memberId: string) {
    setAssigning(true);
    try { await ctx.onAssign(epicName, storyName, task.title, memberId); }
    finally { setAssigning(false); setShowAssign(false); }
  }

  async function doUnassign() {
    setAssigning(true);
    try { await ctx.onUnassign(epicName, storyName, task.title); }
    finally { setAssigning(false); }
  }

  return (
    <div className="flex items-start gap-3 py-3 px-4 rounded-lg bg-zinc-950/60 border border-zinc-900/60 hover:border-zinc-800/60 transition-colors">
      <CatIcon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", cat.text)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-zinc-200">{task.title}</span>
          <Badge className={cn("text-[10px] font-bold border px-1.5", cat.bg, cat.text, cat.border)}>{task.category}</Badge>
          <Badge className={cn("text-[10px] font-mono font-bold border px-1.5", COMP_COLORS[task.estimated_complexity])}>
            {task.estimated_complexity}
          </Badge>
        </div>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{task.description}</p>

        {/* Dependencies */}
        {task.dependencies?.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-[10px] text-zinc-600 font-semibold">Deps:</span>
            {task.dependencies.map((dep, di) => (
              <span key={di} className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800/60 rounded px-2 py-0.5 font-mono">{dep}</span>
            ))}
          </div>
        )}

        {/* Assignment row */}
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {assignment ? (
            <div className="flex items-center gap-1.5">
              {StatusIcon && (
                <StatusIcon className={cn("w-3.5 h-3.5", STATUS_COLORS[assignment.status])} />
              )}
              <span className="text-xs font-semibold text-zinc-400">{assignment.assignee_email}</span>
              {ctx.isOwner && (
                <button onClick={doUnassign} disabled={assigning}
                  className="text-zinc-700 hover:text-red-400 transition-colors ml-0.5">
                  {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          ) : ctx.isOwner && ctx.members.length > 0 ? (
            <div className="relative">
              <button onClick={() => setShowAssign(!showAssign)}
                className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors border border-zinc-800/60 rounded px-2 py-0.5">
                <UserPlus className="w-3.5 h-3.5" /> Assign
              </button>
              {showAssign && (
                <div className="absolute left-0 top-7 z-20 bg-[#1a1a1c] border border-zinc-800 rounded-lg shadow-xl min-w-[180px] py-1 overflow-hidden">
                  {ctx.members.map((m) => (
                    <button key={m.user_id}
                      onClick={() => doAssign(m.user_id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/60 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-zinc-400">{m.email[0].toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-zinc-300 truncate">{m.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
