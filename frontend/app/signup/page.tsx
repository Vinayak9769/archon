"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Hexagon, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 1. Sign up the developer
      const signupResp = await fetch("http://localhost:8080/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (signupResp.status !== 201 && signupResp.status !== 409) {
        const errData = await signupResp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to register account.");
      }

      // 2. Perform instant login to secure session token
      const loginResp = await fetch("http://localhost:8080/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!loginResp.ok) {
        throw new Error("Registration succeeded but initial login handshake failed.");
      }

      const loginData = await loginResp.json();
      localStorage.setItem("archon_auth_token", loginData.token);
      localStorage.setItem("archon_auth_email", email);

      setSuccess(true);
      setTimeout(() => {
        // Direct new developer straight to Onboarding flow!
        router.push("/onboarding");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "An unexpected registration error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-[#0a0a0b] text-zinc-100 overflow-hidden px-4">
      {/* Background Glowing Circles */}
      <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[70%] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[70%] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />

      <style jsx global>{`
        .custom-glass {
          background: rgba(13, 13, 15, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(39, 39, 42, 0.5);
        }
      `}</style>

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Branding header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Hexagon className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">Create your Archon Account</h1>
          <p className="text-xs text-zinc-500 max-w-xs">
            Start reviewing architecture drift, security risks, and scaling bottlenecks.
          </p>
        </div>

        <Card className="custom-glass shadow-2xl p-6 md:p-8 rounded-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-xs text-red-400">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 animate-pulse" />
                <span>Account ready! Launching workspace setup...</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
              <Input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                required
                placeholder="dev@acme.sh"
                className="h-10 bg-zinc-950/50 border-zinc-800 focus:border-indigo-500/50 text-sm focus:ring-0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Password</label>
              <Input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                required
                placeholder="••••••••••••"
                className="h-10 bg-zinc-950/50 border-zinc-800 focus:border-indigo-500/50 text-sm focus:ring-0"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || success}
              className="w-full mt-2 h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold gap-2 shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? "Signing up..." : "Sign Up & Continue"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </Card>

        {/* Redirect toggle */}
        <p className="text-center text-xs text-zinc-500">
          Already have a developer account?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
