"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Layers, Users, FolderGit2, ArrowRight, Loader2,
  AlertCircle, X, Check
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiListWorkspaces, apiCreateWorkspace, type Workspace } from "@/lib/api";

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    apiListWorkspaces()
      .then(setWorkspaces)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const ws = await apiCreateWorkspace(newName.trim());
      setWorkspaces(prev => [ws, ...prev]);
      setNewName("");
      setShowCreate(false);
      router.push(`/workspaces/${ws.id}`);
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6 min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center">
            <Layers className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">Workspaces</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">Collaborate with your team on architecture designs</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> New Workspace
        </Button>
      </div>

      {/* Create Workspace Form */}
      {showCreate && (
        <Card className="bg-[#111113] border-zinc-800/60 p-5">
          <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-3">Create Workspace</h2>
          <form onSubmit={handleCreate} className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Acme Engineering"
              className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-600/60 placeholder:text-zinc-700"
            />
            <Button type="submit" size="sm" disabled={creating || !newName.trim()}
              className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold gap-1">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Create
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreate(false)}
              className="text-zinc-500 hover:text-zinc-300">
              <X className="w-3.5 h-3.5" />
            </Button>
          </form>
          {createError && (
            <p className="text-[10px] text-red-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {createError}
            </p>
          )}
        </Card>
      )}

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 text-zinc-400 animate-spin" />
        </div>
      )}
      {error && (
        <Card className="bg-red-500/5 border-red-500/20 p-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-xs text-red-400">{error}</p>
        </Card>
      )}

      {/* Empty */}
      {!loading && !error && workspaces.length === 0 && !showCreate && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center mb-5">
            <Layers className="w-8 h-8 text-zinc-400 opacity-60" />
          </div>
          <h2 className="text-base font-bold text-zinc-300 mb-2">No workspaces yet</h2>
          <p className="text-xs text-zinc-600 max-w-sm mb-6">
            Create a workspace to collaborate with your team on architecture designs and implementation backlogs.
          </p>
          <Button size="sm" onClick={() => setShowCreate(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Create Your First Workspace
          </Button>
        </div>
      )}

      {/* Workspace Grid */}
      {!loading && workspaces.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/workspaces/${ws.id}`}>
              <Card className="bg-[#111113] border-zinc-800/60 hover:border-zinc-700/50 transition-all p-5 cursor-pointer group h-full">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-800/40 transition-colors">
                      <Layers className="w-4.5 h-4.5 text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100">{ws.name}</h3>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        {new Date(ws.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
