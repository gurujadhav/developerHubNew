"use client";

import { useState } from "react";
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
  X,
  Key,
  Cloud,
  Zap,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5;

interface EnvVar {
  key: string;
  value: string;
  id: string;
}

interface FormData {
  name: string;
  repoUrl: string;
  pat: string;
  runCommand: string;
  port: string;
  envVars: EnvVar[];
  cfWorkersKey: string;
  cfKvNamespaceId: string;
}

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

  const [form, setForm] = useState<FormData>({
    name: "",
    repoUrl: "",
    pat: "",
    runCommand: "pnpm dev",
    port: "3000",
    envVars: [],
    cfWorkersKey: "",
    cfKvNamespaceId: "",
  });

  // PAT verification state
  const [patVerifying, setPatVerifying] = useState(false);
  const [patResult, setPatResult] = useState<{
    valid: boolean;
    githubUser?: string;
    repoName?: string;
    repoPrivate?: boolean;
    error?: string;
  } | null>(null);

  const update = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "pat" || field === "repoUrl") setPatResult(null);
  };

  const verifyPat = async () => {
    if (!form.pat) return;
    setPatVerifying(true);
    setPatResult(null);
    try {
      const res = await fetch("/api/verify-pat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pat: form.pat, repoUrl: form.repoUrl }),
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
        return form.repoUrl.trim().length > 0 && form.pat.trim().length > 0 && patResult?.valid === true;
      case 3:
        return form.runCommand.trim().length > 0 && Number(form.port) > 0;
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
          runCommand: form.runCommand,
          port: Number(form.port),
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
              <label className="input-label">GitHub Personal Access Token (PAT)</label>
              <input
                type="password"
                className="input"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={form.pat}
                onChange={(e) => update("pat", e.target.value)}
              />
              <p className="text-xs text-slate-600 mt-1.5">
                Needs <code className="text-gold-500">repo</code> scope to read private repos
              </p>
            </div>

            <button
              type="button"
              onClick={verifyPat}
              disabled={patVerifying || !form.pat || !form.repoUrl}
              className="btn-secondary text-sm"
            >
              {patVerifying ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
              {patVerifying ? "Verifying…" : "Verify PAT & repo access"}
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
                      <p className="font-medium">Verified — access confirmed</p>
                      {patResult.githubUser && (
                        <p className="text-xs opacity-80 mt-0.5">
                          GitHub user: <strong>{patResult.githubUser}</strong>
                          {patResult.repoName && <> · Repo: <strong>{patResult.repoName}</strong></>}
                          {patResult.repoPrivate && <> · Private</>}
                        </p>
                      )}
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

        {/* Step 3: Run command */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Terminal size={18} className="text-gold-500" />
              <h2 className="font-display font-semibold text-lg text-white">Run command</h2>
            </div>

            <div className="bg-navy-800/50 border border-navy-600/50 rounded-lg p-4 text-sm text-slate-400">
              <p className="font-medium text-slate-300 mb-1">Only single commands are supported</p>
              <p>Use <code className="text-gold-400">pnpm dev</code>, <code className="text-gold-400">npm run dev</code>, or a custom start script. Piped commands (<code className="text-slate-500">cmd1 && cmd2</code>) are not supported.</p>
            </div>

            <div>
              <label className="input-label">Run command</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="pnpm dev"
                value={form.runCommand}
                onChange={(e) => update("runCommand", e.target.value)}
              />
              <p className="text-xs text-slate-600 mt-1.5">
                Default: <code className="text-gold-500">pnpm dev</code>
              </p>
            </div>

            <div>
              <label className="input-label">App port</label>
              <input
                type="number"
                className="input font-mono w-32"
                placeholder="3000"
                value={form.port}
                onChange={(e) => update("port", e.target.value)}
                min={1}
                max={65535}
              />
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
                <button type="button" onClick={addEnvVar} className="btn-ghost text-xs py-1 px-2">
                  <Plus size={12} />
                  Add
                </button>
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
                { label: "Run command", value: form.runCommand, mono: true },
                { label: "Port", value: form.port, mono: true },
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
