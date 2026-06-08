"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2, Clock, Circle, Loader2, AlertCircle,
  Layers, Server, Database, LayoutDashboard, TestTube2, ArrowUpRight,
  RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiListMyTasks, apiUpdateTaskStatus, type TaskAssignment } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  todo: {
    label: "To Do",
    icon: Circle,
    bg: "bg-zinc-900",
    border: "border-zinc-800/60",
    text: "text-zinc-500",
    badge: "bg-zinc-900 text-zinc-500 border-zinc-800",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    bg: "bg-blue-500/5",
    border: "border-blue-800/30",
    text: "text-blue-400",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    bg: "bg-emerald-500/5",
    border: "border-emerald-800/30",
    text: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
};

const STATUS_CYCLE: Record<string, "todo" | "in_progress" | "done"> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const CAT_COLORS: Record<string, { text: string; icon: React.ElementType }> = {
  backend:        { text: "text-blue-400",    icon: Server },
  frontend:       { text: "text-emerald-400", icon: LayoutDashboard },
  database:       { text: "text-amber-400",   icon: Database },
  infrastructure: { text: "text-rose-400",    icon: Server },
  testing:        { text: "text-cyan-400",    icon: TestTube2 },
};

const COMP_COLORS: Record<string, string> = {
  XS: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  S:  "text-green-400  bg-green-500/10  border-green-500/20",
  M:  "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  L:  "text-orange-400 bg-orange-500/10 border-orange-500/20",
  XL: "text-red-400    bg-red-500/10    border-red-500/20",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null); // task composite key

  function fetchTasks() {
    setLoading(true);
    apiListMyTasks()
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchTasks(); }, []);

  // Group tasks by status
  const grouped = useMemo(() => {
    const g: Record<string, TaskAssignment[]> = { todo: [], in_progress: [], done: [] };
    tasks.forEach((t) => { (g[t.status] ||= []).push(t); });
    return g;
  }, [tasks]);

  async function handleStatusToggle(task: TaskAssignment) {
    const key = `${task.design_id}:${task.epic_name}:${task.story_name}:${task.task_title}`;
    const next = STATUS_CYCLE[task.status];
    setUpdating(key);
    try {
      const updated = await apiUpdateTaskStatus(
        task.design_id, task.epic_name, task.story_name, task.task_title, next
      );
      setTasks(prev => prev.map(t =>
        t.design_id === task.design_id &&
        t.epic_name === task.epic_name &&
        t.story_name === task.story_name &&
        t.task_title === task.task_title
          ? updated : t
      ));
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6 min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center">
            <Layers className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">My Tasks</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned to you across all workspaces
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchTasks} disabled={loading}
          className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs gap-1.5">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 text-zinc-400 animate-spin" />
        </div>
      )}
      {error && (
        <Card className="bg-red-500/5 border-red-500/20 p-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" /><p className="text-xs text-red-400">{error}</p>
        </Card>
      )}

      {!loading && tasks.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-8 h-8 text-zinc-400 opacity-60" />
          </div>
          <h2 className="text-base font-bold text-zinc-300 mb-2">No tasks assigned</h2>
          <p className="text-xs text-zinc-600 max-w-sm">
            When a workspace owner assigns you tasks from a design backlog, they&apos;ll appear here.
          </p>
        </div>
      )}

      {/* Kanban Columns */}
      {!loading && tasks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["todo", "in_progress", "done"] as const).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const StatusIcon = cfg.icon;
            const columnTasks = grouped[status] || [];
            return (
              <div key={status} className="space-y-3">
                {/* Column header */}
                <div className="flex items-center gap-2 px-1">
                  <StatusIcon className={cn("w-4 h-4", cfg.text)} />
                  <span className={cn("text-xs font-bold", cfg.text)}>{cfg.label}</span>
                  <Badge className={cn("text-[9px] font-bold border ml-auto", cfg.badge)}>
                    {columnTasks.length}
                  </Badge>
                </div>

                {/* Task cards */}
                <div className="space-y-2">
                  {columnTasks.map((task) => {
                    const cat = CAT_COLORS[task.epic_name?.toLowerCase()] || CAT_COLORS.backend;
                    const key = `${task.design_id}:${task.epic_name}:${task.story_name}:${task.task_title}`;
                    return (
                      <TaskCard
                        key={key}
                        task={task}
                        statusCfg={cfg}
                        isUpdating={updating === key}
                        onToggleStatus={() => handleStatusToggle(task)}
                      />
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className="border border-dashed border-zinc-800/40 rounded-xl p-6 text-center">
                      <p className="text-[10px] text-zinc-700">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({
  task, statusCfg, isUpdating, onToggleStatus
}: {
  task: TaskAssignment;
  statusCfg: typeof STATUS_CONFIG["todo"];
  isUpdating: boolean;
  onToggleStatus: () => void;
}) {
  const StatusIcon = statusCfg.icon;
  const nextStatus = STATUS_CYCLE[task.status];

  return (
    <Card className="bg-[#111113] border-zinc-800/60 hover:border-zinc-700/60 transition-all p-4 space-y-3">
      {/* Top: project/workspace breadcrumb */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[9px] text-zinc-600 font-semibold truncate">
            {task.workspace_name || "Workspace"} / {task.project_name || "Project"}
          </span>
        </div>
        <Link
          href={`/projects/${task.project_id}/design/${task.design_id}/backlog`}
          className="text-zinc-700 hover:text-zinc-400 transition-colors flex-shrink-0"
          title="View in backlog"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Task title */}
      <div>
        <p className="text-xs font-bold text-zinc-200 leading-snug">{task.task_title}</p>
        <p className="text-[10px] text-zinc-600 mt-0.5">
          {task.epic_name} › {task.story_name}
        </p>
      </div>

      {/* Status toggle + status cycle button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleStatus}
          disabled={isUpdating}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold transition-all hover:opacity-80",
            statusCfg.badge
          )}
          title={`Mark as ${STATUS_CONFIG[nextStatus].label}`}
        >
          {isUpdating
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <StatusIcon className="w-3 h-3" />
          }
          {statusCfg.label}
        </button>
        <span className="text-[9px] text-zinc-700">
          {new Date(task.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
      </div>
    </Card>
  );
}
