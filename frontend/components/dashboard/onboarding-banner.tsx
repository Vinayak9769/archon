"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ChevronRight, CheckCircle2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function OnboardingBanner() {
  const [mounted, setMounted] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    setMounted(true);
    const onboarded = localStorage.getItem("archon_onboarded") === "true";
    setIsOnboarded(onboarded);
    if (onboarded) {
      setWorkspaceName(localStorage.getItem("archon_workspace_name") || "My Workspace");
    }
  }, []);

  if (!mounted) return null;

  if (!isOnboarded) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-zinc-950 border-indigo-500/30 p-5 shadow-xl shadow-indigo-950/20 group hover:border-indigo-500/40 transition-all rounded-xl">
        <div className="absolute top-[-100%] right-[-20%] w-[40%] h-[200%] rounded-full bg-indigo-500/8 blur-[80px] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold gap-1">
                <Sparkles className="w-3 h-3" /> GET STARTED
              </Badge>
            </div>
            <h2 className="text-base font-bold text-white">Welcome to Archon</h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">
              Create your first project and upload a PRD. Archon will generate a complete system architecture, database schema, and API specification — with you in the loop at every step.
            </p>
          </div>
          <Link href="/onboarding">
            <button className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md gap-1.5 flex items-center cursor-pointer">
              Set Up Workspace <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-[#111113]/85 border-zinc-800/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-200">{workspaceName}</h2>
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0">Active</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">Workspace initialized · Ready to design</p>
        </div>
      </div>
      <Link href="/projects/new">
        <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20">
          <Plus className="w-3.5 h-3.5" />
          New Design
        </button>
      </Link>
    </Card>
  );
}
