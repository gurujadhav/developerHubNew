"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Github,
  Loader2,
  Plus,
  Terminal,
  Trash2,
  Upload,
  X,
  Key,
  Cloud,
  Zap,
} from "lucide-react";
import { parseEnvFile } from "@/lib/envParse";

type Step = 1 | 2 | 3 | 4 | 5;

interface EnvVar {
  key: string;
  value: string;
  id: string;
}

type RunMode = "sequential" | "parallel";

interface FormData {
  name: string;
  repoUrl: string;
  pat: string;
  runCommands: string[];
  runMode: RunMode;
  ports: string[];
  envVars: EnvVar[];
  cfWorkersKey: string;
  cfKvNamespaceId: string;
}

const MAX_LIST = 5;

const STEPS = [
  { num: 1 as Step, label: "Basics" },
  { num: 2 as Step, label: "Repository" },
  { num: 3 as Step, label: "Run command" },
  { num: 4 as Step, label: "Environment" },
  { num: 5 as Step, label: "Deploy" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState("");
  const envFileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    name: "",
    repoUrl: "",
    pat: "",
    runCommands: ["pnpm dev"],
    runMode: "sequential",
    ports: ["3000"],
    envVars: [],
    cfWorkersKey: "",
    cfKvNamespaceId: "",
  });

  // Repo / PAT verification state
  const [patVerifying, setPatVerifying] = useState(false);
  const [patResult, setPatResult] = useState<{
    valid: boolean;
    githubUser?: string;
    repoName?: string;
    repoPrivate?: boolean;
    repoPublic?: boolean;
    needsPat?: boolean;
    error?: string;
  } | null>(null);

  const update = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "pat" || field === "repoUrl") setPatResult(null);
  };

  type ListField = "runCommands" | "ports";
  const updateListItem = (field: ListField, i: number, value: string) =>
    setForm((f) => ({ ...f, [field]: f[field].map((v, idx) => (idx === i ? value : v)) }));
  const addListItem = (field: ListField) =>
    setForm((f) => (f[field].length >= MAX_LIST ? f : { ...f, [field]: [...f[field], ""] }));
  const removeListItem = (field: ListField, i: number) =>
    setForm((f) =>
      f[field].length <= 1 ? f : { ...f, [field]: f[field].filter((_, idx) => idx !== i) }
    );

  const verifyRepo = async () => {
    if (!form.repoUrl) return;
    setPatVerifying(true);
    setPatResult(null);
    try {
      const res = await fetch("/api/verify-pat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pat: form.pat || undefined, repoUrl: form.repoUrl }),
      });
      const data = await res.json();
      setPatResult(data);
    } catch {
      setPatResult({ valid: false, error: "Verification failed — network error" });
    } finally {
      setPatVerifying(false);
    }
  };

  const addEnvVar = () => {
    setForm((f) => ({
      ...f,
      envVars: [...f.envVars, { key: "", value: "", id: Math.random().toString(36).slice(2) }],
    }));
  };

  const importEnvFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseEnvFile(text);
    if (parsed.length === 0) return;
    setForm((f) => {
      const byKey = new Map(f.envVars.map((v) => [v.key, v]));
      for (const { key, value } of parsed) {
        const existing = byKey.get(key);
        if (existing) existing.value = value;
        else
          byKey.set(key, { key, value, id: Math.random().toString(36).slice(2) });
      }
      return { ...f, envVars: Array.from(byKey.values()) };
    });
  };

  const updateEnvVar = (id: string, field: "key" | "value", value: string) => {
    setForm((f) => ({
      ...f,
      envVars: f.envVars.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    }));
  };

  const removeEnvVar = (id: string) => {
    setForm((f) => ({ ...f, envVars: f.envVars.filter((v) => v.id !== id) }));
  };

  const canNext = () => {
    switch (step) {
      case 1:
        return form.name.trim().length >= 1;
      case 2:
        return form.repoUrl.trim().length > 0 && patResult?.valid === true;
      case 3:
        return (
          form.runCommands.some((c) => c.trim().length > 0) &&
          form.ports.some((p) => Number(p) > 0)
        );
      case 4:
        return true; // env vars optional
      default:
        return true;
    }
  };

  const handleDeploy = async () => {
    setError("");
    setDeploying(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          repoUrl: form.repoUrl,
          pat: form.pat,
          runCommands: form.runCommands.map((c) => c.trim()).filter(Boolean),
          runMode: form.runMode,
          ports: form.ports.map((p) => Number(p)).filter((p) => p > 0),
          envVars: form.envVars
            .filter((v) => v.key.trim())
            .map(({ key, value }) => ({ key: key.trim(), value })),
          cfWorkersKey: form.cfWorkersKey || undefined,
          cfKvNamespaceId: form.cfKvNamespaceId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Deployment failed");
        return;
      }
      router.push(`/projects/${data.project.id}`);
    } catch {
      setError("Network error — please try again");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-display font-bold text-2xl text-white">New Project</h1>
          <p className="text-slate-500 text-sm">Deploy a Next.js app from GitHub</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map(({ num, label }, i) => (
          <div key={num} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === num
                    ? "bg-gold-500 text-navy-950"
                    : step > num
                    ? "bg-emerald-600 text-white"
                    : "bg-navy-700 text-slate-500"
                }`}
              >
                {step > num ? <Check size={12} /> : num}
              </div>
              <span
                className={`text-xs hidden sm:block ${
                  step === num ? "text-gold-400" : step > num ? "text-emerald-500" : "text-slate-600"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-10 sm:w-16 mx-1 mb-4 transition-all ${
                  step > num ? "bg-emerald-600" : "bg-navy-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="card p-6 animate-slide-up">
        {/* Step 1: Project name */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-gold-500" />
              <h2 className="font-display font-semibold text-lg text-white">Name your project</h2>
            </div>
            <div>
              <label className="input-label">Project name</label>
              <input
                type="text"
                className="input"
                placeholder="my-nextjs-app"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                autoFocus
                maxLength={60}
              />
              <p className="text-xs text-slate-600 mt-1.5">
                Used to identify your project in the dashboard
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Repository + PAT */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Github size={18} className="text-gold-500" />
              <h2 className="font-display font-semibold text-lg text-white">Connect your repo</h2>
            </div>

            <div>
              <label className="input-label">GitHub repository URL</label>
              <input
                type="url"
                className="input"
                placeholder="https://github.com/username/repo"
                value={form.repoUrl}
                onChange={(e) => update("repoUrl", e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">
                GitHub Personal Access Token (PAT){" "}
                <span className="text-slate-600 font-normal normal-case">
                  (only for private repos)
                </span>
              </label>
              <input
                type="password"
                className="input"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={form.pat}
                onChange={(e) => update("pat", e.target.value)}
              />
              <p className="text-xs text-slate-600 mt-1.5">
                Public repos clone without a token. For private repos, use a PAT with{" "}
                <code className="text-gold-500">repo</code> scope.
              </p>
            </div>

            <button
              type="button"
              onClick={verifyRepo}
              disabled={patVerifying || !form.repoUrl}
              className="btn-secondary text-sm"
            >
              {patVerifying ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
              {patVerifying ? "Checking…" : "Check repository access"}
            </button>

            {patResult && (
              <div
                className={`px-4 py-3 rounded-lg text-sm border ${
                  patResult.valid
                    ? "bg-emerald-900/20 border-emerald-700/40 text-emerald-400"
                    : "bg-crimson-700/20 border-crimson-600/40 text-crimson-400"
                }`}
              >
                {patResult.valid ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {patResult.repoPublic
                          ? "Public repository — no token required"
                          : "Verified — private repo access confirmed"}
                      </p>
                      <p className="text-xs opacity-80 mt-0.5">
                        {patResult.githubUser && (
                          <>
                            GitHub user: <strong>{patResult.githubUser}</strong>
                            {patResult.repoName && " · "}
                          </>
                        )}
                        {patResult.repoName && (
                          <>
                            Repo: <strong>{patResult.repoName}</strong>
                          </>
                        )}
                        {patResult.repoPublic ? <> · Public</> : patResult.repoPrivate && <> · Private</>}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <X size={14} className="shrink-0 mt-0.5" />
                    <p>{patResult.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Run commands + ports */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={18} className="text-gold-500" />
              <h2 className="font-display font-semibold text-lg text-white">Run commands & ports</h2>
            </div>

            {/* Run mode */}
            {form.runCommands.length > 1 && (
              <div>
                <label className="input-label">Run mode</label>
                <div className="flex gap-2">
                  {(["sequential", "parallel"] as RunMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, runMode: m }))}
                      className={`flex-1 text-sm py-2 rounded-lg border transition-colors ${
                        form.runMode === m
                          ? "border-gold-500/50 bg-gold-500/10 text-gold-400"
                          : "border-navy-600 text-slate-400 hover:border-navy-500"
                      }`}
                    >
                      {m === "sequential" ? "Sequential (one by one)" : "Parallel (all at once)"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-1.5">
                  Sequential runs <code className="text-gold-500">cmd1 &amp;&amp; cmd2</code>; parallel starts them together.
                </p>
              </div>
            )}

            {/* Run commands */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="input-label mb-0">Run command(s)</label>
                <button
                  type="button"
                  onClick={() => addListItem("runCommands")}
                  disabled={form.runCommands.length >= MAX_LIST}
                  className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"
                >
                  <Plus size={12} />
                  Add command
                </button>
              </div>
              <div className="space-y-2">
                {form.runCommands.map((cmd, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      className="input font-mono flex-1"
                      placeholder="pnpm dev"
                      value={cmd}
                      onChange={(e) => updateListItem("runCommands", i, e.target.value)}
                    />
                    {form.runCommands.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeListItem("runCommands", i)}
                        className="btn-ghost p-2 text-slate-600 hover:text-crimson-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                Up to {MAX_LIST}. Use single commands — the platform combines them per the run mode.
              </p>
            </div>

            {/* Ports */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="input-label mb-0">Port(s)</label>
                <button
                  type="button"
                  onClick={() => addListItem("ports")}
                  disabled={form.ports.length >= MAX_LIST}
                  className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"
                >
                  <Plus size={12} />
                  Add port
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.ports.map((p, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <input
                      type="number"
                      className="input font-mono w-28"
                      placeholder="3000"
                      value={p}
                      min={1}
                      max={65535}
                      onChange={(e) => updateListItem("ports", i, e.target.value)}
                    />
                    {form.ports.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeListItem("ports", i)}
                        className="btn-ghost p-2 text-slate-600 hover:text-crimson-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                Each port gets its own public tunnel URL (max {MAX_LIST}).
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Env vars + CF keys */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Cloud size={18} className="text-gold-500" />
              <h2 className="font-display font-semibold text-lg text-white">Environment & Cloudflare</h2>
            </div>

            {/* Env vars */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="input-label mb-0">Environment variables</label>
                <div className="flex items-center gap-1">
                  <input
                    ref={envFileRef}
                    type="file"
                    accept=".env,.txt,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) importEnvFile(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => envFileRef.current?.click()}
                    className="btn-ghost text-xs py-1 px-2"
                  >
                    <Upload size={12} />
                    Upload .env
                  </button>
                  <button type="button" onClick={addEnvVar} className="btn-ghost text-xs py-1 px-2">
                    <Plus size={12} />
                    Add
                  </button>
                </div>
              </div>

              {form.envVars.length === 0 ? (
                <div
                  onClick={addEnvVar}
                  className="border border-dashed border-navy-600 rounded-lg p-4 text-center text-slate-600 text-sm cursor-pointer hover:border-gold-500/30 hover:text-slate-500 transition-colors"
                >
                  Click to add environment variables
                </div>
              ) : (
                <div className="space-y-2">
                  {form.envVars.map((env) => (
                    <div key={env.id} className="flex gap-2">
                      <input
                        type="text"
                        className="input flex-1 text-xs"
                        placeholder="KEY"
                        value={env.key}
                        onChange={(e) => updateEnvVar(env.id, "key", e.target.value)}
                      />
                      <input
                        type="text"
                        className="input flex-[2] text-xs"
                        placeholder="value"
                        value={env.value}
                        onChange={(e) => updateEnvVar(env.id, "value", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeEnvVar(env.id)}
                        className="btn-ghost p-2 text-slate-600 hover:text-crimson-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="divider" />

            {/* CF Workers key */}
            <div>
              <label className="input-label">
                Cloudflare Workers API Token{" "}
                <span className="text-slate-600 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="password"
                className="input"
                placeholder="Your CF Workers API token"
                value={form.cfWorkersKey}
                onChange={(e) => update("cfWorkersKey", e.target.value)}
              />
              <p className="text-xs text-slate-600 mt-1.5">
                If provided, your project gets a stable Cloudflare subdomain. Otherwise, a shared quick-tunnel URL is assigned.
              </p>
            </div>

            {form.cfWorkersKey && (
              <div>
                <label className="input-label">
                  KV Namespace ID{" "}
                  <span className="text-slate-600 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={form.cfKvNamespaceId}
                  onChange={(e) => update("cfKvNamespaceId", e.target.value)}
                />
                <p className="text-xs text-slate-600 mt-1.5">
                  The KV namespace where the tunnel URL is stored for your CF Worker
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & deploy */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-gold-500" />
              <h2 className="font-display font-semibold text-lg text-white">Review & deploy</h2>
            </div>

            <div className="bg-navy-800/50 border border-navy-600/50 rounded-lg divide-y divide-navy-700/40">
              {[
                { label: "Project", value: form.name },
                {
                  label: "Repository",
                  value: form.repoUrl.replace("https://github.com/", ""),
                },
                {
                  label: "Run command(s)",
                  value: (() => {
                    const cmds = form.runCommands.map((c) => c.trim()).filter(Boolean);
                    return cmds.length > 1
                      ? `${cmds.length} (${form.runMode})`
                      : cmds[0] || "pnpm dev";
                  })(),
                  mono: true,
                },
                {
                  label: form.ports.length > 1 ? "Ports" : "Port",
                  value: form.ports.map((p) => p.trim()).filter(Boolean).join(", "),
                  mono: true,
                },
                {
                  label: "Env vars",
                  value: form.envVars.filter((v) => v.key.trim()).length
                    ? `${form.envVars.filter((v) => v.key.trim()).length} variable(s)`
                    : "None",
                },
                {
                  label: "Cloudflare",
                  value: form.cfWorkersKey ? "Custom CF token provided" : "Shared quick-tunnel",
                },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className={`text-white font-medium ${mono ? "font-mono" : ""}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg bg-crimson-700/20 border border-crimson-600/40 text-crimson-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleDeploy}
              disabled={deploying}
              className="btn-primary w-full justify-center"
            >
              {deploying ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Zap size={16} />
              )}
              {deploying ? "Triggering deployment…" : "Deploy project"}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 5 && (
        <div className="flex justify-between">
          <button
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
            disabled={step === 1}
            className="btn-ghost"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            onClick={() => setStep((s) => ((s + 1) as Step))}
            disabled={!canNext()}
            className="btn-primary"
          >
            Continue
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
