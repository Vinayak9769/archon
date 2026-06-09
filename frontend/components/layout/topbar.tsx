"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const breadcrumbMap: Record<string, { label: string; parent?: string }> = {
  "/dashboard": { label: "Dashboard" },
  "/analyses": { label: "Analyses" },
  "/analyses/new": { label: "New Analysis", parent: "/analyses" },
  "/architecture": { label: "Architecture Visualization" },
  "/drift": { label: "Architecture Drift" },
  "/backlog": { label: "Implementation Backlog" },
  "/reports": { label: "Reports" },
  "/settings": { label: "Settings" },
};

export function Topbar() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname === "/onboarding") {
    return null;
  }

  // Build breadcrumb
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  if (segments.length >= 1) {
    const base = `/${segments[0]}`;
    const info = breadcrumbMap[base];
    if (info?.parent) {
      crumbs.push({ label: breadcrumbMap[info.parent]?.label || segments[0], href: info.parent });
    }
    crumbs.push({ label: info?.label || segments[0], href: base });
  }

  if (segments.length >= 2 && segments[0] === "analyses" && segments[1] !== "new") {
    crumbs.push({ label: segments[1].toUpperCase(), href: pathname });
  }

  const isAnalysisDetail = segments[0] === "analyses" && segments[1] && segments[1] !== "new";

  return (
    <header className="flex items-center justify-between h-12 px-5 border-b border-zinc-800/60 bg-[#0a0a0b]/80 backdrop-blur-sm flex-shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        <span className="text-zinc-500 font-medium">acme-corp</span>
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />
            {i === crumbs.length - 1 ? (
              <span className="text-zinc-200 font-medium">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isAnalysisDetail && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-zinc-200 gap-1.5">
            <ExternalLink className="w-3 h-3" />
            Open Repo
          </Button>
        )}
        {pathname === "/dashboard" && (
          <Link href="/analyses/new">
            <Button size="sm" className="h-7 text-xs bg-zinc-800 hover:bg-zinc-700 text-white gap-1.5 font-medium">
              <Plus className="w-3 h-3" />
              New Analysis
            </Button>
          </Link>
        )}
        {pathname === "/reports" && (
          <Button size="sm" className="h-7 text-xs bg-zinc-800 hover:bg-zinc-700 text-white gap-1.5 font-medium">
            <Plus className="w-3 h-3" />
            Export All
          </Button>
        )}
      </div>
    </header>
  );
}
