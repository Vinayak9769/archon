"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GitPullRequest, GitMerge, FileText, AlertTriangle, CheckCircle2,
  GitCompare, ArrowRight, CornerDownRight, ShieldAlert, Zap,
  XCircle, ChevronRight, Check, RefreshCcw, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PRData {
  id: string;
  number: number;
  title: string;
  author: string;
  branch: string;
  targetBranch: string;
  createdAt: string;
  status: "open" | "merged" | "closed";
  repository: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  diffs: {
    filename: string;
    additions: number;
    deletions: number;
    hunks: {
      type: "normal" | "add" | "del";
      content: string;
    }[];
  }[];
  driftCheck: {
    status: "passed" | "failed" | "warning";
    driftScore: number;
    findings: {
      component: string;
      severity: "critical" | "high" | "medium" | "low";
      expected: string;
      actual: string;
      message: string;
    }[];
  };
}

const mockPRs: PRData[] = [
  {
    id: "pr_1",
    number: 14,
    title: "Migrate Authentication from Auth0 to Okta Auth Provider",
    author: "Vinayak9769",
    branch: "feature/okta-auth",
    targetBranch: "main",
    createdAt: "2026-06-09T10:14:00Z",
    status: "open",
    repository: "acme-corp/user-auth",
    filesChanged: 2,
    additions: 42,
    deletions: 18,
    diffs: [
      {
        filename: "src/auth/auth.config.ts",
        additions: 12,
        deletions: 4,
        hunks: [
          { type: "normal", content: " import { AuthConfig } from './types';" },
          { type: "del", content: "-import { Auth0Provider } from '@auth0/auth0-react';" },
          { type: "add", content: "+import { OktaAuth } from '@okta/okta-auth-js';" },
          { type: "normal", content: " " },
          { type: "normal", content: " export const config: AuthConfig = {" },
          { type: "del", content: "-  provider: 'auth0'," },
          { type: "del", content: "-  domain: process.env.AUTH0_DOMAIN || ''," },
          { type: "add", content: "+  provider: 'okta'," },
          { type: "add", content: "+  issuer: process.env.OKTA_ISSUER || ''," },
          { type: "add", content: "+  clientId: process.env.OKTA_CLIENT_ID || ''," },
        ]
      },
      {
        filename: "src/auth/jwt.service.ts",
        additions: 30,
        deletions: 14,
        hunks: [
          { type: "normal", content: " export class JwtService {" },
          { type: "normal", content: "   verifyToken(token: string) {" },
          { type: "del", content: "-    return jwt.verify(token, process.env.AUTH0_SECRET);" },
          { type: "add", content: "+    // Set expiresIn claim and check Okta signature key set" },
          { type: "add", content: "+    return oktaJwtVerifier.verifyAccessToken(token, 'api://default');" },
          { type: "normal", content: "   }" },
        ]
      }
    ],
    driftCheck: {
      status: "failed",
      driftScore: 45,
      findings: [
        {
          component: "Auth Provider",
          severity: "critical",
          expected: "Auth0",
          actual: "Okta",
          message: "Auth provider changed from Auth0 to Okta without updating architecture blueprint specification."
        }
      ]
    }
  },
  {
    id: "pr_2",
    number: 15,
    title: "Introduce active Redis caching layer for speedups",
    author: "Vinayak9769",
    branch: "feature/redis-cache",
    targetBranch: "main",
    createdAt: "2026-06-08T16:45:00Z",
    status: "open",
    repository: "acme-corp/payments-service",
    filesChanged: 1,
    additions: 18,
    deletions: 2,
    diffs: [
      {
        filename: "src/payments/service.ts",
        additions: 18,
        deletions: 2,
        hunks: [
          { type: "normal", content: " import { db } from '../database';" },
          { type: "add", content: "+import { redisClient } from '../cache/redis';" },
          { type: "normal", content: " " },
          { type: "normal", content: " export async function getPaymentStatus(id: string) {" },
          { type: "add", content: "+  const cached = await redisClient.get(`pay:${id}`);" },
          { type: "add", content: "+  if (cached) return JSON.parse(cached);" },
          { type: "normal", content: "   const val = await db.query('SELECT * FROM payments WHERE id = $1', [id]);" },
          { type: "add", content: "+  await redisClient.setEx(`pay:${id}`, 3600, JSON.stringify(val));" },
          { type: "normal", content: "   return val;" },
        ]
      }
    ],
    driftCheck: {
      status: "warning",
      driftScore: 24,
      findings: [
        {
          component: "Cache Layer",
          severity: "high",
          expected: "Not specified / Direct Database",
          actual: "Redis 7.2",
          message: "Undocumented cache layer (Redis) introduced bypassing primary database. May require scale review."
        }
      ]
    }
  },
  {
    id: "pr_3",
    number: 16,
    title: "Refactor CORS configuration to strict allowed origins list",
    author: "Vinayak9769",
    branch: "patch/cors-rules",
    targetBranch: "main",
    createdAt: "2026-06-09T14:30:00Z",
    status: "open",
    repository: "acme-corp/api-gateway",
    filesChanged: 1,
    additions: 5,
    deletions: 3,
    diffs: [
      {
        filename: "src/server.ts",
        additions: 5,
        deletions: 3,
        hunks: [
          { type: "normal", content: " app.use(cors({" },
          { type: "del", content: "-  origin: '*'," },
          { type: "add", content: "+  origin: ['https://archon.ai', 'https://dev.archon.ai']," },
          { type: "normal", content: "   credentials: true," },
          { type: "normal", content: " }));" },
        ]
      }
    ],
    driftCheck: {
      status: "passed",
      driftScore: 0,
      findings: []
    }
  }
];

const severityColors = {
  critical: "text-red-400 border-red-500/20 bg-red-500/10",
  high: "text-orange-400 border-orange-500/20 bg-orange-500/10",
  medium: "text-amber-400 border-amber-500/20 bg-amber-500/10",
  low: "text-blue-400 border-blue-500/20 bg-blue-500/10",
};

export default function ReviewsPage() {
  const [selectedPrId, setSelectedPrId] = useState<string>("pr_1");
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [reconciling, setReconciling] = useState<string | null>(null);

  const selectedPr = mockPRs.find(p => p.id === selectedPrId) || mockPRs[0];
  const activeDiff = selectedPr.diffs[selectedFileIdx] || selectedPr.diffs[0] || null;

  async function handleReconcile(findingIdx: number) {
    const key = `${selectedPr.id}_${findingIdx}`;
    setReconciling(key);
    // Simulate spec reconciliation API request
    await new Promise(resolve => setTimeout(resolve, 1500));
    setReconciling(null);
    alert("System architecture blueprint successfully updated & reconciled to match current PR changes!");
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 bg-[#0a0a0b] text-zinc-100 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Review Pull Requests</h1>
          <p className="text-xs text-zinc-500 mt-1">Review active code pull requests and automatically verify architectural alignment.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-xs bg-zinc-900 border-zinc-800 text-zinc-400 font-mono gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            GitHub App Hooked
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Side: PR Selection List */}
        <div className="xl:col-span-4 space-y-3">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">Open Pull Requests ({mockPRs.length})</p>
          <div className="space-y-2.5">
            {mockPRs.map(pr => {
              const isActive = pr.id === selectedPrId;
              const hasDrift = pr.driftCheck.status !== "passed";
              return (
                <div
                  key={pr.id}
                  onClick={() => {
                    setSelectedPrId(pr.id);
                    setSelectedFileIdx(0);
                  }}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left relative overflow-hidden group",
                    isActive
                      ? "bg-zinc-900/80 border-indigo-500/40 shadow-md shadow-black/40"
                      : "bg-[#111113] border-zinc-800/60 hover:border-zinc-700/60"
                  )}
                >
                  {/* Neon border hint for active */}
                  {isActive && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />}

                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono text-zinc-650 font-semibold uppercase tracking-wider truncate">
                        {pr.repository}
                      </span>
                      {pr.driftCheck.status === "failed" && (
                        <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold">
                          Drift Alert
                        </Badge>
                      )}
                      {pr.driftCheck.status === "warning" && (
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold">
                          Warning
                        </Badge>
                      )}
                      {pr.driftCheck.status === "passed" && (
                        <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-bold">
                          Aligned
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white leading-snug transition-colors line-clamp-2">
                      #{pr.number} {pr.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-900/60">
                    <div className="flex items-center gap-1.5 font-mono">
                      <GitPullRequest className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{pr.branch}</span>
                    </div>
                    <span>{new Date(pr.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Diff & Architectural Drift Check */}
        <div className="xl:col-span-8 space-y-6">
          {/* PR Details and Action Panel */}
          <Card className="bg-[#111113] border-zinc-800/60 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-mono text-zinc-400">PR #{selectedPr.number} · {selectedPr.repository}</span>
                </div>
                <h2 className="text-base font-bold text-zinc-100">{selectedPr.title}</h2>
                <p className="text-xs text-zinc-500">
                  Opened by <span className="text-zinc-300 font-semibold">{selectedPr.author}</span> · {selectedPr.filesChanged} files changed (+{selectedPr.additions}/-{selectedPr.deletions})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 text-xs">
                  Request Changes
                </Button>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs gap-1.5">
                  <GitMerge className="w-3.5 h-3.5" /> Approve & Merge
                </Button>
              </div>
            </div>

            {/* Drift Check Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Score card */}
              <div className={cn(
                "p-4 rounded-xl border flex items-center gap-4.5",
                selectedPr.driftCheck.status === "failed" ? "bg-red-500/5 border-red-500/10" :
                selectedPr.driftCheck.status === "warning" ? "bg-amber-500/5 border-amber-500/10" : "bg-green-500/5 border-green-500/10"
              )}>
                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg width="48" height="48" className="-rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#27272a" strokeWidth="4" />
                    <circle
                      cx="24" cy="24" r="20" fill="none"
                      stroke={selectedPr.driftCheck.status === "failed" ? "#ef4444" : selectedPr.driftCheck.status === "warning" ? "#f59e0b" : "#10b981"}
                      strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={2 * Math.PI * 20 * (1 - (100 - selectedPr.driftCheck.driftScore) / 100)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center rotate-90 text-[10px] font-bold text-zinc-300">
                    {100 - selectedPr.driftCheck.driftScore}%
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Alignment Rating</p>
                  <h4 className="text-sm font-bold text-zinc-250 mt-0.5">
                    {selectedPr.driftCheck.status === "failed" ? "Drifted" : selectedPr.driftCheck.status === "warning" ? "Warning" : "Aligned"}
                  </h4>
                </div>
              </div>

              {/* Status Details */}
              <div className="col-span-2 p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/30 flex items-center gap-3">
                {selectedPr.driftCheck.status === "failed" ? (
                  <ShieldAlert className="w-8 h-8 text-red-500 flex-shrink-0" />
                ) : selectedPr.driftCheck.status === "warning" ? (
                  <AlertTriangle className="w-8 h-8 text-amber-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold text-zinc-350">
                    {selectedPr.driftCheck.status === "failed" ? "Drift detected against blueprint specification" :
                     selectedPr.driftCheck.status === "warning" ? "Minor design differences detected" : "No architectural drift detected"}
                  </p>
                  <p className="text-[11px] text-zinc-550 leading-relaxed mt-0.5">
                    {selectedPr.driftCheck.status === "failed" ? "A critical component was modified. Update the specification or request code updates to match." :
                     selectedPr.driftCheck.status === "warning" ? "Redis was added but is not in the architecture schema. Check if this is intended." : "Code modifications match all system guidelines."}
                  </p>
                </div>
              </div>
            </div>

            {/* Findings Accordion/List */}
            {selectedPr.driftCheck.findings.map((finding, idx) => (
              <div key={idx} className={cn("p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4", severityColors[finding.severity])}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{finding.component} ({finding.severity} drift)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-300 font-medium">{finding.message}</p>
                  <div className="flex items-center gap-2 pt-1 font-mono text-[10px]">
                    <span className="text-zinc-500">Spec:</span>
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900/60 line-through text-zinc-400">{finding.expected}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-500" />
                    <span className="text-zinc-500">PR code:</span>
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900/60 text-zinc-100 font-bold">{finding.actual}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleReconcile(idx)}
                  disabled={reconciling === `${selectedPr.id}_${idx}`}
                  className="bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-250 flex-shrink-0"
                >
                  {reconciling === `${selectedPr.id}_${idx}` ? (
                    <RefreshCcw className="w-3 h-3 animate-spin mr-1.5" />
                  ) : (
                    <Zap className="w-3 h-3 text-amber-500 mr-1.5" />
                  )}
                  Reconcile Spec
                </Button>
              </div>
            ))}
          </Card>

          {/* Code Diff Panel */}
          {activeDiff && (
            <Card className="bg-[#111113] border-zinc-800/60 overflow-hidden flex flex-col">
              {/* Diff Header */}
              <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-950/50 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  <span className="text-xs font-mono font-semibold text-zinc-350 truncate">{activeDiff.filename}</span>
                </div>
                {/* File selectors */}
                <div className="flex items-center gap-1">
                  {selectedPr.diffs.map((diff, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedFileIdx(idx)}
                      className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-semibold transition-all border",
                        idx === selectedFileIdx
                          ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                          : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {diff.filename.split("/").pop()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Panel */}
              <div className="font-mono text-xs overflow-x-auto divide-y divide-zinc-900/60 bg-[#070708]">
                {activeDiff.hunks.map((line, lIdx) => {
                  const isAdd = line.type === "add";
                  const isDel = line.type === "del";

                  return (
                    <div
                      key={lIdx}
                      className={cn(
                        "flex items-stretch min-w-full py-0.5",
                        isAdd && "bg-emerald-950/15 border-l-2 border-emerald-500",
                        isDel && "bg-red-950/15 border-l-2 border-red-500"
                      )}
                    >
                      {/* Line Indicators */}
                      <div className="w-8 select-none text-right pr-2.5 border-r border-zinc-900/60 text-zinc-700 text-[10px] flex items-center justify-end">
                        {lIdx + 1}
                      </div>
                      
                      {/* Code Content */}
                      <pre className={cn(
                        "pl-4 py-0.5 leading-relaxed text-zinc-400 whitespace-pre",
                        isAdd && "text-emerald-450 font-semibold",
                        isDel && "text-red-450 line-through decoration-red-500/20"
                      )}>
                        {line.content}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
