"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  GitBranch, Key, Users, Bell, CheckCircle2, XCircle, Plus, Trash2,
  Copy, Eye, EyeOff, Cpu, Shield, RefreshCw, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const connectedRepos = [
  { repo: "acme-corp/payments-service", status: "active", lastSync: "2 min ago", webhooks: true },
  { repo: "acme-corp/user-auth", status: "active", lastSync: "14 min ago", webhooks: true },
  { repo: "acme-corp/api-gateway", status: "active", lastSync: "1 hr ago", webhooks: false },
  { repo: "acme-corp/data-pipeline", status: "active", lastSync: "3 hr ago", webhooks: true },
  { repo: "acme-corp/inventory-mgmt", status: "error", lastSync: "—", webhooks: false },
];

const llmProviders = [
  { id: "openai", label: "OpenAI", logo: "⬛", models: ["gpt-4o", "gpt-4-turbo", "gpt-4o-mini"], connected: true, selected: "gpt-4o" },
  { id: "anthropic", label: "Anthropic", logo: "◆", models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-3-5"], connected: true, selected: "claude-opus-4-5" },
  { id: "gemini", label: "Google Gemini", logo: "✦", models: ["gemini-2.0-flash", "gemini-1.5-pro"], connected: false, selected: "" },
  { id: "ollama", label: "Ollama (Local)", logo: "🦙", models: ["llama3.1:70b", "deepseek-r1:32b", "codestral:22b"], connected: false, selected: "" },
];

const teamMembers = [
  { name: "Arjun Kumar", email: "arjun@acme-corp.com", role: "Admin", avatar: "AK", joined: "Jan 2025" },
  { name: "Sofia Chen", email: "sofia@acme-corp.com", role: "Member", avatar: "SC", joined: "Mar 2025" },
  { name: "Marcus Webb", email: "marcus@acme-corp.com", role: "Member", avatar: "MW", joined: "Apr 2025" },
  { name: "Priya Nair", email: "priya@acme-corp.com", role: "Viewer", avatar: "PN", joined: "May 2025" },
];

const apiKeys = [
  { id: "key_01", name: "CI/CD Pipeline", key: "arch_sk_••••••••••••••••••••••••••••••k7f2", created: "2026-03-14", lastUsed: "2 min ago", scopes: ["analyses:read", "reports:read"] },
  { id: "key_02", name: "GitHub Actions Integration", key: "arch_sk_••••••••••••••••••••••••••••••m9x1", created: "2026-05-01", lastUsed: "1 day ago", scopes: ["analyses:write", "reports:read"] },
];

export default function SettingsPage() {
  const [providers, setProviders] = useState(llmProviders);
  const [keyVisible, setKeyVisible] = useState<Record<string, boolean>>({});
  const [inviteEmail, setInviteEmail] = useState("");

  const toggleKeyVisibility = (id: string) => setKeyVisible(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage integrations, AI models, and workspace configuration</p>
      </div>

      <Tabs defaultValue="github">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="github" className="gap-1.5 text-xs"><GitBranch className="w-3.5 h-3.5" />GitHub</TabsTrigger>
          <TabsTrigger value="llm" className="gap-1.5 text-xs"><Cpu className="w-3.5 h-3.5" />LLM Providers</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5 text-xs"><Users className="w-3.5 h-3.5" />Team</TabsTrigger>
          <TabsTrigger value="keys" className="gap-1.5 text-xs"><Key className="w-3.5 h-3.5" />API Keys</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs"><Bell className="w-3.5 h-3.5" />Notifications</TabsTrigger>
        </TabsList>

        {/* GitHub Tab */}
        <TabsContent value="github" className="space-y-4 mt-4">
          <Card className="bg-[#111113] border-zinc-800/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">GitHub Connection</h2>
                <p className="text-xs text-zinc-500 mt-0.5">OAuth connected as <span className="text-zinc-300 font-mono">@arjunkumar</span></p>
              </div>
              <Badge className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 gap-1.5 flex items-center">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center border border-zinc-800 rounded-lg p-3 bg-zinc-900/40 mb-4">
              {[{ label: "Repos Accessible", value: "23" }, { label: "Orgs", value: "2" }, { label: "Webhooks Active", value: "3" }].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-lg font-bold text-zinc-100">{value}</p>
                  <p className="text-xs text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs gap-1.5">
              <RefreshCw className="w-3 h-3" /> Reauthorize
            </Button>
          </Card>

          <Card className="bg-[#111113] border-zinc-800/60">
            <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">Connected Repositories</h2>
              <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5">
                <Plus className="w-3 h-3" /> Add Repo
              </Button>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {connectedRepos.map(r => (
                <div key={r.repo} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20">
                  <GitBranch className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 font-mono">{r.repo}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Last sync: {r.lastSync}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.webhooks && <Badge className="text-[10px] bg-zinc-800 text-zinc-500 border-zinc-700">webhook</Badge>}
                    <Badge className={cn("text-[10px] border",
                      r.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                      {r.status}
                    </Badge>
                    <button className="text-zinc-600 hover:text-zinc-400">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* LLM Providers Tab */}
        <TabsContent value="llm" className="space-y-4 mt-4">
          <Card className="bg-[#111113] border-zinc-800/60 p-4">
            <h2 className="text-sm font-semibold text-zinc-200 mb-1">AI Model Configuration</h2>
            <p className="text-xs text-zinc-500">Configure which LLM providers and models Archon agents use for analysis.</p>
          </Card>
          <div className="space-y-3">
            {providers.map((provider, idx) => (
              <Card key={provider.id} className={cn("bg-[#111113] border-zinc-800/60 p-4", provider.connected && "border-zinc-700/60")}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg flex-shrink-0">
                    {provider.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-200">{provider.label}</p>
                      {provider.connected ? (
                        <Badge className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">Connected</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-zinc-800 text-zinc-500 border-zinc-700">Not connected</Badge>
                      )}
                    </div>
                    {provider.connected && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-zinc-500">Model:</span>
                        <Select value={provider.selected} onValueChange={v => {
                          const next = [...providers];
                          next[idx] = { ...next[idx], selected: v ?? "" };
                          setProviders(next);
                        }}>
                          <SelectTrigger className="h-6 text-xs bg-zinc-900 border-zinc-800 text-zinc-300 w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800 text-xs">
                            {provider.models.map(m => (
                              <SelectItem key={m} value={m} className="text-zinc-300 focus:bg-zinc-800 text-xs">{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  {!provider.connected ? (
                    <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white">Connect</Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-500 hover:text-zinc-300">Configure</Button>
                  )}
                </div>
                {provider.connected && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-zinc-500">API Key</Label>
                      <div className="flex-1 relative">
                        <Input type="password" value="sk-••••••••••••••••••••••••••••••••••••••••••••••••" readOnly
                          className="h-7 text-xs bg-zinc-900 border-zinc-800 text-zinc-500 font-mono pr-16" />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button className="text-zinc-600 hover:text-zinc-400"><Copy className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4 mt-4">
          <Card className="bg-[#111113] border-zinc-800/60">
            <div className="p-4 border-b border-zinc-800/60 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">Team Members</h2>
              <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700 font-mono">{teamMembers.length} members</Badge>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {teamMembers.map(m => (
                <div key={m.email} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-white">{m.avatar}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 font-medium">{m.name}</p>
                    <p className="text-xs text-zinc-500">{m.email}</p>
                  </div>
                  <Select defaultValue={m.role}>
                    <SelectTrigger className="h-7 text-xs bg-zinc-900 border-zinc-800 text-zinc-300 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {["Admin", "Member", "Viewer"].map(r => (
                        <SelectItem key={r} value={r} className="text-xs text-zinc-300 focus:bg-zinc-800">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button className="text-zinc-700 hover:text-zinc-400 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-zinc-800/60">
              <div className="flex gap-2">
                <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="flex-1 h-8 bg-zinc-900 border-zinc-800 text-zinc-200 text-sm" />
                <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5">
                  <Plus className="w-3 h-3" /> Invite
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-4 mt-4">
          <Card className="bg-[#111113] border-zinc-800/60 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">API Keys</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Use API keys to access Archon programmatically from CI/CD pipelines.</p>
              </div>
              <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5">
                <Plus className="w-3 h-3" /> Create Key
              </Button>
            </div>
            <div className="space-y-3">
              {apiKeys.map(k => (
                <div key={k.id} className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-zinc-200">{k.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Last used: <span className="text-zinc-300">{k.lastUsed}</span></span>
                      <button className="text-zinc-700 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800 truncate">
                      {keyVisible[k.id] ? k.key.replace(/•/g, "x") : k.key}
                    </code>
                    <button onClick={() => toggleKeyVisibility(k.id)} className="text-zinc-600 hover:text-zinc-400">
                      {keyVisible[k.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button className="text-zinc-600 hover:text-zinc-400"><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    {k.scopes.map(s => (
                      <Badge key={s} className="text-[10px] bg-zinc-800 text-zinc-500 border-zinc-700 font-mono px-1.5">{s}</Badge>
                    ))}
                    <span className="text-[11px] text-zinc-600 ml-auto">Created {k.created}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card className="bg-[#111113] border-zinc-800/60 p-5">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">Notification Preferences</h2>
            <div className="space-y-4">
              {[
                { id: "analysis-complete", label: "Analysis Complete", desc: "Notify when an analysis job finishes", default: true },
                { id: "drift-critical", label: "Critical Drift Detected", desc: "Notify when drift severity is Critical", default: true },
                { id: "drift-high", label: "High Drift Detected", desc: "Notify when drift severity is High", default: true },
                { id: "new-findings", label: "New Security Findings", desc: "Notify when critical security issues are found", default: true },
                { id: "report-ready", label: "Report Ready", desc: "Notify when a report is generated and ready to download", default: false },
                { id: "weekly-digest", label: "Weekly Digest", desc: "Weekly summary of architecture health across all repos", default: false },
              ].map(pref => (
                <div key={pref.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-zinc-200">{pref.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{pref.desc}</p>
                  </div>
                  <Switch defaultChecked={pref.default} className="data-[state=checked]:bg-indigo-600" />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
