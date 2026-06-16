"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-8 animate-slide-up">
      <h2 className="font-display font-semibold text-xl text-white mb-1">Welcome back</h2>
      <p className="text-slate-500 text-sm mb-6">Sign in to your account</p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-crimson-700/20 border border-crimson-600/40 text-crimson-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="input-label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label className="input-label">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="input pr-10"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        No account?{" "}
        <Link href="/register" className="text-gold-400 hover:text-gold-300 font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}
