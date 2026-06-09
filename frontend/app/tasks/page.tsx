"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Clock, Circle, Loader2, AlertCircle,
  Layers, Server, Database, LayoutDashboard, TestTube2, ArrowUpRight,
  RefreshCw, GripVertical
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
    text: "text-zinc-500",
    badge: "bg-zinc-900 text-zinc-500 border-zinc-800",
    col: "border-zinc-800/40 bg-zinc-950/20"
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    text: "text-blue-400",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    col: "border-blue-800/20 bg-zinc-950/20"
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    text: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    col: "border-emerald-800/20 bg-zinc-950/20"
  },
} as const;

const STATUS_CYCLE: Record<string, "todo" | "in_progress" | "done"> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyTasksPage() {
  const router = useRouter();
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

  // Unified status update function
  async function moveTask(task: TaskAssignment, nextStatus: "todo" | "in_progress" | "done") {
    const key = `${task.design_id}:${task.epic_name}:${task.story_name}:${task.task_title}`;
    setUpdating(key);
    try {
      const updated = await apiUpdateTaskStatus(
        task.design_id, task.epic_name, task.story_name, task.task_title, nextStatus
      );
      setTasks(prev => prev.map(t =>
        t.design_id === task.design_id &&
        t.epic_name === task.epic_name &&
        t.story_name === task.story_name &&
        t.task_title === task.task_title
          ? updated : t
      ));
    } catch (e: any) {
      setError(e.message || "Failed to update status");
    } finally {
      setUpdating(null);
    }
  }

  // DnD Column Drop logic
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, colStatus: "todo" | "in_progress" | "done") {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("application/json");
    if (!dataStr) return;
    try {
      const draggedTask = JSON.parse(dataStr) as TaskAssignment;
      if (draggedTask.status !== colStatus) {
        moveTask(draggedTask, colStatus);
      }
    } catch (err) {
      // ignore JSON parse errors
    }
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[#0a0a0b] text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center">
            <Layers className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">My Tasks</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} assigned to you across all workspaces · Drag cards to change status
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(["todo", "in_progress", "done"] as const).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const StatusIcon = cfg.icon;
            const columnTasks = grouped[status] || [];
            return (
              <div
                key={status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
                className={cn("flex flex-col gap-3 rounded-xl border p-3 min-h-[500px] transition-colors", cfg.col)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 px-1">
                  <StatusIcon className={cn("w-4 h-4", cfg.text)} />
                  <span className={cn("text-xs font-bold", cfg.text)}>{cfg.label}</span>
                  <Badge className={cn("text-[9px] font-bold border ml-auto", cfg.badge)}>
                    {columnTasks.length}
                  </Badge>
                </div>

                {/* Task cards */}
                <div className="flex-1 flex flex-col gap-2.5">
                  {columnTasks.map((task) => {
                    const key = `${task.design_id}:${task.epic_name}:${task.story_name}:${task.task_title}`;
                    return (
                      <TaskCard
                        key={key}
                        task={task}
                        statusCfg={cfg}
                        isUpdating={updating === key}
                        onCycle={() => moveTask(task, STATUS_CYCLE[task.status])}
                        onClick={() => router.push(`/tasks/${task.id}`)}
                      />
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-800/40 rounded-xl p-6 min-h-[120px]">
                      <p className="text-[10px] text-zinc-700">Drop tasks here</p>
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
  task, statusCfg, isUpdating, onCycle, onClick
}: {
  task: TaskAssignment;
  statusCfg: typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG];

  isUpdating: boolean;
  onCycle: () => void;
  onClick: () => void;
}) {
  const StatusIcon = statusCfg.icon;

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("application/json", JSON.stringify(task));
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="group bg-[#111113] border border-zinc-800/60 hover:border-zinc-700/60 transition-all p-4 rounded-xl space-y-3 cursor-pointer select-none active:scale-[0.98]"
    >
      {/* Top: project/workspace breadcrumb */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors flex-shrink-0 cursor-grab" />
          <span className="text-[10px] text-zinc-650 font-bold truncate">
            {task.workspace_name || "Workspace"} / {task.project_name || "Project"}
          </span>
        </div>
        <Link
          href={`/projects/${task.project_id}/design/${task.design_id}/backlog`}
          className="text-zinc-700 hover:text-zinc-400 transition-colors flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
          title="View in backlog"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Task title */}
      <div>
        <p className="text-sm font-bold text-zinc-200 leading-snug group-hover:text-white transition-colors">{task.task_title}</p>
        <p className="text-xs text-zinc-500 mt-1">
          {task.epic_name} › {task.story_name}
        </p>
      </div>

      {/* Status toggle + date */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCycle();
          }}
          disabled={isUpdating}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-all hover:opacity-80",
            statusCfg.badge
          )}
        >
          {isUpdating
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <StatusIcon className="w-3 h-3" />
          }
          {statusCfg.label}
        </button>
        <span className="text-[10px] text-zinc-600">
          {new Date(task.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
      </div>
    </div>
  );
}
