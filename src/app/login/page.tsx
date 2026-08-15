"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split("@")[0] } },
        });
        if (error) throw error;
        setInfo("Account created. If email confirmation is required, check your inbox — otherwise you're all set, log in below.");
        setMode("login");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* left: pitch */}
      <div className="hidden md:flex flex-col justify-between bg-ink text-white p-12">
        <div>
          <div className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center font-bold">D</div>
            <span className="text-lg font-semibold">DipBuy</span>
          </div>
          <h1 className="text-4xl font-semibold leading-tight mb-6">
            Invest on the dips.<br />Automatically tracked.<br />Never on impulse.
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-md">
            A disciplined, rules-based way to build positions in indices, ETFs, and stocks —
            money accrues daily, and you only deploy it when the market actually gives you a discount.
          </p>
        </div>
        <div className="space-y-4">
          <Feature title="Set your own pace" body="Every instrument accrues its own daily amount — raise or lower it any time, effective from a date you choose." />
          <Feature title="You stay in control" body="Nothing invests itself. Every recommendation is a nudge, not a transaction — you confirm every rupee." />
          <Feature title="One view, every account" body="Track Nifty, Sensex, gold, silver, and individual stocks together, with your family's HUF and trust labels kept straight." />
        </div>
      </div>

      {/* right: auth form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-white">D</div>
            <span className="text-lg font-semibold">DipBuy</span>
          </div>

          <h2 className="text-2xl font-semibold mb-1">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p className="text-muted text-sm mb-6">
            {mode === "login" ? "Log in to see your accrued pots and portfolio." : "No KYC, no paperwork — just an email and a password."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-medium text-muted block mb-1">Your name</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Manish" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">Password</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {error && <div className="text-sm text-down bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            {info && <div className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">{info}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>

          <p className="text-sm text-muted mt-6 text-center">
            {mode === "login" ? (
              <>New here? <button className="text-brand-600 font-semibold" onClick={() => setMode("signup")}>Create an account</button></>
            ) : (
              <>Already have an account? <button className="text-brand-600 font-semibold" onClick={() => setMode("login")}>Log in</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-white/10 pt-4">
      <div className="font-medium mb-1">{title}</div>
      <div className="text-sm text-white/50 leading-relaxed">{body}</div>
    </div>
  );
}
