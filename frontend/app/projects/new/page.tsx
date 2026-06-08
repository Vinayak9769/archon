"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, FolderGit2, FileText,
  ArrowRight, Sparkles, Loader2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiCreateProject, apiCreateDesign } from "@/lib/api";

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [prd, setPrd] = useState("");
  const [provider, setProvider] = useState("gemini");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goNext = () => { setError(null); setStep(s => Math.min(s + 1, 2)); };
  const goPrev = () => { setError(null); setStep(s => Math.max(s - 1, 1)); };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Create project
      const project = await apiCreateProject(name.trim());

      // 2. Start design workflow
      const design = await apiCreateDesign(project.id, prd.trim(), provider);

      // 3. Navigate to design workflow page
      router.push(`/projects/${project.id}/design/${design.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-100">New Project</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Set up your project and upload a PRD to start the design workflow.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[{ n: 1, label: "Project Details" }, { n: 2, label: "Upload PRD" }].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                n < step ? "bg-indigo-600 text-white" : n === step ? "bg-indigo-600 text-white ring-2 ring-indigo-500/30" : "bg-zinc-800 text-zinc-500"
              }`}>{n}</div>
              <span className={`text-xs font-medium ${n === step ? "text-zinc-200" : "text-zinc-500"}`}>{label}</span>
            </div>
            {i < 1 && <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />}
          </div>
        ))}
      </div>

      <Card className="bg-[#111113] border-zinc-800/60 p-6 rounded-xl">
        {/* ── Step 1 ── */}
        {step === 1 && (
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <FolderGit2 className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Project Details</h2>
                <p className="text-xs text-zinc-500">Name your project</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Project Name</label>
                <Input
                  id="project-name-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Payments Service"
                  className="h-10 bg-zinc-950/60 border-zinc-800 focus:border-indigo-500/50 text-sm"
                />
              </div>
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
            </div>

            <div className="flex justify-end mt-8 pt-5 border-t border-zinc-800/60">
              <Button
                size="sm"
                onClick={goNext}
                disabled={!name.trim()}
                className="h-9 px-5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 font-semibold disabled:opacity-40"
              >
                Continue <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Product Requirements Document</h2>
                <p className="text-xs text-zinc-500">Paste your PRD — the AI will analyze and design the system</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">PRD / Requirements</label>
                <Textarea
                  id="prd-input"
                  value={prd}
                  onChange={e => setPrd(e.target.value)}
                  placeholder={`Describe your product, its features, scale requirements, integrations, and any business constraints...\n\nExample: Build a ride-sharing platform similar to Uber. The system must handle 10M DAU, process real-time driver matching with <200ms latency, support payments via Stripe, and maintain 99.99% uptime.`}
                  className="h-52 bg-zinc-950/60 border-zinc-800 focus:border-indigo-500/50 text-sm text-zinc-300 leading-relaxed resize-none"
                />
                <p className="text-[10px] text-zinc-600 mt-1.5">
                  The AI will generate clarifying questions if the PRD lacks detail.
                </p>
              </div>

              {/* What happens next */}
              <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg p-4">
                <p className="text-xs font-semibold text-zinc-400 mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  What happens next
                </p>
                <div className="space-y-1.5">
                  {[
                    "AI analyzes your PRD and asks clarifying questions",
                    "Generates a Conceptual Project Model (CPM)",
                    "Designs the system architecture",
                    "Creates database schema",
                    "Generates API specification",
                    "Exports full design report",
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
              <Button variant="ghost" size="sm" onClick={goPrev} disabled={loading} className="h-8 text-xs text-zinc-400 gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button
                id="start-design-btn"
                size="sm"
                onClick={handleCreate}
                disabled={!prd.trim() || loading}
                className="h-9 px-5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 font-semibold disabled:opacity-40"
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting workflow...</>
                ) : (
                  <>Start Design Workflow <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
