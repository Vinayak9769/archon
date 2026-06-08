"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Hexagon, ArrowRight, ChevronRight, ChevronLeft,
  Building2, FileText, Sparkles, CheckCircle2, Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [logs, setLogs] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const totalSteps = 2;

  const goNext = () => {
    setDirection("next");
    setStep(s => Math.min(s + 1, totalSteps));
  };
  const goPrev = () => {
    setDirection("prev");
    setStep(s => Math.max(s - 1, 1));
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const bootstrap = async () => {
    if (isBootstrapping) return;
    setIsBootstrapping(true);
    setLogs([]);

    try {
      addLog("[SYSTEM] Initializing workspace context...");
      await sleep(500);

      addLog(`[AUTH] Registering developer account [${email}]...`);
      const signupResp = await fetch("http://localhost:8080/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (signupResp.status === 201) {
        addLog("[AUTH] Account registered (201 Created).");
      } else if (signupResp.status === 409) {
        addLog("[AUTH] Account already exists — authenticating.");
      } else {
        addLog(`[AUTH] Unexpected status ${signupResp.status} — continuing.`);
      }
      await sleep(500);

      addLog("[AUTH] Issuing cryptographic login handshake...");
      const loginResp = await fetch("http://localhost:8080/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!loginResp.ok) throw new Error(`Login failed (${loginResp.status})`);
      const loginData = await loginResp.json();
      const token = loginData.token;
      if (!token) throw new Error("No token returned.");
      localStorage.setItem("archon_auth_token", token);
      localStorage.setItem("archon_auth_email", email);
      addLog("[AUTH] JWT session active.");
      await sleep(400);

      addLog("[SYSTEM] Workspace ready. Unlocking dashboard...");
      await sleep(400);

      localStorage.setItem("archon_onboarded", "true");
      localStorage.setItem("archon_workspace_name", workspaceName || "My Workspace");

      setIsDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[ERROR] ${msg}`);
      addLog("[SYSTEM] Bypassing bootstrap — dashboard unlocked.");
      localStorage.setItem("archon_onboarded", "true");
      setIsDone(true);
    }
  };

  const finish = () => router.push("/dashboard");

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-[#0a0a0b] text-zinc-100 overflow-hidden px-4 py-8">
      {/* Background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-500/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] rounded-full bg-violet-600/8 blur-[120px] pointer-events-none" />

      <style>{`
        @keyframes slideInNext { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInPrev { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
        .slide-next { animation: slideInNext 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
        .slide-prev { animation: slideInPrev 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      <div className="w-full max-w-lg z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
            <Hexagon className="w-4 h-4 text-indigo-400" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-zinc-200">Archon</span>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map(i => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-indigo-500" : i < step ? "w-3 bg-zinc-600" : "w-3 bg-zinc-800"
              }`}
            />
          ))}
        </div>

        <Card className="bg-[#0d0d0f]/80 backdrop-blur-xl border border-zinc-800/60 shadow-2xl shadow-black/80 rounded-2xl p-7">
          {/* ── Step 1: Workspace + credentials ── */}
          {step === 1 && (
            <div className={direction === "next" ? "slide-next" : "slide-prev"}>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Step 01</span>
                <span className="text-xs text-zinc-500">Account Setup</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Welcome to Archon</h1>
              <p className="text-sm text-zinc-400 mb-7 leading-relaxed">
                The AI-powered system design platform. Set up your workspace to get started.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Workspace Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <Input
                      id="workspace-name"
                      value={workspaceName}
                      onChange={e => setWorkspaceName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="pl-10 h-10 bg-zinc-950/60 border-zinc-800 focus:border-indigo-500/50 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email</label>
                  <Input
                    id="onboarding-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="dev@acme.sh"
                    className="h-10 bg-zinc-950/60 border-zinc-800 focus:border-indigo-500/50 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Password</label>
                  <Input
                    id="onboarding-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 bg-zinc-950/60 border-zinc-800 focus:border-indigo-500/50 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-8 pt-5 border-t border-zinc-800/60">
                <Button
                  id="onboarding-continue"
                  size="sm"
                  onClick={goNext}
                  disabled={!email || !password}
                  className="h-9 px-5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 font-semibold disabled:opacity-40"
                >
                  Continue
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Bootstrap terminal ── */}
          {step === 2 && (
            <div className={direction === "next" ? "slide-next" : "slide-prev"}>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Step 02</span>
                <span className="text-xs text-zinc-500">Workspace Bootstrap</span>
              </div>

              <div className="flex flex-col items-center text-center py-4">
                {!isDone ? (
                  <>
                    <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
                      <div className="absolute inset-2 rounded-full border border-violet-500/30 animate-pulse" />
                      <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/60 flex items-center justify-center">
                        <Terminal className="w-5 h-5 text-indigo-400 animate-pulse" />
                      </div>
                    </div>
                    <h2 className="text-lg font-bold text-white mb-1">Bootstrapping Platform</h2>
                    <p className="text-xs text-zinc-500 mb-5">Creating your account and initializing the workspace.</p>
                    {!isBootstrapping && (
                      <Button
                        id="bootstrap-start"
                        size="sm"
                        onClick={bootstrap}
                        className="h-9 px-5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 font-semibold"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Initialize Workspace
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="relative w-14 h-14 mb-5 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-pulse" />
                      <CheckCircle2 className="w-9 h-9 text-emerald-400 z-10" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-1">Workspace Ready!</h2>
                    <p className="text-xs text-zinc-500 mb-5">
                      You&apos;re all set. Start your first system design from the dashboard.
                    </p>
                  </>
                )}

                {/* Terminal log */}
                {logs.length > 0 && (
                  <div className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5 font-mono text-[10px] text-left text-zinc-400 h-36 flex flex-col justify-end mb-4">
                    <div className="space-y-1 overflow-y-auto max-h-full">
                      {logs.map((log, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-1.5 ${i === logs.length - 1 ? "text-indigo-300" : "text-zinc-500"}`}
                        >
                          <span className="text-zinc-700 select-none">&gt;</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isDone && (
                  <Button
                    id="enter-dashboard"
                    onClick={finish}
                    className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    Enter Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {!isDone && (
                <div className="flex justify-start mt-4 pt-4 border-t border-zinc-800/60">
                  <Button variant="ghost" size="sm" onClick={goPrev} className="h-8 text-xs text-zinc-400 gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        <p className="text-center text-xs text-zinc-600 mt-5">
          Already have an account?{" "}
          <button onClick={() => router.push("/login")} className="text-indigo-400 hover:text-indigo-300 underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
