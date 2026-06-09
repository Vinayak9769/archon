"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, FolderGit2, Hexagon, FileText,
  Settings, Bell, Search, Plus, Layers, CheckSquare,
  Check, Loader2, ChevronsUpDown, X, GitCompare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiListWorkspaces, apiCreateWorkspace, type Workspace } from "@/lib/api";

// ── Nav items ─────────────────────────────────────────────────────────────────

const primaryNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects", icon: FolderGit2, label: "Projects" },
  { href: "/backlog", icon: Layers, label: "Backlog" },
  { href: "/tasks", icon: CheckSquare, label: "My Tasks" },
  { href: "/reviews", icon: GitCompare, label: "Reviews" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

// ── Workspace Switcher ────────────────────────────────────────────────────────

function WorkspaceSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch workspaces immediately on mount
  useEffect(() => {
    setLoading(true);
    apiListWorkspaces()
      .then((ws) => {
        const list = ws || [];
        setWorkspaces(list);

        // Extract workspace ID from pathname /workspaces/[id]
        const match = pathname?.match(/\/workspaces\/([^/]+)/);
        const pathWsId = match ? match[1] : null;

        const savedId = localStorage.getItem("current_workspace_id");
        const idToActive = pathWsId || savedId || (list.length ? list[0].id : null);

        if (idToActive) {
          setActiveId(idToActive);
          localStorage.setItem("current_workspace_id", idToActive);
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // Sync activeId if pathname changes
  useEffect(() => {
    const match = pathname?.match(/\/workspaces\/([^/]+)/);
    const pathWsId = match ? match[1] : null;
    if (pathWsId && pathWsId !== activeId) {
      setActiveId(pathWsId);
      localStorage.setItem("current_workspace_id", pathWsId);
    }
  }, [pathname, activeId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiListWorkspaces()
      .then((ws) => {
        setWorkspaces(ws || []);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
        setNewName("");
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const ws = await apiCreateWorkspace(newName.trim());
      setWorkspaces((prev) => [ws, ...prev]);
      setActiveId(ws.id);
      localStorage.setItem("current_workspace_id", ws.id);
      setNewName("");
      setShowCreate(false);
      setOpen(false);
      router.push(`/workspaces/${ws.id}`);
    } catch { }
    finally { setCreating(false); }
  }

  function handleSwitch(ws: Workspace) {
    setActiveId(ws.id);
    localStorage.setItem("current_workspace_id", ws.id);
    setOpen(false);
    router.push(`/workspaces/${ws.id}`);
  }

  const active = workspaces.find((w) => w.id === activeId);

  return (
    <div ref={ref} className="relative px-3 py-2.5 border-b border-zinc-800/60">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-2.5 py-2 rounded-md bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700/60 hover:bg-zinc-800/40 transition-all group"
      >
        <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700/60 flex items-center justify-center flex-shrink-0">
          <Layers className="w-3 h-3 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <span className="text-xs font-semibold text-zinc-300 truncate block">
            {active?.name ?? (workspaces[0]?.name ?? "Workspaces")}
          </span>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-3 right-3 top-[calc(100%-8px)] z-50 bg-[#18181b] border border-zinc-700/60 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/60">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Switch Workspace</span>
            <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
              </div>
            ) : workspaces.length === 0 ? (
              <p className="text-[10px] text-zinc-600 text-center py-5">No workspaces yet</p>
            ) : (
              workspaces.map((ws) => {
                const isActive = ws.id === activeId;
                return (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitch(ws)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                      isActive ? "bg-zinc-800/60 text-zinc-100" : "hover:bg-zinc-800/40 text-zinc-400"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 border text-[10px] font-bold",
                      isActive ? "bg-zinc-700 border-zinc-600 text-zinc-100" : "bg-zinc-800 border-zinc-700/60 text-zinc-400"
                    )}>
                      {ws.name[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-medium truncate flex-1">{ws.name}</span>
                    {isActive && <Check className="w-3 h-3 text-zinc-300 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-zinc-800/60 p-2 space-y-1">
            <Link
              href="/workspaces"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              Manage Workspaces
            </Link>

            {showCreate ? (
              <form onSubmit={handleCreate} className="flex items-center gap-1.5 px-1">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Workspace name..."
                  className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-200 text-[11px] rounded-md px-2 py-1.5 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-700"
                />
                <button type="submit" disabled={creating || !newName.trim()}
                  className="p-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-40">
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button type="button" onClick={() => { setShowCreate(false); setNewName(""); }}
                  className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEmail(localStorage.getItem("archon_auth_email"));
    }
  }, []);

  const hidden = ["/", "/login", "/signup", "/onboarding"];
  if (hidden.includes(pathname)) return null;

  const displayName = email
    ? email.split("@")[0].split(/[\._\-]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
    : "Developer";

  const initials = displayName
    .split(" ")
    .map(part => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2) || "D";

  const displayEmail = email || "dev@archon.ai";

  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col h-full bg-[#0a0a0b] border-r border-zinc-800/60">
      {/* Workspace Switcher */}
      <WorkspaceSwitcher />

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-zinc-800/60">
        <button className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700/60 text-zinc-500 hover:text-zinc-400 transition-all text-xs">
          <Search className="w-3 h-3" />
          <span>Search...</span>
          <kbd className="ml-auto text-[10px] bg-zinc-800 px-1 rounded font-mono">⌘K</kbd>
        </button>
      </div>

      {/* New Design CTA */}
      <div className="px-3 py-2.5 border-b border-zinc-800/60">
        <Link
          href="/projects/new"
          id="sidebar-new-design"
          className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-zinc-200 hover:bg-white/10 hover:text-white transition-all text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          New Design
        </Link>
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-2 pt-1 pb-1">Platform</p>
        {primaryNav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-all duration-150 relative",
                active ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/60"
              )}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-zinc-300 rounded-r-full" />}
              <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-zinc-200" : "text-zinc-600 group-hover:text-zinc-400")} />
              <span className="flex-1 font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-2 space-y-0.5 border-t border-zinc-800/60 pt-2">
        <button className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/60 transition-all relative">
          <Bell className="w-4 h-4 text-zinc-600" />
          <span className="text-sm font-medium">Notifications</span>
          <span className="ml-auto w-2 h-2 rounded-full bg-zinc-300 live-dot" />
        </button>
        <div className="flex items-center gap-2.5 px-2.5 py-2 mt-1 rounded-md hover:bg-zinc-900/60 cursor-pointer transition-all">
          <div className="w-6 h-6 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-zinc-200">{initials}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-zinc-300 leading-none truncate">{displayName}</span>
            <span className="text-[10px] text-zinc-600 leading-none mt-0.5 truncate">{displayEmail}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
