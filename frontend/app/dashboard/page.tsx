"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus, FolderGit2, ArrowUpRight, CheckCircle2,
  Clock, Layers, Database, Code2, FileText, Loader2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OnboardingBanner } from "@/components/dashboard/onboarding-banner";
import { apiListProjects, apiListDesigns, type Project, type Design } from "@/lib/api";

const statusMap: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  completed:                       { label: "Completed",       color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", Icon: CheckCircle2 },
  awaiting_architecture_approval:  { label: "Awaiting Review", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",   Icon: Clock },
  awaiting_cpm_approval:           { label: "Awaiting Review", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",   Icon: Clock },
  awaiting_database_approval:      { label: "Awaiting Review", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",   Icon: Clock },
  building_architecture:           { label: "Generating",      color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20",  Icon: Loader2 },
  building_cpm:                    { label: "Generating",      color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20",  Icon: Loader2 },
  building_database:               { label: "Generating",      color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20",  Icon: Loader2 },
  validating:                      { label: "Validating PRD",  color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",      Icon: Loader2 },
  clarifying:                      { label: "Clarifying",      color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20",  Icon: Clock },
};

const stageIcon: Record<string, React.ElementType> = {
  building_architecture:          Layers,
  awaiting_architecture_approval: Layers,
  building_database:              Database,
  awaiting_database_approval:     Database,
  building_cpm:                   FolderGit2,
  awaiting_cpm_approval:          FolderGit2,
  completed:                      CheckCircle2,
  validating:                     FileText,
  clarifying:                     Clock,
};

const quickActions = [
  { href: "/projects/new", icon: Plus,        label: "New Design",   desc: "Start from a PRD",         color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  { href: "/projects",     icon: FolderGit2,  label: "All Projects", desc: "Browse your projects",     color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  { href: "/templates",    icon: FileText,    label: "Templates",    desc: "Start from a template",    color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { href: "/reports",      icon: ArrowUpRight,label: "Reports",      desc: "Export design artifacts",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
];

interface DesignWithProject extends Design { projectName: string; }

export default function DashboardPage() {
  const [recentDesigns, setRecentDesigns] = useState<DesignWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiListProjects()
      .then(async (ps) => {
        setProjects(ps);
        const allDesigns: DesignWithProject[] = [];
        for (const p of ps.slice(0, 5)) {
          try {
            const designs = await apiListDesigns(p.id);
            allDesigns.push(...designs.map(d => ({ ...d, projectName: p.name })));
          } catch { /* ignore per-project errors */ }
        }
        allDesigns.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        setRecentDesigns(allDesigns.slice(0, 6));
      })
      .catch(() => { /* silently fail — show empty state */ })
      .finally(() => setLoading(false));
  }, []);

  const completed   = recentDesigns.filter(d => d.status === "completed").length;
  const awaiting    = recentDesigns.filter(d => d.status.startsWith("awaiting")).length;
  const inProgress  = recentDesigns.filter(d => !d.status.startsWith("awaiting") && d.status !== "completed").length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Your system design workspace</p>
        </div>
        <Link href="/projects/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-indigo-600/20">
          <Plus className="w-3.5 h-3.5" /> New Design
        </Link>
      </div>

      <OnboardingBanner />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Projects",        value: loading ? "—" : String(projects.length), sub: "Total projects",       color: "text-zinc-200" },
          { label: "Active Designs",  value: loading ? "—" : String(inProgress),      sub: "In progress",          color: "text-indigo-400" },
          { label: "Awaiting Review", value: loading ? "—" : String(awaiting),        sub: "Your action needed",   color: "text-amber-400" },
          { label: "Completed",       value: loading ? "—" : String(completed),       sub: "Designs finished",     color: "text-emerald-400" },
        ].map(({ label, value, sub, color }) => (
          <Card key={label} className="bg-[#111113] border-zinc-800/60 p-4 hover:border-zinc-700/60 transition-all">
            <p className="text-xs text-zinc-500 mb-1">{label}</p>
            <p className={cn("text-3xl font-bold leading-none mb-1", color)}>{value}</p>
            <p className="text-[11px] text-zinc-600">{sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Recent Designs */}
        <Card className="bg-[#111113] border-zinc-800/60 col-span-2">
          <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">Recent Designs</h2>
            <Link href="/projects" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          )}

          {!loading && recentDesigns.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <Code2 className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-500">No designs yet.</p>
              <Link href="/projects/new" className="text-xs text-indigo-400 mt-1 hover:text-indigo-300">Start your first →</Link>
            </div>
          )}

          <div className="divide-y divide-zinc-800/60">
            {recentDesigns.map(d => {
              const cfg = statusMap[d.status] ?? statusMap.validating;
              const StageIcon = stageIcon[d.status] ?? Layers;
              return (
                <Link key={d.id} href={`/projects/${d.project_id}/design/${d.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-zinc-800/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center flex-shrink-0">
                    <StageIcon className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{d.projectName}</p>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">{d.id}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge className={cn("text-[10px] border px-1.5 gap-1", cfg.bg, cfg.color)}>
                      <cfg.Icon className={cn("w-3 h-3", cfg.color.includes("indigo") && "animate-spin")} />
                      {cfg.label}
                    </Badge>
                    <span className="text-[10px] text-zinc-600">
                      {new Date(d.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-[#111113] border-zinc-800/60">
          <div className="p-4 border-b border-zinc-800/60">
            <h2 className="text-sm font-semibold text-zinc-200">Quick Actions</h2>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {quickActions.map(({ href, icon: Icon, label, desc, color }) => (
              <Link key={label} href={href}
                className="flex flex-col items-start gap-2 p-3 rounded-lg border border-zinc-800/60 hover:border-zinc-700/60 hover:bg-zinc-800/20 transition-all">
                <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center", color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">{label}</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
