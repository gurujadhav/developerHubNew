"use client";

import { useEffect, useState } from "react";
import { Cloud, Loader2, Save, CheckCircle2, Eye, EyeOff, Info } from "lucide-react";

interface User {
  name: string;
  email: string;
  cfWorkersKey: string | null;
  cfAccountId: string | null;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ cfWorkersKey: "", cfAccountId: "" });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        setForm({
          cfWorkersKey: d.user?.cfWorkersKey ?? "",
          cfAccountId: d.user?.cfAccountId ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cfWorkersKey: form.cfWorkersKey || null,
          cfAccountId: form.cfAccountId || null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Account and integration settings</p>
      </div>

      {/* Account info */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Account</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-navy-700/40">
            <span className="text-sm text-slate-500">Name</span>
            <span className="text-sm text-white">{user?.name}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-slate-500">Email</span>
            <span className="text-sm text-white font-mono">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Cloudflare */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Cloud size={16} className="text-gold-500" />
          <h2 className="section-title">Cloudflare (default)</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          These keys are used for all your projects unless a project overrides them. If left empty, a shared Cloudflare quick-tunnel is used (URL changes on each restart).
        </p>

        <div className="bg-navy-800/40 border border-navy-600/40 rounded-lg p-3 flex items-start gap-2 mb-5 text-xs text-slate-500">
          <Info size={13} className="text-gold-500/70 shrink-0 mt-0.5" />
          <p>
            You need a Cloudflare Workers API token with <code className="text-gold-400">Workers KV Storage:Edit</code> permission, and a KV namespace set up at the project level.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="input-label">CF Workers / Tunnel API Token (securely encrypted / write-only)</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                className="input pr-10"
                placeholder="Your Cloudflare Workers API token"
                value={form.cfWorkersKey}
                onChange={(e) => setForm({ ...form, cfWorkersKey: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">CF Account ID</label>
            <input
              type="text"
              className="input font-mono"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={form.cfAccountId}
              onChange={(e) => setForm({ ...form, cfAccountId: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saved ? (
              <CheckCircle2 size={14} />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
          </button>
          {saved && (
            <span className="text-sm text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={13} />
              Settings updated
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
