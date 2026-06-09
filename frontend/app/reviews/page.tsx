"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  GitPullRequest, GitMerge, FileText, AlertTriangle, CheckCircle2,
  GitCompare, ArrowRight, CornerDownRight, ShieldAlert, Zap,
  XCircle, ChevronRight, ChevronDown, Check, RefreshCcw, ExternalLink,
  Search, SlidersHorizontal, User, Send, Paperclip, Minimize2, Maximize2,
  Folder, Lock, Play, Activity, ListFilter, AlertCircle, Loader2,
  UserPlus, X, CircleDot, ThumbsUp, ThumbsDown, MessageSquare, Clock,
  CheckSquare, MinusCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  apiListRepoPRs, apiGetPRDetails, apiGetPRFiles, apiCreatePRComment, apiMergePR,
  apiGetPRChecks, apiGetPRReviewers, apiAddPRReviewer, apiRemovePRReviewer,
  apiSubmitPRReview, apiGetRepoCollaborators,
  type GithubPR, type PRDetails, type PRActivity, type PRFile,
  type PRCheckRun, type PRReviewer, type PRReview, type PRReviewersResponse,
  type RepoCollaborator,
} from "@/lib/api";

type TabType = "activity" | "diff";

interface LocalPRState {
  details: PRDetails | null;
  files: PRFile[];
  checks: PRCheckRun[];
  reviewersData: PRReviewersResponse;
  loading: boolean;
  error: string | null;
}


export default function ReviewsPage() {
  // PR List State
  const [prs, setPrs] = useState<GithubPR[]>([]);
  const [loadingPrs, setLoadingPrs] = useState(true);
  const [prListError, setPrListError] = useState<string | null>(null);

  // Active Tab/Filter Selection
  const [activeListTab, setActiveListTab] = useState<"for_me" | "created">("for_me");
  const [selectedPrNumber, setSelectedPrNumber] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("activity");

  // Selected PR Details State
  const [prState, setPrState] = useState<LocalPRState>({
    details: null,
    files: [],
    checks: [],
    reviewersData: { requested: [], reviews: [] },
    loading: false,
    error: null,
  });

  // Collaborators for reviewer picker
  const [collaborators, setCollaborators] = useState<RepoCollaborator[]>([]);
  const [showReviewerPicker, setShowReviewerPicker] = useState(false);
  const [reviewerPickerSearch, setReviewerPickerSearch] = useState("");
  const [submittingReview, setSubmittingReview] = useState<"APPROVE" | "REQUEST_CHANGES" | null>(null);

  // UI state
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [merging, setMerging] = useState(false);
  const [listExpanded, setListExpanded] = useState(true);
  const [fileFilter, setFileFilter] = useState("");
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [reviewedFiles, setReviewedFiles] = useState<Record<string, boolean>>({});

  // 1. Fetch All PRs initially
  useEffect(() => {
    async function loadPRs() {
      try {
        setLoadingPrs(true);
        const data = await apiListRepoPRs();
        setPrs(data);
        if (data.length > 0) {
          setSelectedPrNumber(data[0].number);
        }
      } catch (e: any) {
        setPrListError(e.message);
      } finally {
        setLoadingPrs(false);
      }
    }
    loadPRs();
  }, []);

  // 2. Fetch Selected PR Details/Files when selectedPrNumber changes
  useEffect(() => {
    if (selectedPrNumber === null) return;

    async function loadDetails() {
      setPrState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const [details, files, checks, reviewersData] = await Promise.all([
          apiGetPRDetails(selectedPrNumber!),
          apiGetPRFiles(selectedPrNumber!),
          apiGetPRChecks(selectedPrNumber!).catch(() => [] as PRCheckRun[]),
          apiGetPRReviewers(selectedPrNumber!).catch(() => ({ requested: [], reviews: [] } as PRReviewersResponse)),
        ]);
        setPrState({
          details,
          files,
          checks,
          reviewersData,
          loading: false,
          error: null,
        });
        setSelectedFileIdx(0);
      } catch (e: any) {
        setPrState(prev => ({ ...prev, loading: false, error: e.message }));
      }
    }

    // Also load collaborators once
    apiGetRepoCollaborators().then(setCollaborators).catch(() => {});

    loadDetails();
  }, [selectedPrNumber]);

  // Handle Comment Submission
  async function handlePostComment() {
    if (!commentText.trim() || selectedPrNumber === null || postingComment) return;
    setPostingComment(true);
    try {
      await apiCreatePRComment(selectedPrNumber, commentText);
      // Append comment locally for instant UI update
      const newComment: PRActivity = {
        type: "comment",
        author: "Vinayak Mohanty",
        body: commentText,
        createdAt: new Date().toISOString(),
      };
      setPrState(prev => {
        if (!prev.details) return prev;
        return {
          ...prev,
          details: {
            ...prev.details,
            activity: [...prev.details.activity, newComment],
          },
        };
      });
      setCommentText("");
    } catch (e: any) {
      alert("Failed to submit comment: " + e.message);
    } finally {
      setPostingComment(false);
    }
  }

  // Add a reviewer
  async function handleAddReviewer(login: string) {
    if (selectedPrNumber === null) return;
    try {
      await apiAddPRReviewer(selectedPrNumber, [login]);
      setPrState(prev => ({
        ...prev,
        reviewersData: {
          ...prev.reviewersData,
          requested: [...(prev.reviewersData.requested ?? []), { login, avatar_url: "" }],
        },
      }));
      setShowReviewerPicker(false);
    } catch { /**/ }
  }

  // Remove a reviewer
  async function handleRemoveReviewer(login: string) {
    if (selectedPrNumber === null) return;
    try {
      await apiRemovePRReviewer(selectedPrNumber, [login]);
      setPrState(prev => ({
        ...prev,
        reviewersData: {
          ...prev.reviewersData,
          requested: prev.reviewersData.requested.filter(r => r.login !== login),
        },
      }));
    } catch { /**/ }
  }

  // Submit formal review (approve / request changes)
  async function handleSubmitReview(event: "APPROVE" | "REQUEST_CHANGES") {
    if (selectedPrNumber === null || submittingReview) return;
    setSubmittingReview(event);
    try {
      await apiSubmitPRReview(selectedPrNumber, event, event === "APPROVE" ? "Approved" : "Changes requested");
      // Optimistically append to reviews list
      setPrState(prev => ({
        ...prev,
        reviewersData: {
          ...prev.reviewersData,
          reviews: [
            ...prev.reviewersData.reviews,
            { login: "me", avatar_url: "", state: event === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED", submittedAt: new Date().toISOString() },
          ],
        },
      }));
    } catch { /**/ } finally {
      setSubmittingReview(null);
    }
  }

  // Handle Squash & Merge
  async function handleSquashAndMerge() {
    if (selectedPrNumber === null || merging) return;
    if (!confirm("Are you sure you want to squash and merge this Pull Request?")) return;

    setMerging(true);
    try {
      await apiMergePR(selectedPrNumber);
      // Update local PR status
      setPrState(prev => {
        if (!prev.details) return prev;
        return {
          ...prev,
          details: {
            ...prev.details,
            status: "merged",
          },
        };
      });
      setPrs(prev => prev.map(p => p.number === selectedPrNumber ? { ...p, status: "merged" } : p));
      alert("Pull Request successfully merged!");
    } catch (e: any) {
      alert("Failed to merge: " + e.message);
    } finally {
      setMerging(false);
    }
  }

  // Parse git patch into lines
  const parsedDiffLines = useMemo(() => {
    const activeFile = prState.files[selectedFileIdx];
    if (!activeFile || !activeFile.patch) return [];

    const rawLines = activeFile.patch.split("\n");
    let oldLineNum = 0;
    let newLineNum = 0;

    return rawLines.map((line, index) => {
      // Parse hunk headers, e.g., @@ -941,6 +941,10 @@
      if (line.startsWith("@@")) {
        const match = line.match(/@@\s+-(\d+),?\d*\s+\+(\d+),?\d*\s+@@/);
        if (match) {
          oldLineNum = parseInt(match[1], 10) - 1;
          newLineNum = parseInt(match[2], 10) - 1;
        }
        return { type: "header", content: line, oldNum: "", newNum: "" };
      }

      if (line.startsWith("+")) {
        newLineNum++;
        return {
          type: "add",
          content: line.slice(1),
          oldNum: "",
          newNum: newLineNum,
        };
      }

      if (line.startsWith("-")) {
        oldLineNum++;
        return {
          type: "del",
          content: line.slice(1),
          oldNum: oldLineNum,
          newNum: "",
        };
      }

      // Context line
      oldLineNum++;
      newLineNum++;
      return {
        type: "normal",
        content: line.startsWith(" ") ? line.slice(1) : line,
        oldNum: oldLineNum,
        newNum: newLineNum,
      };
    });
  }, [prState.files, selectedFileIdx]);

  // Filtered Changed Files
  const filteredFiles = useMemo(() => {
    return prState.files.filter(f =>
      f.filename.toLowerCase().includes(fileFilter.toLowerCase())
    );
  }, [prState.files, fileFilter]);

  const activePR = prState.details;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-[#0a0a0b] text-zinc-100 overflow-hidden font-sans">
      
      {/* ── LEFT PANEL: PR List ── */}
      <div className="w-[300px] border-r border-zinc-900 bg-zinc-950/20 flex flex-col flex-shrink-0">
        {/* Header & Controls */}
        <div className="p-4 border-b border-zinc-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-150">Reviews</span>
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-550 hover:text-zinc-350 cursor-pointer" />
              <ListFilter className="w-3.5 h-3.5 text-zinc-550 hover:text-zinc-350 cursor-pointer" />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveListTab("for_me")}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border",
                activeListTab === "for_me"
                  ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                  : "bg-transparent border-zinc-905 text-zinc-500 hover:text-zinc-300"
              )}
            >
              For me
            </button>
            <button
              onClick={() => setActiveListTab("created")}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border",
                activeListTab === "created"
                  ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                  : "bg-transparent border-zinc-905 text-zinc-500 hover:text-zinc-300"
              )}
            >
              Created
            </button>
          </div>
        </div>

        {/* Collapsible Section Container */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div
            onClick={() => setListExpanded(!listExpanded)}
            className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-900/40 rounded-lg cursor-pointer group transition-colors select-none"
          >
            <div className="flex items-center gap-1.5">
              {listExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
              )}
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Ready to merge</span>
              <span className="text-[10px] text-zinc-650 font-semibold font-mono bg-zinc-950 border border-zinc-900 px-1.5 py-0.2 rounded-full">
                {prs.length}
              </span>
            </div>
          </div>

          {/* PR Items */}
          {listExpanded && (
            <div className="space-y-0.5">
              {loadingPrs && (
                <div className="py-8 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
                </div>
              )}
              {!loadingPrs && prs.length === 0 && (
                <div className="text-[11px] text-zinc-600 text-center py-8">No open pull requests</div>
              )}
              {!loadingPrs && prs.map((pr) => {
                const isActive = pr.number === selectedPrNumber;
                const initials = pr.author.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={pr.id}
                    onClick={() => setSelectedPrNumber(pr.number)}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-2.5 text-left relative overflow-hidden group",
                      isActive
                        ? "bg-zinc-900/60 border-zinc-800"
                        : "bg-transparent border-transparent hover:bg-zinc-900/20"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <GitPullRequest className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-zinc-250 group-hover:text-zinc-100 leading-snug line-clamp-2 transition-colors">
                          {pr.title}
                        </h4>
                        <div className="flex items-center justify-between mt-2.5 text-[10px] text-zinc-500">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="capitalize">{pr.status === "clean" || pr.status === "Ready to merge" ? "Ready to merge" : pr.status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-red-600/90 border border-red-500/10 flex items-center justify-center text-[8px] font-bold text-white">
                              {initials}
                            </div>
                            <span className="font-mono text-[9px] text-zinc-600">13h</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MIDDLE DETAIL PANE ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950/40">
        {activePR ? (
          <>
            {/* PR Top Header Strip */}
            <div className="h-12 border-b border-zinc-900 px-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 text-xs text-zinc-400 truncate pr-3">
                <span className="text-zinc-650">No Issue</span>
                <span className="text-zinc-700">›</span>
                <GitPullRequest className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold text-zinc-350 truncate">{activePR.title}</span>
                <span className="text-emerald-555 font-semibold">+{activePR.additions}</span>
                <span className="text-red-555 font-semibold">-{activePR.deletions}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 rounded-lg border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-lg border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <GitCompare className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-lg border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <Button
                  onClick={handleSquashAndMerge}
                  disabled={merging || activePR.status === "merged"}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white font-bold text-xs h-7 px-3 rounded-md transition-colors"
                >
                  {merging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : activePR.status === "merged" ? "Merged" : "Squash & merge"}
                </Button>
              </div>
            </div>

            {/* Sub-Header Tabs */}
            <div className="h-10 border-b border-zinc-900 px-4 flex items-center gap-4 flex-shrink-0">
              <button
                onClick={() => setActiveTab("activity")}
                className={cn(
                  "h-full text-xs font-semibold transition-all relative px-1",
                  activeTab === "activity" ? "text-zinc-150" : "text-zinc-500 hover:text-zinc-350"
                )}
              >
                Activity
                {activeTab === "activity" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-zinc-200" />}
              </button>
              <button
                onClick={() => setActiveTab("diff")}
                className={cn(
                  "h-full text-xs font-semibold transition-all relative px-1",
                  activeTab === "diff" ? "text-zinc-150" : "text-zinc-500 hover:text-zinc-350"
                )}
              >
                Diff
                {activeTab === "diff" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-zinc-200" />}
              </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
              {prState.loading && (
                <div className="absolute inset-0 bg-[#0a0a0b]/80 backdrop-blur-sm z-50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                </div>
              )}

              {/* ── TAB 1: Activity ── */}
              {activeTab === "activity" && (
                <div className="h-full flex flex-col overflow-y-auto p-6 space-y-6">
                  {/* PR Title & Metadata */}
                  <div className="space-y-3">
                    <h2 className="text-xl font-bold text-zinc-100 tracking-tight leading-tight">
                      {activePR.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <div className="w-5 h-5 rounded-full bg-red-600/90 border border-red-500/10 flex items-center justify-center text-[9px] font-bold text-white">
                        {activePR.author.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-zinc-300">{activePR.author}</span>
                      <span>·</span>
                      <span className="font-mono text-zinc-500">{activePR.repository}#{activePR.number}</span>
                      <span>·</span>
                      <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px] text-zinc-400">{activePR.targetBranch}</span>
                      <span className="text-zinc-600">←</span>
                      <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px] text-zinc-400">{activePR.branch}</span>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Description</span>
                    <p className="text-xs text-zinc-400 bg-zinc-950/20 border border-zinc-900 rounded-lg p-3 leading-relaxed">
                      This pull request standardizes the UI layouts and switches default system badges to a cohesive zinc-based dark theme palette. Key improvements are implemented in backlog page logic and PR checks.
                    </p>
                  </div>

                  {/* Activity List */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Activity</span>
                    <div className="relative border-l border-zinc-900 pl-4 ml-2.5 space-y-5">
                      {activePR.activity.map((act, idx) => {
                        const initials = act.author.slice(0, 2).toUpperCase();
                        const isTimeline = act.type === "opened" || act.type === "commit";

                        if (isTimeline) {
                          return (
                            <div key={idx} className="relative flex items-center gap-3">
                              {/* Left dot icon */}
                              <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-zinc-950 border-2 border-emerald-500 flex items-center justify-center" />
                              <GitPullRequest className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <span className="text-xs text-zinc-400">
                                {act.body}
                              </span>
                            </div>
                          );
                        }

                        // Comment view block
                        return (
                          <div key={idx} className="relative flex items-start gap-3 bg-zinc-950/30 border border-zinc-900 rounded-xl p-3.5">
                            {/* Avatar */}
                            <div className="w-5 h-5 rounded-full bg-red-600/90 border border-red-500/10 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5">
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-300">{act.author}</span>
                                <span className="text-[9px] text-zinc-600 font-mono">
                                  {new Date(act.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed font-sans">{act.body}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comment box editor */}
                  <div className="pt-4 border-t border-zinc-900/60 flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-600/90 border border-red-500/10 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-2">
                      VM
                    </div>
                    <div className="flex-1 bg-zinc-950/40 border border-zinc-900 rounded-xl px-3 py-2 flex items-center gap-2 focus-within:border-zinc-800 transition-colors">
                      <input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                        placeholder="Leave a comment..."
                        className="flex-1 bg-transparent border-none focus:outline-none text-xs text-zinc-200 placeholder:text-zinc-650"
                      />
                      <button className="text-zinc-600 hover:text-zinc-400 p-1 rounded transition-colors">
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handlePostComment}
                        disabled={!commentText.trim() || postingComment}
                        className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-lg bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 transition-colors disabled:opacity-20"
                      >
                        <Send className="w-3 h-3 text-zinc-300" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: Diff ── */}
              {activeTab === "diff" && (
                <div className="h-full flex overflow-hidden">
                  {/* Diff File List Left Sidebar */}
                  <div className="w-[200px] border-r border-zinc-900 bg-zinc-950/20 flex flex-col flex-shrink-0">
                    <div className="p-3 border-b border-zinc-900 flex items-center gap-1.5 bg-zinc-950/40">
                      <Search className="w-3 h-3 text-zinc-650" />
                      <input
                        value={fileFilter}
                        onChange={(e) => setFileFilter(e.target.value)}
                        placeholder="Filter files..."
                        className="bg-transparent border-none focus:outline-none text-[10px] text-zinc-200 placeholder:text-zinc-700 w-full"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                      {filteredFiles.map((file, idx) => {
                        const isSelected = prState.files[selectedFileIdx]?.filename === file.filename;
                        const filename = file.filename.split("/").pop();
                        const dir = file.filename.split("/").slice(0, -1).join("/") || "./";

                        return (
                          <div
                            key={file.filename}
                            onClick={() => {
                              // Find index of this file in the original array
                              const origIdx = prState.files.findIndex(f => f.filename === file.filename);
                              if (origIdx !== -1) setSelectedFileIdx(origIdx);
                            }}
                            className={cn(
                              "p-2 rounded-lg text-left cursor-pointer transition-colors group flex items-start gap-2",
                              isSelected ? "bg-zinc-900/60" : "hover:bg-zinc-900/20"
                            )}
                          >
                            <FileText className="w-3.5 h-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold text-zinc-250 truncate group-hover:text-zinc-100">
                                {filename}
                              </p>
                              <p className="text-[9px] text-zinc-600 truncate mt-0.5">{dir}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Diff Line Viewer Right Side */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-[#070708]">
                    {prState.files[selectedFileIdx] ? (
                      <>
                        {/* Diff File Header bar */}
                        <div className="h-9 px-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/20 flex-shrink-0">
                          <span className="text-[10px] font-mono text-zinc-450">{prState.files[selectedFileIdx].filename}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-500 font-bold">+{prState.files[selectedFileIdx].additions}</span>
                            <span className="text-[10px] text-zinc-600">|</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                id={`reviewed-${selectedFileIdx}`}
                                checked={!!reviewedFiles[prState.files[selectedFileIdx].filename]}
                                onChange={(e) => {
                                  setReviewedFiles(prev => ({
                                    ...prev,
                                    [prState.files[selectedFileIdx].filename]: e.target.checked
                                  }));
                                }}
                                className="w-3 h-3 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-0"
                              />
                              <label htmlFor={`reviewed-${selectedFileIdx}`} className="text-[10px] text-zinc-500 font-semibold cursor-pointer select-none">
                                Reviewed
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Diff Lines Container */}
                        <div className="flex-1 overflow-y-auto font-mono text-[11px] py-2">
                          {parsedDiffLines.map((line, idx) => {
                            const isHeader = line.type === "header";
                            const isAdd = line.type === "add";
                            const isDel = line.type === "del";

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "flex items-stretch min-w-full px-2 py-0.2 group border-l-2 border-transparent",
                                  isHeader && "bg-zinc-950/40 text-zinc-600 border-l-zinc-700/30",
                                  isAdd && "bg-emerald-950/10 text-emerald-400 border-l-emerald-500",
                                  isDel && "bg-red-950/10 text-red-400 border-l-red-500"
                                )}
                              >
                                {/* Left Line Numbers column */}
                                <div className="w-8 select-none text-right pr-2 text-[9px] text-zinc-700 flex items-center justify-end">
                                  {line.oldNum}
                                </div>
                                <div className="w-8 select-none text-right pr-3 border-r border-zinc-900 text-[9px] text-zinc-700 flex items-center justify-end">
                                  {line.newNum}
                                </div>

                                {/* Code content line */}
                                <pre className={cn(
                                  "pl-4 py-0.5 leading-relaxed text-zinc-400 whitespace-pre-wrap flex-1",
                                  isHeader && "text-zinc-600 font-bold",
                                  isAdd && "text-emerald-450",
                                  isDel && "text-red-450"
                                )}>
                                  {isAdd ? `+ ${line.content}` : isDel ? `- ${line.content}` : `  ${line.content}`}
                                </pre>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-zinc-600">
                        No file selected or matched
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-zinc-500">
            No PR selected. Ensure a repository with open PRs is connected to your project.
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Dynamic PR Details ── */}
      {activePR && (
        <div className="w-[252px] border-l border-zinc-900 bg-zinc-950/20 flex flex-col overflow-y-auto p-4 space-y-5 flex-shrink-0">

          {/* Status — live */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Status</span>
            <div className="bg-[#111113] border border-zinc-900 rounded-lg p-3 flex items-center gap-2.5">
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0 animate-pulse",
                activePR.status === "merged" ? "bg-purple-500" : "bg-emerald-500")} />
              <div>
                <span className="text-xs font-semibold text-zinc-200 block capitalize">
                  {activePR.status === "clean" || activePR.status === "Ready to merge" ? "Open" : activePR.status}
                </span>
                <span className="text-[9px] text-zinc-550">
                  {activePR.status === "merged" ? "Merged into " : "Ready to merge into "}{activePR.targetBranch}
                </span>
              </div>
            </div>
          </div>

          {/* Reviewers — bidirectional */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Reviewers</span>
              <button onClick={() => setShowReviewerPicker(v => !v)}
                className="flex items-center gap-1 text-zinc-600 hover:text-zinc-300 transition-colors">
                <UserPlus className="w-3 h-3" /> Add
              </button>
            </div>

            {showReviewerPicker && (
              <div className="absolute right-0 z-50 w-full bg-[#18181b] border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
                <div className="p-2 border-b border-zinc-900 flex items-center gap-1.5">
                  <Search className="w-3 h-3 text-zinc-600" />
                  <input autoFocus value={reviewerPickerSearch} onChange={e => setReviewerPickerSearch(e.target.value)}
                    placeholder="Search collaborators..."
                    className="bg-transparent text-[11px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none w-full" />
                  <button onClick={() => setShowReviewerPicker(false)}><X className="w-3 h-3 text-zinc-600 hover:text-zinc-300" /></button>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-zinc-900">
                  {(collaborators.length > 0 ? collaborators : [{ login: "Vinayak9769", avatar_url: "" }])
                    .filter(c => c.login.toLowerCase().includes(reviewerPickerSearch.toLowerCase()))
                    .map(c => {
                      const already = prState.reviewersData.requested?.some(r => r.login === c.login);
                      return (
                        <button key={c.login} disabled={already} onClick={() => handleAddReviewer(c.login)}
                          className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-zinc-900/60 transition-colors disabled:opacity-40 text-left">
                          <div className="w-5 h-5 rounded-full bg-indigo-700/80 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                            {c.login.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[11px] text-zinc-300 truncate">{c.login}</span>
                          {already && <Check className="w-3 h-3 text-emerald-500 ml-auto flex-shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {(!prState.reviewersData.requested || prState.reviewersData.requested.length === 0) &&
             (!prState.reviewersData.reviews || prState.reviewersData.reviews.length === 0) ? (
              <div className="bg-[#111113] border border-dashed border-zinc-800 rounded-lg py-4 flex items-center justify-center">
                <span className="text-[10px] text-zinc-600">No reviewers yet</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {prState.reviewersData.requested?.map(r => (
                  <div key={r.login} className="flex items-center justify-between bg-[#111113] border border-zinc-900 rounded-lg px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-700/80 flex items-center justify-center text-[9px] font-bold text-white">
                        {r.login.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[11px] text-zinc-300 font-semibold truncate max-w-[110px]">{r.login}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-zinc-600" />
                      <button onClick={() => handleRemoveReviewer(r.login)} className="text-zinc-700 hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {prState.reviewersData.reviews?.map((rv, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#111113] border border-zinc-900 rounded-lg px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white",
                        rv.state === "APPROVED" ? "bg-emerald-700/80" : rv.state === "CHANGES_REQUESTED" ? "bg-red-700/80" : "bg-zinc-700/80")}>
                        {rv.login.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[11px] text-zinc-300 font-semibold truncate max-w-[100px]">{rv.login}</span>
                    </div>
                    {rv.state === "APPROVED" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    {rv.state === "CHANGES_REQUESTED" && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                    {rv.state === "COMMENTED" && <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-1.5 pt-1">
              <button onClick={() => handleSubmitReview("APPROVE")} disabled={!!submittingReview}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-emerald-800/40 bg-emerald-950/20 text-[10px] font-bold text-emerald-400 hover:bg-emerald-950/40 transition-colors disabled:opacity-40">
                {submittingReview === "APPROVE" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                Approve
              </button>
              <button onClick={() => handleSubmitReview("REQUEST_CHANGES")} disabled={!!submittingReview}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-red-800/40 bg-red-950/20 text-[10px] font-bold text-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-40">
                {submittingReview === "REQUEST_CHANGES" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
                Request
              </button>
            </div>
          </div>

          {/* Checks — live from GitHub */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Checks</span>
            {prState.checks.length === 0 ? (
              <div className="bg-[#111113] border border-zinc-900 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-zinc-350">All checks passed</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {prState.checks.map((check, i) => {
                  const ok = check.conclusion === "success";
                  const fail = check.conclusion === "failure";
                  const pending = check.status !== "completed";
                  return (
                    <div key={i} className={cn("flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px]",
                      ok ? "border-emerald-900/40 bg-emerald-950/10" : fail ? "border-red-900/40 bg-red-950/10" : "border-zinc-900 bg-zinc-950/20")}>
                      {pending ? <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />
                        : ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        : fail ? <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        : <MinusCircle className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />}
                      <span className={cn("font-semibold truncate flex-1",
                        ok ? "text-emerald-300" : fail ? "text-red-300" : "text-zinc-400")}>
                        {check.name}
                      </span>
                      {check.url && (
                        <a href={check.url} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-zinc-300">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Connect Issue */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Issues</span>
              <span className="text-zinc-600 hover:text-zinc-400 cursor-pointer">+ Connect</span>
            </div>
            <div className="bg-[#111113] border border-dashed border-zinc-800 rounded-lg py-4 flex items-center justify-center">
              <span className="text-[10px] text-zinc-650">No issue linked</span>
            </div>
          </div>

          {/* Changed Files */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
              {prState.files.length} files changed
            </span>
            <div className="space-y-0.5">
              {prState.files.slice(0, 6).map(file => {
                const filename = file.filename.split("/").pop();
                const dir = file.filename.split("/").slice(0, -1).join("/") || "./";
                return (
                  <div key={file.filename} className="flex items-center justify-between text-[10px] hover:bg-zinc-900/30 p-1.5 rounded transition-colors">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="text-zinc-350 font-semibold truncate block">{filename}</span>
                      <span className="text-zinc-600 truncate block">{dir}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono flex-shrink-0">
                      {file.additions > 0 && <span className="text-emerald-500">+{file.additions}</span>}
                      {file.deletions > 0 && <span className="text-red-500">-{file.deletions}</span>}
                    </div>
                  </div>
                );
              })}
              {prState.files.length > 6 && (
                <div className="text-[9px] text-zinc-600 text-center pt-1.5 border-t border-zinc-900/40">
                  {prState.files.length - 6} more files
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
