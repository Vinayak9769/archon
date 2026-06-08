"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { reports } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Search, Download, FileJson, FileText, File, Tag,
  CalendarDays, History, MoreHorizontal,
} from "lucide-react";

const typeLabels: Record<string, string> = {
  "architecture-review": "Architecture Review",
  "architecture-reconstruction": "Architecture Reconstruction",
  "design-validation": "Design Validation",
  "scalability-assessment": "Scalability Assessment",
};

const typeColors: Record<string, string> = {
  "architecture-review": "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  "architecture-reconstruction": "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "design-validation": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "scalability-assessment": "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

const scoreColor = (s: number) => s >= 80 ? "text-green-400" : s >= 60 ? "text-amber-400" : "text-red-400";
const scoreBg = (s: number) => s >= 80 ? "bg-green-500" : s >= 60 ? "bg-amber-500" : "bg-red-500";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const versionHistories: Record<string, { version: number; date: string; score: number; notes: string }[]> = {
  "rpt_01": [
    { version: 7, date: "2026-06-01", score: 74, notes: "Latest — post security fixes" },
    { version: 6, date: "2026-05-21", score: 68, notes: "Added cost review" },
    { version: 5, date: "2026-05-10", score: 71, notes: "Scalability agent updated" },
    { version: 4, date: "2026-04-28", score: 65, notes: "Initial full review" },
  ],
};

export default function ReportsPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const filtered = reports.filter(r => {
    const matchQuery = !query || r.repo.toLowerCase().includes(query.toLowerCase()) || r.tags.some(t => t.includes(query.toLowerCase()));
    const matchType = typeFilter === "all" || r.type === typeFilter;
    return matchQuery && matchType;
  });

  const selectedHistory = selectedReport ? versionHistories[selectedReport] : null;

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Reports</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{reports.length} generated reports · all repositories</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search repos, tags..."
              className="pl-9 h-8 bg-zinc-900 border-zinc-800 text-zinc-200 text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="h-8 px-3 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 text-xs hover:text-zinc-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            {Object.entries(typeLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="text-xs text-zinc-500 ml-auto">{filtered.length} results</div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(report => (
            <Card key={report.id}
              className={cn("bg-[#111113] border-zinc-800/60 hover:border-zinc-700/60 transition-all cursor-pointer",
                selectedReport === report.id && "border-indigo-500/50 bg-indigo-950/20")}
              onClick={() => setSelectedReport(report.id === selectedReport ? null : report.id)}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-200 font-mono">{report.repo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn("text-[10px] border px-1.5", typeColors[report.type])}>
                        {typeLabels[report.type]}
                      </Badge>
                      <span className="text-[10px] text-zinc-600">v{report.version}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="text-zinc-600 hover:text-zinc-400 p-1 rounded" title="Export options">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Score bar */}
                <div className="flex items-center gap-3 mb-3">
                  <span className={cn("text-2xl font-bold font-mono", scoreColor(report.score))}>{report.score}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-600 mb-1">
                      <span>Architecture Score</span>
                      <span>/ 100</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", scoreBg(report.score))} style={{ width: `${report.score}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3" />
                    {formatDate(report.generatedAt)}
                  </div>
                  <span className="text-zinc-600">{report.size}</span>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {report.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-0.5 text-[10px] text-zinc-600 bg-zinc-800/60 rounded px-1.5 py-0.5">
                      <Tag className="w-2.5 h-2.5" />{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800/60">
                  <Button size="sm" variant="ghost" className="h-6 text-[11px] text-zinc-500 hover:text-zinc-200 gap-1 px-2">
                    <Download className="w-3 h-3" /> PDF
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[11px] text-zinc-500 hover:text-zinc-200 gap-1 px-2">
                    <FileJson className="w-3 h-3" /> JSON
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[11px] text-zinc-500 hover:text-zinc-200 gap-1 px-2">
                    <File className="w-3 h-3" /> MD
                  </Button>
                  <button onClick={() => setSelectedReport(report.id === selectedReport ? null : report.id)}
                    className="ml-auto text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    <History className="w-3 h-3" /> History
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Version History Drawer */}
      {selectedReport && (
        <div className="w-72 border-l border-zinc-800/60 bg-[#111113] flex-shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Version History</h3>
              <p className="text-xs text-zinc-500 mt-0.5 font-mono">{reports.find(r => r.id === selectedReport)?.repo}</p>
            </div>
            <button onClick={() => setSelectedReport(null)} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
          </div>
          <div className="p-4 space-y-1">
            {(selectedHistory || [
              { version: 1, date: "2026-05-30", score: reports.find(r => r.id === selectedReport)?.score || 80, notes: "Initial analysis" }
            ]).map((h, i) => (
              <div key={h.version}
                className={cn("p-3 rounded-lg border transition-all", i === 0 ? "border-indigo-500/30 bg-indigo-950/20" : "border-zinc-800 hover:border-zinc-700 cursor-pointer")}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-200">v{h.version}</span>
                    {i === 0 && <Badge className="text-[9px] bg-indigo-500/20 text-indigo-400 border-indigo-500/30 border px-1">Latest</Badge>}
                  </div>
                  <span className={cn("text-xs font-mono font-bold", scoreColor(h.score))}>{h.score}</span>
                </div>
                <p className="text-[11px] text-zinc-500">{h.notes}</p>
                <p className="text-[10px] text-zinc-600 mt-1">{h.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
