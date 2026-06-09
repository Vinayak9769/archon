"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, ChevronRight, Plus, SlidersHorizontal, ListFilter,
  Circle, Clock, CheckCircle2, Loader2, AlertCircle, CheckSquare,
  X, ArrowUpRight, User
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  apiListProjects, apiListDesigns, apiListDesignTasks,
  apiAssignTask, apiUpdateTaskStatus, apiListWorkspaceMembers, apiGetProject,
  type TaskAssignment, type WorkspaceMember
} from "@/lib/api";
import { getToken } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ImplementationTask { title: string; description: string; category: string; estimated_complexity: string; }
interface Story { name: string; description: string; tasks: ImplementationTask[]; }
interface Epic  { name: string; description: string; stories: Story[]; }
interface ImplementationBacklog { project_name: string; description: string; epics: Epic[]; }

interface FlatTask {
  key: string;         // epic|||story|||title
  epicName: string;
  storyName: string;
  title: string;
  description: string;
  category: string;
  complexity: string;
  designId: string;
  projectId: string;
  projectName: string;
  issueCode: string;   // e.g. VIN-5
  assignment?: TaskAssignment;
}

function getCurrentUserId(): string | null {
  const token = getToken();
  if (!token) return null;
  try { const p = JSON.parse(atob(token.split(".")[1])); return p.sub || p.user_id || null; }
  catch { return null; }
}

const PRIORITY_LABELS = ["Low", "Medium", "High", "Critical"] as const;
type Priority = typeof PRIORITY_LABELS[number];

const PRIORITY_COLORS: Record<Priority, string> = {
  Low: "text-blue-400 border-blue-500/20 bg-blue-500/10",
  Medium: "text-amber-400 border-amber-500/20 bg-amber-500/10",
  High: "text-orange-400 border-orange-500/20 bg-orange-500/10",
  Critical: "text-red-400 border-red-500/20 bg-red-500/10",
};

const STATUS_ICONS = { todo: Circle, in_progress: Clock, done: CheckCircle2 };
const STATUS_LABELS = { todo: "To Do", in_progress: "In Progress", done: "Done" };
const STATUS_COLORS = {
  todo: "text-zinc-500",
  in_progress: "text-blue-400",
  done: "text-emerald-400",
};

function PriorityIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-3.5 h-3.5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="4" y1="20" x2="4" y2="14" /><line x1="12" y1="20" x2="12" y2="9" /><line x1="20" y1="20" x2="20" y2="4" />
    </svg>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditTaskModal({
  task, members, onClose, onSave,
}: {
  task: FlatTask;
  members: WorkspaceMember[];
  onClose: () => void;
  onSave: (updates: { status: TaskAssignment["status"]; assigneeId: string; priority: Priority }) => Promise<void>;
}) {
  const [status, setStatus] = useState<TaskAssignment["status"]>(task.assignment?.status ?? "todo");
  const [assigneeId, setAssigneeId] = useState(task.assignment?.assignee_id ?? "");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try { await onSave({ status, assigneeId, priority }); onClose(); }
    catch { /* error handled by parent */ }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <Card
        className="w-full max-w-lg bg-[#111113] border-zinc-800/60 shadow-2xl shadow-black/60 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-800/60">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono font-bold text-zinc-600">{task.issueCode}</span>
              <Badge className="text-[10px] border capitalize bg-zinc-900 border-zinc-800 text-zinc-500">
                {task.category}
              </Badge>
            </div>
            <h2 className="text-sm font-bold text-zinc-100 leading-snug">{task.title}</h2>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-2">{task.description}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="p-5 space-y-4">
          {/* Epic & Story breadcrumb */}
          <div className="text-[11px] text-zinc-600">
            <span className="text-zinc-500">{task.projectName}</span>
            <span className="mx-1.5 text-zinc-700">›</span>
            <span className="text-zinc-500">{task.epicName}</span>
            <span className="mx-1.5 text-zinc-700">›</span>
            <span className="text-zinc-400">{task.storyName}</span>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(["todo", "in_progress", "done"] as const).map((s) => {
                const Icon = STATUS_ICONS[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all",
                      status === s
                        ? "bg-zinc-800 border-zinc-600 text-zinc-100"
                        : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", status === s ? STATUS_COLORS[s] : "")} />
                    {STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_LABELS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all",
                    priority === p ? PRIORITY_COLORS[p] : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-600 transition-colors"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.email}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800/60 bg-zinc-950/40">
          <button
            onClick={() => window.open(`/tasks/${task.assignment?.id}`, "_blank")}
            disabled={!task.assignment?.id}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Open task detail
          </button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}
              className="border-zinc-800 bg-transparent text-zinc-400 hover:text-zinc-200 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !assigneeId}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Create Issue Modal ────────────────────────────────────────────────────────
function CreateIssueModal({ members, onClose }: { members: WorkspaceMember[]; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [assigneeId, setAssigneeId] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <Card
        className="w-full max-w-lg bg-[#111113] border-zinc-800/60 shadow-2xl shadow-black/60 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/60">
          <h2 className="text-sm font-bold text-zinc-100">Create Issue</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title..."
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-700 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe this issue..."
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-700 transition-colors resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_LABELS.map((p) => (
                <button key={p} onClick={() => setPriority(p)}
                  className={cn("px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all",
                    priority === p ? PRIORITY_COLORS[p] : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300")}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Assignee</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-600 transition-colors">
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.email}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800/60 bg-zinc-950/40">
          <Button size="sm" variant="outline" onClick={onClose}
            className="border-zinc-800 bg-transparent text-zinc-400 hover:text-zinc-200 text-xs">Cancel</Button>
          <Button size="sm" disabled={!title.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
            onClick={onClose}>
            Create Issue
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type TabType = "assigned" | "created" | "subscribed" | "activity";

export default function BacklogPage() {
  const router = useRouter();
  const [flatTasks, setFlatTasks] = useState<FlatTask[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>("assigned");
  const [expanded, setExpanded] = useState(true);
  const [editingTask, setEditingTask] = useState<FlatTask | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const projects = await apiListProjects();
        const allTasks: FlatTask[] = [];
        let allMembers: WorkspaceMember[] = [];
        let issueCounter = 1;

        await Promise.all(projects.map(async (project) => {
          try {
            const designs = await apiListDesigns(project.id);
            const projectPrefix = project.name.slice(0, 3).toUpperCase();

            // Load workspace members once
            if (allMembers.length === 0 && project.workspace_id) {
              try { allMembers = await apiListWorkspaceMembers(project.workspace_id); } catch { /**/ }
            }

            for (const design of designs) {
              if (!design.backlog_model) continue;
              let backlog: ImplementationBacklog | null = null;
              try { backlog = JSON.parse(design.backlog_model); } catch { continue; }
              if (!backlog?.epics) continue;

              // Fetch assignments for this design
              let assignments: TaskAssignment[] = [];
              try { assignments = await apiListDesignTasks(design.id); } catch { /**/ }
              const assignMap = new Map(assignments.map(a => [`${a.epic_name}|||${a.story_name}|||${a.task_title}`, a]));

              for (const epic of backlog.epics) {
                for (const story of epic.stories || []) {
                  for (const task of story.tasks || []) {
                    const key = `${epic.name}|||${story.name}|||${task.title}`;
                    allTasks.push({
                      key,
                      epicName: epic.name,
                      storyName: story.name,
                      title: task.title,
                      description: task.description,
                      category: task.category,
                      complexity: task.estimated_complexity,
                      designId: design.id,
                      projectId: project.id,
                      projectName: project.name,
                      issueCode: `${projectPrefix}-${issueCounter++}`,
                      assignment: assignMap.get(key),
                    });
                  }
                }
              }
            }
          } catch { /**/ }
        }));

        setFlatTasks(allTasks);
        setMembers(allMembers);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const displayTasks = useMemo(() => {
    if (activeTab === "assigned") return flatTasks.filter(t => t.assignment);
    return flatTasks;
  }, [flatTasks, activeTab]);

  async function handleSaveTask(task: FlatTask, updates: { status: TaskAssignment["status"]; assigneeId: string; priority: Priority }) {
    // Assign if needed
    if (updates.assigneeId && updates.assigneeId !== task.assignment?.assignee_id) {
      const newAssignment = await apiAssignTask(task.designId, task.epicName, task.storyName, task.title, updates.assigneeId);
      setFlatTasks(prev => prev.map(t => t.key === task.key ? { ...t, assignment: newAssignment } : t));
    }
    // Update status if there's an assignment
    if (task.assignment && updates.status !== task.assignment.status) {
      const updated = await apiUpdateTaskStatus(task.designId, task.epicName, task.storyName, task.title, updates.status);
      setFlatTasks(prev => prev.map(t => t.key === task.key ? { ...t, assignment: updated } : t));
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 p-6 space-y-5">
      <div className="border-b border-zinc-900 pb-4">
        <h1 className="text-xl font-bold text-zinc-100 tracking-tight">My Issues</h1>
      </div>

      {/* Tabs + Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-800/40 pb-2">
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-900">
          {(["assigned", "created", "subscribed", "activity"] as TabType[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn("px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all",
                activeTab === tab ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300")}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <ListFilter className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <CheckSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-zinc-500 animate-spin" /></div>}
      {error && (
        <Card className="bg-red-500/5 border-red-500/15 p-4 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400" /><p className="text-xs text-red-400">{error}</p>
        </Card>
      )}

      {!loading && (
        <div className="space-y-1">
          {/* Group header */}
          <div onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between py-2 px-3 hover:bg-zinc-900/40 rounded-lg cursor-pointer group transition-colors select-none">
            <div className="flex items-center gap-2">
              {expanded
                ? <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                : <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
              }
              <div className="w-3.5 h-3.5 rounded-full border border-dashed border-zinc-500" />
              <span className="text-sm font-semibold text-zinc-300">Backlog</span>
              <span className="text-xs text-zinc-600 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">
                {displayTasks.length}
              </span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Task rows */}
          {expanded && (
            <div className="divide-y divide-zinc-900 border border-zinc-900 rounded-lg overflow-hidden bg-zinc-950/40">
              {displayTasks.length === 0 && (
                <div className="py-12 text-center text-xs text-zinc-600">
                  {activeTab === "assigned"
                    ? "No assigned tasks &mdash; switch to &quot;All&quot; or assign tasks from a project backlog."
                    : "No backlog tasks found. Generate a backlog from a project design first."}
                </div>
              )}
              {displayTasks.map((task) => {
                const StatusIcon = STATUS_ICONS[task.assignment?.status ?? "todo"];
                const statusColor = STATUS_COLORS[task.assignment?.status ?? "todo"];
                const assigneeInitials = task.assignment?.assignee_email
                  ? task.assignment.assignee_email.split("@")[0].slice(0, 2).toUpperCase()
                  : null;

                return (
                  <div key={task.key}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-900/30 transition-all group">
                    {/* Left: checkbox, priority, code, status, title */}
                    <div
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => setEditingTask(task)}
                    >
                      <div className="w-4 h-4 rounded border border-zinc-800 group-hover:border-zinc-600 bg-zinc-950 transition-colors flex-shrink-0" />
                      <PriorityIcon className="text-zinc-500 flex-shrink-0" />
                      <span className="text-[10px] font-mono font-bold text-zinc-600 tracking-wider flex-shrink-0">{task.issueCode}</span>
                      <StatusIcon className={cn("w-3.5 h-3.5 flex-shrink-0", statusColor)} />
                      <span className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate transition-colors">
                        {task.title}
                      </span>
                    </div>

                    {/* Right: badge, assignee, date, redirect */}
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full hidden sm:flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                        {task.category || "Improvement"}
                      </Badge>

                      {assigneeInitials ? (
                        <div className="w-5 h-5 rounded-full bg-red-600/90 border border-red-500/20 flex items-center justify-center text-[9px] font-bold text-white">
                          {assigneeInitials}
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-dashed border-zinc-700 flex items-center justify-center">
                          <User className="w-2.5 h-2.5 text-zinc-600" />
                        </div>
                      )}

                      <span className="text-[10px] text-zinc-600 font-medium w-10 text-right">
                        {task.assignment
                          ? new Date(task.assignment.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : "—"}
                      </span>

                      {/* Redirect button — opens task detail in new tab */}
                      <button
                        onClick={() => task.assignment?.id && router.push(`/tasks/${task.assignment.id}`)}
                        disabled={!task.assignment?.id}
                        title={task.assignment?.id ? "Open task detail" : "Assign task first to open detail"}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          members={members}
          onClose={() => setEditingTask(null)}
          onSave={(updates) => handleSaveTask(editingTask, updates)}
        />
      )}
      {showCreate && (
        <CreateIssueModal members={members} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
