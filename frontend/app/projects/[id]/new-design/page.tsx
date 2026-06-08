"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft, ArrowRight, Sparkles, Loader2, AlertCircle, FileText, FolderGit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiGetProject, apiCreateDesign, type Project } from "@/lib/api";

export default function NewDesignPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [prd, setPrd] = useState("");
  const [provider, setProvider] = useState("gemini");
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    apiGetProject(projectId)
      .then(setProject)
      .catch(e => setError(e.message))
      .finally(() => setLoadingProject(false));
  }, [projectId]);

  const handleStart = async () => {
    if (!projectId) return;
    setLoadingSubmit(true);
    setError(null);
    try {
      const design = await apiCreateDesign(projectId, prd.trim(), provider);
      router.push(`/projects/${projectId}/design/${design.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoadingSubmit(false);
    }
  };

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-[#0a0a0b]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="bg-red-500/5 border-red-500/20 p-5 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/projects/${projectId}`)}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Project
        </button>
        <h1 className="text-xl font-semibold text-zinc-100 mt-3">Start New Design Run</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Project: <span className="text-zinc-350 font-medium">{project?.name}</span>
        </p>
      </div>

      <Card className="bg-[#111113] border-zinc-800/60 p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Product Requirements Document</h2>
              <p className="text-xs text-zinc-500">Provide the requirements for this new design run</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">AI Provider</label>
              <div className="flex gap-2">
                {["gemini", "openai"].map(p => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      provider === p
                        ? "bg-indigo-600/15 border-indigo-500/60 text-indigo-300"
                        : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    {p === "gemini" ? "Gemini" : "OpenAI"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">PRD / Requirements</label>
              <Textarea
                id="prd-input"
                value={prd}
                onChange={e => setPrd(e.target.value)}
                placeholder="Describe your product requirements, target scale, and constraints..."
                className="h-52 bg-zinc-950/60 border-zinc-800 focus:border-indigo-500/50 text-sm text-zinc-300 leading-relaxed resize-none"
              />
            </div>

            {/* What happens next */}
            <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg p-4">
              <p className="text-xs font-semibold text-zinc-400 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Workflow Pipeline
              </p>
              <div className="space-y-1.5">
                {[
                  "AI validates PRD & initiates clarification checks",
                  "Builds Conceptual Project Model",
                  "Compiles system architecture designs",
                  "Generates database schemas & indexes",
                  "Generates REST/OpenAPI endpoint routes",
                  "Bundles and exports reports",
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-8 pt-5 border-t border-zinc-800/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/projects/${projectId}`)}
              disabled={loadingSubmit}
              className="h-8 text-xs text-zinc-400 gap-1"
            >
              Cancel
            </Button>
            <Button
              id="start-design-btn"
              size="sm"
              onClick={handleStart}
              disabled={!prd.trim() || loadingSubmit}
              className="h-9 px-5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 font-semibold disabled:opacity-40"
            >
              {loadingSubmit ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting run...</>
              ) : (
                <>Start Run <ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
