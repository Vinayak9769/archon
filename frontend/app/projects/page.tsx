"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderGit2, ArrowUpRight, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { apiListProjects, type Project } from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiListProjects()
      .then(setProjects)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Projects</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Manage your system design projects</p>
        </div>
        <Link
          id="new-project-btn"
          href="/projects/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          New Project
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="bg-red-500/5 border-red-500/20 p-5 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && projects.length === 0 && (
        <Card className="bg-[#111113] border-zinc-800/60 border-dashed p-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center mb-4">
            <FolderGit2 className="w-6 h-6 text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">No projects yet</p>
          <p className="text-xs text-zinc-600 mb-5">Create your first project to start designing</p>
          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New Project
          </Link>
        </Card>
      )}

      {/* Project grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link key={project.id} href={`/projects/${project.id}`} className="group block">
              <Card className="bg-[#111113] border-zinc-800/60 hover:border-zinc-700/60 p-5 transition-all hover:shadow-lg hover:shadow-black/40 h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <FolderGit2 className="w-4 h-4 text-indigo-400" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 mb-1">{project.name}</h3>
                <p className="text-[10px] text-zinc-600 font-mono">{project.id}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-[10px] text-zinc-600">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/projects/${project.id}/new-design`}
                    onClick={e => e.stopPropagation()}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> New Design
                  </Link>
                </div>
              </Card>
            </Link>
          ))}

          {/* New Project card */}
          <Link href="/projects/new" className="group block">
            <Card className="bg-[#111113] border-zinc-800/60 border-dashed hover:border-indigo-500/40 hover:bg-indigo-500/5 p-5 transition-all h-full flex flex-col items-center justify-center gap-3 min-h-[160px]">
              <div className="w-10 h-10 rounded-full border border-dashed border-zinc-700 group-hover:border-indigo-500/40 flex items-center justify-center transition-all">
                <Plus className="w-5 h-5 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">New Project</p>
                <p className="text-xs text-zinc-600 mt-0.5">Start a system design</p>
              </div>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
