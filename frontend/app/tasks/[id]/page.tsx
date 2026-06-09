"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Clock, Circle, Loader2, AlertCircle,
  Server, Database, LayoutDashboard, TestTube2,
  ArrowLeft, ArrowUpRight, GitBranch, ExternalLink,
  Plus, Trash2, Send, MessageSquare, User, Cpu, Sparkles, ChevronRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  apiGetTask,
  apiUpdateTaskStatus,
  apiListTaskMessages,
  apiCreateTaskMessage,
  apiDraftGithubIssueForTask,
  apiCreateGithubIssueForTask,
  apiUnlinkGithubIssueForTask,
  type TaskAssignment,
  type TaskMessage
} from "@/lib/api";

const STATUS_CONFIG = {
  todo:        { label: "To Do",       icon: Circle,       text: "text-zinc-500",  badge: "bg-zinc-900 text-zinc-500 border-zinc-800" },
  in_progress: { label: "In Progress", icon: Clock,        text: "text-blue-400",  badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  done:        { label: "Done",        icon: CheckCircle2, text: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
} as const;

const CAT_ICONS: Record<string, React.ElementType> = {
  backend: Server, frontend: LayoutDashboard,
  database: Database, infrastructure: Server, testing: TestTube2,
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [task, setTask] = useState<TaskAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Messages Thread State
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // GitHub integration 2-step flow state
  // idle → asking → answering → creating → done(linked)
  type IssueFlowStep = "idle" | "asking" | "answering" | "creating";
  const [issueFlowStep, setIssueFlowStep] = useState<IssueFlowStep>("idle");
  const [issueQuestions, setIssueQuestions] = useState<string[]>([]);
  const [issueAnswers, setIssueAnswers] = useState<Record<number, string>>({});
  const [linking, setLinking] = useState(false);

  // Step 1: Ask AI for clarifying questions
  async function startIssueFlow() {
    if (!task) return;
    setIssueFlowStep("asking");
    try {
      const result = await apiDraftGithubIssueForTask(task.id);
      setIssueQuestions(result.questions);
      setIssueAnswers({});
      setIssueFlowStep("answering");
    } catch (err: any) {
      setError(err.message || "Failed to start issue generation");
      setIssueFlowStep("idle");
    }
  }

  // Step 2: Submit answers and create the issue
  async function submitIssueAnswers() {
    if (!task) return;
    setIssueFlowStep("creating");
    setLinking(true);
    try {
      const answers = issueQuestions.map((q, i) => ({
        question: q,
        answer: issueAnswers[i] || "",
      }));
      const updatedTask = await apiCreateGithubIssueForTask(task.id, answers);
      setTask(updatedTask);
      const sysMsg = await apiCreateTaskMessage(
        task.id,
        `GitHub Issue created by Archon AI: ${updatedTask.github_issue_url}`
      );
      setMessages((prev) => [...prev, sysMsg]);
    } catch (err: any) {
      setError(err.message || "Failed to create GitHub Issue");
      setIssueFlowStep("idle");
    } finally {
      setLinking(false);
    }
  }


  function fetchTaskData() {
    setLoading(true);
    Promise.all([apiGetTask(id), apiListTaskMessages(id)])
      .then(([taskData, messageData]) => {
        setTask(taskData);
        setMessages(messageData);
      })
      .catch((e) => setError(e.message || "Failed to fetch task details"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchTaskData();
  }, [id]);

  async function handleMove(status: "todo" | "in_progress" | "done") {
    if (!task) return;
    setUpdating(true);
    try {
      const updated = await apiUpdateTaskStatus(
        task.design_id, task.epic_name, task.story_name, task.task_title, status
      );
      setTask(updated);

      // Create a status change system message in the backend
      const systemContent = `Status updated from ${task.status.toUpperCase()} to ${status.toUpperCase()}.`;
      const systemMsg = await apiCreateTaskMessage(task.id, systemContent);
      setMessages(prev => [...prev, systemMsg]);
    } catch (e: any) {
      setError(e.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !newMessage.trim()) return;

    try {
      const sentMsg = await apiCreateTaskMessage(task.id, newMessage.trim());
      setMessages(prev => [...prev, sentMsg]);
      setNewMessage("");
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    }
  }

  async function unlinkGithubIssue() {
    if (!task) return;
    setLinking(true);
    try {
      await apiUnlinkGithubIssueForTask(task.id);
      setTask((prev) => (prev ? { ...prev, github_issue_url: "" } : null));
      setIssueFlowStep("idle");
      setIssueQuestions([]);
      setIssueAnswers({});
      const sysMsg = await apiCreateTaskMessage(task.id, "GitHub Issue unlinked.");
      setMessages((prev) => [...prev, sysMsg]);
    } catch (err: any) {
      setError(err.message || "Failed to unlink GitHub Issue");
    } finally {
      setLinking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b]">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4 min-h-screen bg-[#0a0a0b] flex flex-col justify-center">
        <Card className="bg-red-500/5 border-red-500/20 p-6 space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-semibold text-sm">Error Loading Task</h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{error || "Task could not be found."}</p>
          <Button onClick={() => router.push("/tasks")} className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs w-full">
            Back to My Tasks
          </Button>
        </Card>
      </div>
    );
  }

  const EpicIcon = CAT_ICONS[task.epic_name?.toLowerCase()] || Server;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 p-6 font-sans">
      <div className="space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/tasks")}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                <Link href="/tasks" className="hover:text-zinc-350 transition-colors">My Tasks</Link>
                <span>/</span>
                <span className="truncate">{task.workspace_name || "Workspace"}</span>
                <span>/</span>
                <span className="truncate">{task.project_name || "Project"}</span>
              </div>
              <h1 className="text-lg font-bold text-zinc-100 mt-1 truncate">{task.task_title}</h1>
            </div>
          </div>

          <Link href={`/projects/${task.project_id}/design/${task.design_id}/backlog`}>
            <Button variant="outline" size="sm" className="h-8 text-xs bg-zinc-950 border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200">
              View Backlog <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>

        {/* 2-Column Full Width Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left/Main Column: Chat/Messages Thread */}
          <div className="lg:col-span-2 flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            <Card className="bg-[#111113] border-zinc-800/60 flex flex-col flex-1 overflow-hidden">
              
              {/* Thread Header */}
              <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/20">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-zinc-450" />
                  <span className="text-xs font-semibold text-zinc-300">Activity & Message Thread</span>
                </div>
                <Badge className="text-[10px] bg-zinc-900 text-zinc-500 border-zinc-800">
                  {messages.length} messages
                </Badge>
              </div>

              {/* Message History Feed */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-zinc-600 text-xs">
                    No messages yet. Send a status update below to start the thread.
                  </div>
                )}
                {messages.map((msg) => {
                  const isAgent = msg.role === "agent";
                  const isSelf = msg.sender_name === "Arjun Kumar";

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3 text-xs leading-relaxed max-w-2xl",
                        isSelf ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 border",
                        isAgent ? "bg-indigo-950/40 border-indigo-900/40 text-indigo-400" :
                        isSelf ? "bg-zinc-800 border-zinc-700 text-zinc-300" :
                        "bg-amber-950/40 border-amber-900/40 text-amber-400"
                      )}>
                        {isAgent ? <Cpu className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      </div>

                      {/* Content Bubble */}
                      <div className="space-y-1">
                        <div className={cn("flex items-center gap-2", isSelf ? "flex-row-reverse" : "")}>
                          <span className="font-semibold text-zinc-200">{msg.sender_name}</span>
                          <span className="text-[9px] text-zinc-650">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className={cn(
                          "p-3 rounded-xl border text-zinc-300 font-sans whitespace-pre-wrap",
                          isSelf ? "bg-indigo-600/10 border-indigo-500/20 rounded-tr-none text-right" :
                          isAgent ? "bg-zinc-950/80 border-zinc-850 rounded-tl-none font-mono text-[11px]" :
                          "bg-zinc-900/60 border-zinc-800/80 rounded-tl-none"
                        )}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Entry Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-900 bg-zinc-950/10 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a status update or team reply..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 text-xs rounded-lg px-4 py-2.5 focus:outline-none focus:border-zinc-700 text-zinc-200 placeholder:text-zinc-700"
                />
                <Button type="submit" disabled={!newMessage.trim()} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 h-auto py-2.5 px-4 text-xs font-semibold">
                  <Send className="w-3.5 h-3.5" /> Send
                </Button>
              </form>

            </Card>
          </div>

          {/* Right Column: Status Transitions, Metadata, and GitHub Integration */}
          <div className="space-y-6">
            
            {/* Status Panel */}
            <Card className="bg-[#111113] border-zinc-800/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Status & Transitions</h3>
                {updating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                ) : (
                  <Badge className={cn("text-[10px] border font-bold gap-1", STATUS_CONFIG[task.status].badge)}>
                    {(() => { const Icon = STATUS_CONFIG[task.status].icon; return <Icon className="w-2.5 h-2.5" />; })()}
                    {STATUS_CONFIG[task.status].label}
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {(["todo", "in_progress", "done"] as const).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  const active = task.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => handleMove(s)}
                      disabled={updating || active}
                      className={cn(
                        "flex items-center justify-between py-2 px-3 rounded-lg border text-xs font-semibold transition-all text-left",
                        active
                          ? "bg-indigo-600/10 border-indigo-500/25 text-indigo-400 cursor-default"
                          : "bg-zinc-950/40 border-zinc-850 text-zinc-500 hover:text-zinc-350 hover:border-zinc-755 disabled:opacity-40"
                      )}
                    >
                      <span>{cfg.label}</span>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* GitHub Issue Integration Card */}
            <Card className="bg-[#111113] border-zinc-800/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">GitHub Issue</h3>
                </div>
                <span className="flex items-center gap-1 text-[9px] text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> AI-powered
                </span>
              </div>

              {/* Linked state */}
              {task.github_issue_url ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-800/40 bg-emerald-500/5 min-w-0">
                    <GitBranch className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <a
                      href={task.github_issue_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-350 font-mono hover:text-white transition-colors truncate block flex-1"
                    >
                      {task.github_issue_url}
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <a href={task.github_issue_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-zinc-200" disabled={linking}>
                        Open Issue <ExternalLink className="w-3 h-3 ml-1.5" />
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={unlinkGithubIssue}
                      disabled={linking}
                      className="border-red-950/45 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 px-2.5"
                    >
                      {linking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

              /* Step: asking — AI is generating questions */
              ) : issueFlowStep === "asking" ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-semibold text-zinc-300">Analysing task context...</p>
                    <p className="text-[10px] text-zinc-600">The AI agent is preparing clarifying questions</p>
                  </div>
                </div>

              /* Step: answering — user fills in the questions */
              ) : issueFlowStep === "answering" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/8 border border-indigo-500/15 rounded-lg px-3 py-2">
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-[11px] leading-snug">Answer these questions to generate the best possible issue.</span>
                  </div>
                  <div className="space-y-3">
                    {issueQuestions.map((q, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 w-4 h-4 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <label className="text-[11px] text-zinc-300 leading-snug font-medium">{q}</label>
                        </div>
                        <textarea
                          rows={2}
                          value={issueAnswers[i] || ""}
                          onChange={(e) => setIssueAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                          placeholder="Your answer..."
                          className="w-full bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/60 placeholder:text-zinc-700 resize-none leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={submitIssueAnswers}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5 h-8"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Generate Issue
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIssueFlowStep("idle")}
                      className="text-xs border-zinc-800 text-zinc-500 hover:text-zinc-300 h-8 px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

              /* Step: creating — AI is writing + GitHub App is posting */
              ) : issueFlowStep === "creating" ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-semibold text-zinc-300">Creating issue...</p>
                    <p className="text-[10px] text-zinc-600">Archon AI is writing and posting via the GitHub App</p>
                  </div>
                </div>

              /* Step: idle — initial CTA */
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={startIssueFlow}
                    className="w-full group relative overflow-hidden rounded-xl border border-zinc-700/50 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-4 text-left transition-all hover:border-indigo-500/40 hover:from-indigo-500/5 hover:to-zinc-950"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/15 transition-colors">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 mb-0.5">Create GitHub Issue</p>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                          AI agent analyses the task &amp; thread, asks clarifying questions, then creates a rich issue via the Archon GitHub App.
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors mt-0.5 flex-shrink-0" />
                    </div>
                  </button>
                </div>
              )}
            </Card>

            {/* Task Details Metadata Card */}
            <Card className="bg-[#111113] border-zinc-800/60 p-5 space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-900 pb-2">Task Attributes</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-zinc-600 uppercase font-mono block">Assignee</span>
                  <span className="text-xs text-zinc-300 font-semibold">{task.assignee_email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-600 uppercase font-mono block">Assigned By</span>
                  <span className="text-xs text-zinc-300 font-semibold">{task.assigned_by || "System"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-600 uppercase font-mono block">Created</span>
                  <span className="text-xs text-zinc-300 font-semibold">
                    {new Date(task.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-600 uppercase font-mono block">Last Updated</span>
                  <span className="text-xs text-zinc-300 font-semibold">
                    {new Date(task.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </Card>

          </div>

        </div>

      </div>
    </div>
  );
}
