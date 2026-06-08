import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { driftComparison, driftAlerts } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, ArrowRight, CheckCircle2, GitCompare, Plus, Minus,
  RefreshCw, TrendingDown, Lightbulb, AlertCircle, XCircle,
} from "lucide-react";

export const metadata: Metadata = { title: "Architecture Drift" };

const driftTypeConfig = {
  none: { label: "No Change", color: "text-zinc-500", bg: "bg-zinc-800/40 border-zinc-700/40", icon: CheckCircle2, iconColor: "text-zinc-600" },
  changed: { label: "Changed", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: RefreshCw, iconColor: "text-amber-400" },
  added: { label: "Added", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", icon: Plus, iconColor: "text-green-400" },
  removed: { label: "Removed", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: Minus, iconColor: "text-red-400" },
};

const recommendations = [
  {
    severity: "critical",
    title: "Reconcile Auth0 → Okta migration in architecture docs",
    detail: "Update the system architecture document to reflect the OAuth provider change. Ensure all integration contracts are re-validated against Okta's API.",
    effort: "2 days",
  },
  {
    severity: "critical",
    title: "Remove or document undocumented Redis cache layer",
    detail: "The Redis instance was added without architecture review. Either document it in the spec with capacity planning, or evaluate whether it's necessary.",
    effort: "1 day",
  },
  {
    severity: "high",
    title: "Restore Istio service mesh or update architecture to reflect its removal",
    detail: "Service mesh was removed from deployment but still specified in architecture. This impacts observability, mTLS, and traffic management capabilities.",
    effort: "3–5 days",
  },
  {
    severity: "high",
    title: "Revert or justify DB connection pool size change (20 → 100)",
    detail: "An 5x increase in pool size without load testing can cause resource exhaustion. Perform load testing and set appropriate limits.",
    effort: "1 day",
  },
  {
    severity: "medium",
    title: "Migrate from RabbitMQ to Kafka spec (or revert)",
    detail: "Architecture spec still references RabbitMQ. Update the spec to reflect Kafka or plan a migration with proper partitioning strategy.",
    effort: "2–3 days",
  },
];

const sevConfig = {
  critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", dot: "bg-red-500" },
  high: { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", dot: "bg-orange-500" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400" },
  low: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", dot: "bg-blue-500" },
  info: { color: "text-zinc-400", bg: "bg-zinc-800/40 border-zinc-700", dot: "bg-zinc-500" },
};

export default function DriftPage() {
  const changedCount = driftComparison.expected.filter(d => d.drift !== "none").length;
  const criticalCount = driftAlerts.filter(a => a.severity === "critical").length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Architecture Drift</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Expected vs actual architecture comparison</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-xs bg-zinc-800 border-zinc-700 text-zinc-400 font-mono">acme-corp/payments-service</Badge>
          <Badge className="text-xs bg-zinc-800 border-zinc-700 text-zinc-400">main · Jun 02, 2026</Badge>
        </div>
      </div>

      {/* Drift Score Banner */}
      <Card className="bg-[#111113] border-red-500/20 p-5">
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0">
            <svg width={100} height={100} className="-rotate-90">
              <circle cx={50} cy={50} r={40} fill="none" stroke="#27272a" strokeWidth={8} />
              <circle cx={50} cy={50} r={40} fill="none" stroke="#ef4444" strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - driftComparison.driftScore / 100)}
                style={{ transition: "stroke-dashoffset 1.2s ease-out" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center rotate-90">
              <span className="text-2xl font-bold text-red-400">{driftComparison.driftScore}</span>
              <span className="text-[10px] text-zinc-500">drift</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-zinc-100">High Architectural Drift Detected</h2>
              <Badge className="text-xs bg-red-500/20 text-red-400 border-red-500/30 border">High Severity</Badge>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {changedCount} of {driftComparison.expected.length} architectural components have drifted from the expected state.
              Immediate action is required to reconcile the service mesh removal and undocumented cache layer.
            </p>
            <div className="flex items-center gap-4 mt-3">
              {[
                { label: "Components drifted", value: changedCount, color: "text-red-400" },
                { label: "Critical alerts", value: criticalCount, color: "text-red-400" },
                { label: "Components matched", value: driftComparison.expected.filter(d => d.drift === "none").length, color: "text-green-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-xs">
                  <span className={cn("text-2xl font-bold font-mono", color)}>{value}</span>
                  <p className="text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-shrink-0">
            <TrendingDown className="w-16 h-16 text-red-500/20" />
          </div>
        </div>
      </Card>

      {/* Side-by-Side Comparison */}
      <Card className="bg-[#111113] border-zinc-800/60">
        <div className="p-4 border-b border-zinc-800/60 flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-200">Component Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60">
                <th className="text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-4 py-3">Component</th>
                <th className="text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-4 py-3">Expected (Spec)</th>
                <th className="w-8 px-2" />
                <th className="text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-4 py-3">Actual (Detected)</th>
                <th className="text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {driftComparison.expected.map(row => {
                const cfg = driftTypeConfig[row.drift as keyof typeof driftTypeConfig];
                const Icon = cfg.icon;
                return (
                  <tr key={row.component} className={cn("hover:bg-zinc-800/20 transition-colors", row.drift !== "none" && "border-l-2 border-l-amber-500/40")}>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-300">{row.component}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-sm font-mono px-2 py-0.5 rounded text-xs",
                        row.drift === "removed" ? "text-red-400 bg-red-500/10" :
                        row.drift === "none" ? "text-zinc-400 bg-zinc-800/50" : "text-zinc-400 bg-zinc-800/50 line-through decoration-red-500/60")}>
                        {row.expected}
                      </span>
                    </td>
                    <td className="px-2 text-center">
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-700 mx-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-sm font-mono px-2 py-0.5 rounded text-xs",
                        row.drift === "added" ? "text-green-400 bg-green-500/10" :
                        row.drift === "changed" ? "text-amber-400 bg-amber-500/10" :
                        row.drift === "removed" ? "text-zinc-600 italic" : "text-zinc-400 bg-zinc-800/50")}>
                        {row.actual}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs", cfg.bg, cfg.color)}>
                        <Icon className={cn("w-3 h-3", cfg.iconColor)} />
                        {cfg.label}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="bg-[#111113] border-zinc-800/60">
        <div className="p-4 border-b border-zinc-800/60 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Recommendations</h2>
          <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700 font-mono ml-auto">{recommendations.length} actions</Badge>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {recommendations.map((rec, i) => {
            const sev = sevConfig[rec.severity as keyof typeof sevConfig];
            return (
              <div key={i} className="flex items-start gap-3 p-4 hover:bg-zinc-800/20 transition-colors">
                <span className="text-xs font-bold font-mono text-zinc-600 mt-0.5 w-4 flex-shrink-0">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p className="text-sm font-medium text-zinc-200 leading-snug">{rec.title}</p>
                    <Badge className={cn("text-[10px] border capitalize px-1.5 flex-shrink-0", sev.bg, sev.color)}>{rec.severity}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{rec.detail}</p>
                  <p className="text-[11px] text-zinc-600 mt-1.5">Estimated effort: <span className="text-zinc-400">{rec.effort}</span></p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
