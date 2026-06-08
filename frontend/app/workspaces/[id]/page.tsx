"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, FolderGit2, Plus, Loader2, AlertCircle,
  X, Check, UserMinus, Crown, ChevronRight, Layers
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  apiGetWorkspace, apiListWorkspaceMembers, apiListWorkspaceProjects,
  apiAddWorkspaceMember, apiRemoveWorkspaceMember,
  type Workspace, type WorkspaceMember, type Project
} from "@/lib/api";
import { getToken } from "@/lib/api";

// Decode JWT payload to get current user id
function getCurrentUserId(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || payload.user_id || null;
  } catch { return null; }
}

export default function WorkspaceDetailPage() {
  const params = useParams<{ id: string }>();
  const wsId = params.id;
  const currentUserId = getCurrentUserId();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Member invite
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const isOwner = useMemo(
    () => workspace?.owner_id === currentUserId,
    [workspace, currentUserId]
  );

  useEffect(() => {
    if (!wsId) return;
    Promise.all([
      apiGetWorkspace(wsId),
      apiListWorkspaceMembers(wsId),
      apiListWorkspaceProjects(wsId),
    ])
      .then(([ws, mem, proj]) => {
        setWorkspace(ws);
        setMembers(mem || []);
        setProjects(proj || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [wsId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    try {
      const member = await apiAddWorkspaceMember(wsId, inviteEmail.trim());
      setMembers(prev => [...prev, member]);
      setInviteEmail("");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (e: any) {
      setInviteError(e.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      await apiRemoveWorkspaceMember(wsId, userId);
      setMembers(prev => prev.filter(m => m.user_id !== userId));
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0b]">
      <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
    </div>
  );

  if (error || !workspace) return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="bg-red-500/5 border-red-500/20 p-5 flex items-center gap-3">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <p className="text-xs text-red-400">{error || "Workspace not found"}</p>
      </Card>
    </div>
  );

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-6 min-h-screen bg-[#0a0a0b]">
      {/* Nav */}
      <Link href="/workspaces" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-350 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> All Workspaces
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center">
            <Layers className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">{workspace.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className="bg-zinc-900 text-zinc-500 border-zinc-800 text-[9px]">{members.length} members</Badge>
              <Badge className="bg-zinc-900 text-zinc-500 border-zinc-800 text-[9px]">{projects.length} projects</Badge>
              {isOwner && <Badge className="bg-zinc-900/40 text-zinc-400 border-zinc-800/40 text-[9px]">Owner</Badge>}
            </div>
          </div>
        </div>
        {isOwner && (
          <Link href={`/projects/new?workspace=${wsId}`}>
            <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Project
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Members Panel ── */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Members
          </h2>

          {/* Invite form (owner only) */}
          {isOwner && (
            <Card className="bg-[#111113] border-zinc-800/60 p-4 space-y-3">
              <p className="text-[10px] text-zinc-500">Invite by email</p>
              <form onSubmit={handleInvite} className="space-y-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-600/60 placeholder:text-zinc-700"
                />
                <Button type="submit" size="sm" disabled={inviting || !inviteEmail.trim()}
                  className="w-full bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-200 border border-zinc-700/60 text-xs font-bold gap-1" variant="outline">
                  {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Invite Member
                </Button>
              </form>
              {inviteError && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{inviteError}</p>}
              {inviteSuccess && <p className="text-[10px] text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" />Member added!</p>}
            </Card>
          )}

          {/* Member list */}
          <div className="space-y-1.5">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#111113] border border-zinc-800/60">
                <div className="w-7 h-7 rounded-full bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-zinc-400">{m.email[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-zinc-300 truncate">{m.email}</p>
                  <div className="flex items-center gap-1">
                    {m.role === "owner" && <Crown className="w-2.5 h-2.5 text-amber-400" />}
                    <span className="text-[9px] text-zinc-600 capitalize">{m.role}</span>
                  </div>
                </div>
                {isOwner && m.user_id !== currentUserId && (
                  <button
                    onClick={() => handleRemoveMember(m.user_id)}
                    className="text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Remove member"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Projects Panel ── */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <FolderGit2 className="w-3.5 h-3.5" /> Projects
          </h2>

          {projects.length === 0 ? (
            <Card className="bg-[#111113] border-zinc-800/60 border-dashed p-12 flex flex-col items-center text-center">
              <FolderGit2 className="w-8 h-8 text-zinc-700 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-500 mb-1">No projects yet</h3>
              <p className="text-xs text-zinc-700 mb-4">Create a project to start generating architecture designs.</p>
              {isOwner && (
                <Link href={`/projects/new?workspace=${wsId}`}>
                  <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> New Project
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="bg-[#111113] border-zinc-800/60 hover:border-zinc-700/60 transition-all p-4 flex items-center gap-3 cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center flex-shrink-0">
                      <FolderGit2 className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-200">{p.name}</p>
                      <p className="text-[10px] text-zinc-600 font-mono truncate">{p.repo_url}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
