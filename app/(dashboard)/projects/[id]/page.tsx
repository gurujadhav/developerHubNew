"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  ExternalLink,
  GitBranch,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Terminal,
  Trash2,
  Upload,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { parseEnvFile } from "@/lib/envParse";
import AfterScriptEditor, { AfterScriptValue } from "@/components/AfterScriptEditor";

type RunMode = "sequential" | "parallel";

interface Project {
  _id: string;
  name: string;
  repoUrl: string;
  branch?: string;
  runCommand: string;
  runCommands?: string[];
  runMode?: RunMode;
  port: number;
  ports?: number[];
  envVars: Array<{ key: string; value: string }>;
  cfSubdomain: string | null;
  afterStart?: AfterScriptValue;
  afterStop?: AfterScriptValue;
  status: string;
  outputLink: string | null;
  outputLinks?: Array<{ port: number; url: string }>;
  activeWorkflow: number | null;
  activeWorkflowRunId: string | null;
  deployedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  portMappings?: Array<{ port: number; domain: string }>;
}

interface EnvRow {
  key: string;
  value: string;
  id: string;
}

interface EditForm {
  name: string;
  branch: string;
  runCommands: string[];
  runMode: RunMode;
  ports: string[];
  envVars: EnvRow[];
  afterStart: AfterScriptValue;
  afterStop: AfterScriptValue;
  portMappings: Array<{ port: string; domain: string; id: string }>;
}

const MAX_LIST = 5;

const rowId = () => Math.random().toString(36).slice(2);

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: "badge-running",
    deploying: "badge-deploying",
    failed: "badge-failed",
    pending: "badge-pending",
    stopped: "badge-stopped",
  };
  const icons: Record<string, React.ReactNode> = {
    running: <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />,
    deploying: <Loader2 size={10} className="animate-spin" />,
    failed: <AlertTriangle size={10} />,
  };
  return (
    <span className={`${map[status] ?? "badge badge-pending"} text-sm px-3 py-1.5`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
      {status === "deploying" && "…"}
    </span>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-navy-700/40 last:border-0 gap-4">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <div className="text-sm text-white text-right">{children}</div>
    </div>
  );
}

export default function ProjectPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [redeploying, setRedeploying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [form, setForm] = useState<EditForm | null>(null);
  const envFileRef = useRef<HTMLInputElement>(null);

  // Logs state
  const [logs, setLogs] = useState<string>("");
  const [logInterval, setLogInterval] = useState<"live" | "minute">("minute");
  const [loadingLogs, setLoadingLogs] = useState(true);
  const terminalRef = useRef<HTMLPreElement>(null);

  const fetchProject = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        router.push("/projects");
        return;
      }
      const data = await res.json();
      setProject(data.project);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    const interval = setInterval(() => fetchProject(true), 10000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout;

    const fetchLogs = async () => {
      const isVisible = typeof document !== "undefined" && document.visibilityState === "visible";
      if (!isVisible) return;

      try {
        const isLive = logInterval === "live";
        const url = `/api/projects/${id}/logs${isLive ? "?live=true" : ""}`;
        const res = await fetch(url);
        if (res.ok && active) {
          const data = await res.json();
          setLogs(data.logs || "");
        }
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        if (active) setLoadingLogs(false);
      }
    };

    fetchLogs();

    const intervalMs = logInterval === "live" ? 3000 : 60000;
    timer = setInterval(fetchLogs, intervalMs);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchLogs();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [id, logInterval]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      router.push("/projects");
    } finally {
      setDeleting(false);
    }
  };

  const handleRedeploy = async () => {
    setRedeploying(true);
    try {
      const res = await fetch(`/api/projects/${id}/redeploy`, { method: "POST" });
      if (res.ok) await fetchProject(true);
    } finally {
      setRedeploying(false);
    }
  };

  // ── Edit handlers ──────────────────────────────────────────────────────────
  const startEdit = () => {
    if (!project) return;
    setSaveError("");
    setForm({
      name: project.name,
      branch: project.branch || "main",
      runCommands:
        project.runCommands?.length ? project.runCommands : [project.runCommand || "pnpm dev"],
      runMode: project.runMode ?? "sequential",
      ports: (project.ports?.length ? project.ports : [project.port]).map(String),
      envVars: project.envVars.map((v) => ({ ...v, id: rowId() })),
      afterStart: {
        commands: project.afterStart?.commands ?? [],
        file: project.afterStart?.file ?? "",
      },
      afterStop: {
        commands: project.afterStop?.commands ?? [],
        file: project.afterStop?.file ?? "",
      },
      portMappings: (project.portMappings ?? []).map((m) => ({
        port: String(m.port),
        domain: m.domain,
        id: rowId(),
      })),
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
  };

  type ListField = "runCommands" | "ports";
  const updateListItem = (field: ListField, i: number, value: string) =>
    setForm((f) => (f ? { ...f, [field]: f[field].map((v, idx) => (idx === i ? value : v)) } : f));
  const addListItem = (field: ListField) =>
    setForm((f) =>
      f && f[field].length < MAX_LIST ? { ...f, [field]: [...f[field], ""] } : f
    );
  const removeListItem = (field: ListField, i: number) =>
    setForm((f) =>
      f && f[field].length > 1 ? { ...f, [field]: f[field].filter((_, idx) => idx !== i) } : f
    );

  const addEnvVar = () =>
    setForm((f) =>
      f ? { ...f, envVars: [...f.envVars, { key: "", value: "", id: rowId() }] } : f
    );

  const updateEnvVar = (rid: string, field: "key" | "value", value: string) =>
    setForm((f) =>
      f
        ? {
            ...f,
            envVars: f.envVars.map((v) => (v.id === rid ? { ...v, [field]: value } : v)),
          }
        : f
    );

  const removeEnvVar = (rid: string) =>
    setForm((f) => (f ? { ...f, envVars: f.envVars.filter((v) => v.id !== rid) } : f));

  const importEnvFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseEnvFile(text);
    if (parsed.length === 0) return;
    setForm((f) => {
      if (!f) return f;
      const byKey = new Map(f.envVars.map((v) => [v.key, v]));
      for (const { key, value } of parsed) {
        const existing = byKey.get(key);
        if (existing) existing.value = value;
        else byKey.set(key, { key, value, id: rowId() });
      }
      return { ...f, envVars: Array.from(byKey.values()) };
    });
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          branch: form.branch.trim() || "main",
          runCommands: form.runCommands.map((c) => c.trim()).filter(Boolean),
          runMode: form.runMode,
          ports: form.ports.map((p) => Number(p)).filter((p) => p > 0),
          envVars: form.envVars
            .filter((v) => v.key.trim())
            .map(({ key, value }) => ({ key: key.trim(), value })),
          afterStart: form.afterStart,
          afterStop: form.afterStop,
          portMappings: form.portMappings
            .filter((m) => m.domain.trim() && Number(m.port) > 0)
            .map((m) => ({ port: Number(m.port), domain: m.domain.trim() })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || "Failed to save changes");
        return;
      }
      await fetchProject(true);
      setEditing(false);
      setForm(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={20} className="text-gold-500 animate-spin" />
      </div>
    );
  }

  const canRedeploy = project.status !== "deploying";

  // Prefer the per-port outputLinks; fall back to the legacy single outputLink.
  const liveLinks: Array<{ port: number; url: string }> =
    project.outputLinks && project.outputLinks.length > 0
      ? project.outputLinks
      : project.outputLink
      ? [{ port: project.ports?.[0] ?? project.port, url: project.outputLink }]
      : [];

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="btn-ghost p-2">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display font-bold text-2xl text-white">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm font-mono flex-wrap">
              <span>{project.repoUrl.replace("https://github.com/", "github.com/")}</span>
              <span className="text-slate-700">•</span>
              <span className="flex items-center gap-1">
                <GitBranch size={14} />
                <span>{project.branch || "main"}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editing && canRedeploy && (
            <button
              onClick={handleRedeploy}
              disabled={redeploying}
              className="btn-secondary text-sm"
              title="Pull the latest code and redeploy"
            >
              {redeploying ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              {redeploying ? "Redeploying…" : "Redeploy"}
            </button>
          )}
          {!editing && (
            <button onClick={startEdit} className="btn-ghost text-sm" title="Edit configuration">
              <Pencil size={14} />
              Edit
            </button>
          )}
          <button
            onClick={() => fetchProject(true)}
            className="btn-ghost p-2"
            title="Refresh status"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Live URLs (one per port) */}
      {liveLinks.length > 0 && (
        <div className="card p-4 border-gold-500/20 bg-navy-800/30 space-y-3">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            {liveLinks.length > 1 ? "Live URLs" : "Live URL"}
          </p>
          {liveLinks.map((link) => {
            const mapping = project.portMappings?.find((m) => m.port === link.port);
            const customDomain = mapping ? mapping.domain : "";
            return (
              <div key={`${link.port}-${link.url}`} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 font-mono">port {link.port}</p>
                    {customDomain && (
                      <span className="text-[10px] bg-gold-500/10 border border-gold-500/20 text-gold-400 px-1.5 py-0.5 rounded font-mono">
                        CF Custom Domain Mapped
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-sm text-gold-400 truncate">{link.url}</p>
                  {customDomain && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <span>Custom domain:</span>
                      <a
                        href={`https://${customDomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono hover:text-gold-300 hover:underline transition-colors flex items-center gap-0.5"
                      >
                        {customDomain}
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm shrink-0"
                >
                  <ExternalLink size={14} />
                  Open
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* Failure message */}
      {project.status === "failed" && !editing && (
        <div className="card p-4 border-crimson-600/30 bg-crimson-700/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle size={15} className="text-crimson-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-crimson-400">Deployment failed</p>
                <p className="text-sm text-crimson-300/80 mt-0.5">
                  {project.failureReason ?? "The deployment did not complete."}
                </p>
              </div>
            </div>
            <button
              onClick={handleRedeploy}
              disabled={redeploying}
              className="btn-primary text-sm shrink-0"
            >
              {redeploying ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              {redeploying ? "Redeploying…" : "Redeploy"}
            </button>
          </div>
        </div>
      )}

      {/* Deploying status */}
      {project.status === "deploying" && (
        <div className="card p-4 border-gold-500/20 bg-gold-500/5">
          <div className="flex items-center gap-3">
            <Zap size={15} className="text-gold-500 animate-pulse-slow" />
            <div>
              <p className="text-sm font-semibold text-gold-400">Deployment in progress</p>
              <p className="text-sm text-slate-500 mt-0.5">
                The deployment system is setting up your server and public URL. This can take 2–5 minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {editing && form ? (
        /* ── Edit form ──────────────────────────────────────────────────────── */
        <div className="card p-5 space-y-5 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="section-title mb-0">Edit configuration</h3>
            <button onClick={cancelEdit} className="btn-ghost p-1.5" title="Cancel">
              <X size={16} />
            </button>
          </div>

          <div>
            <label className="input-label">Project name</label>
            <input
              className="input"
              value={form.name}
              maxLength={60}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="input-label">Branch to deploy from</label>
            <input
              className="input font-mono"
              value={form.branch}
              placeholder="main"
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
            />
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
                    onClick={() => setForm({ ...form, runMode: m })}
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
                Add
              </button>
            </div>
            <div className="space-y-2">
              {form.runCommands.map((cmd, i) => (
                <div key={i} className="flex gap-2">
                  <input
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
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.ports.map((p, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    className="input font-mono w-28"
                    placeholder="3000"
                    value={p}
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
          </div>

          {/* Port mappings (custom domains) */}
          <div className="space-y-3">
            <label className="input-label mb-1">Custom domains per port (optional)</label>
            <p className="text-xs text-slate-500 mb-2">
              Route a custom domain to each mapped port (e.g. labs.test.testifysamples.com).
            </p>
            <div className="space-y-2">
              {form.ports.map((portStr) => {
                const portVal = Number(portStr);
                if (isNaN(portVal) || portVal <= 0) return null;
                const mapping = form.portMappings.find((m) => Number(m.port) === portVal);
                const domainVal = mapping ? mapping.domain : "";
                return (
                  <div key={portStr} className="flex gap-3 items-center">
                    <span className="font-mono text-xs text-slate-500 w-20 shrink-0">port {portStr} ➔</span>
                    <input
                      type="text"
                      className="input flex-1 text-xs font-mono"
                      placeholder="e.g. labs.test.testifysamples.com"
                      value={domainVal}
                      onChange={(e) => {
                        const newDomain = e.target.value.trim();
                        setForm((f) => {
                          if (!f) return f;
                          const filtered = f.portMappings.filter((m) => Number(m.port) !== portVal);
                          if (newDomain) {
                            filtered.push({ port: portStr, domain: newDomain, id: rowId() });
                          }
                          return { ...f, portMappings: filtered };
                        });
                      }}
                    />
                  </div>
                );
              })}
            </div>
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
                Add variables manually or upload a .env file
              </div>
            ) : (
              <div className="space-y-2">
                {form.envVars.map((env) => (
                  <div key={env.id} className="flex gap-2">
                    <input
                      className="input flex-1 text-xs font-mono"
                      placeholder="KEY"
                      value={env.key}
                      onChange={(e) => updateEnvVar(env.id, "key", e.target.value)}
                    />
                    <input
                      className="input flex-[2] text-xs font-mono"
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

          {/* After-scripts */}
          <div className="space-y-3">
            <label className="input-label mb-0">After-scripts</label>
            <AfterScriptEditor
              label="After app starts"
              hint="Runs once after the app is healthy (migrations, seeding, warm-up). One-shot."
              value={form.afterStart}
              onChange={(v) => setForm({ ...form, afterStart: v })}
            />
            <AfterScriptEditor
              label="On teardown (stop / fail / rotate)"
              hint="Runs on teardown (cleanup, notifications). Best-effort."
              value={form.afterStop}
              onChange={(v) => setForm({ ...form, afterStop: v })}
            />
          </div>

          <p className="text-xs text-slate-500">
            Saving stores your changes. Click <strong className="text-slate-300">Redeploy</strong>{" "}
            afterwards to apply them to the running app and pull the latest code.
          </p>

          {saveError && (
            <div className="px-4 py-3 rounded-lg bg-crimson-700/20 border border-crimson-600/40 text-crimson-400 text-sm">
              {saveError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button onClick={cancelEdit} disabled={saving} className="btn-ghost text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ── View mode ──────────────────────────────────────────────────────── */
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Config */}
          <div className="card p-5">
            <h3 className="section-title mb-3">Configuration</h3>
            <div>
              <InfoRow label={(project.runCommands?.length ?? 1) > 1 ? "Run commands" : "Run command"}>
                <div className="flex flex-col items-end gap-0.5">
                  {(project.runCommands?.length ? project.runCommands : [project.runCommand]).map(
                    (c, i) => (
                      <code key={i} className="font-mono text-gold-400 text-xs">
                        {c}
                      </code>
                    )
                  )}
                  {(project.runCommands?.length ?? 1) > 1 && (
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                      {project.runMode ?? "sequential"}
                    </span>
                  )}
                </div>
              </InfoRow>
              <InfoRow label={(project.ports?.length ?? 1) > 1 ? "Ports" : "Port"}>
                <code className="font-mono">
                  {(project.ports?.length ? project.ports : [project.port]).join(", ")}
                </code>
              </InfoRow>
              <InfoRow label="Env variables">
                {project.envVars.length > 0
                  ? `${project.envVars.length} variable${project.envVars.length !== 1 ? "s" : ""}`
                  : "None"}
              </InfoRow>
              <InfoRow label="CF subdomain">
                {project.cfSubdomain ?? <span className="text-slate-600">Quick-tunnel (auto)</span>}
              </InfoRow>
            </div>
          </div>

          {/* Runtime */}
          <div className="card p-5">
            <h3 className="section-title mb-3">Runtime</h3>
            <div>
              <InfoRow label="Active server">
                {project.activeWorkflow ? (
                  <span className="flex items-center gap-1.5 justify-end">
                    <Workflow size={12} className="text-gold-500" />
                    Server {project.activeWorkflow}
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </InfoRow>
              <InfoRow label="Deployed at">
                {project.deployedAt ? (
                  <span className="flex items-center gap-1.5 justify-end">
                    <Clock size={12} className="text-slate-500" />
                    {new Date(project.deployedAt).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </InfoRow>
              <InfoRow label="Created">
                {new Date(project.createdAt).toLocaleDateString()}
              </InfoRow>
              <InfoRow label="Last updated">
                {new Date(project.updatedAt).toLocaleString()}
              </InfoRow>
            </div>
          </div>
        </div>
      )}

      {/* Logs Console */}
      {!editing && (
        <div className="card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-700/40 pb-4">
            <div className="flex items-center gap-2">
              <Terminal size={18} className="text-gold-500" />
              <h3 className="section-title mb-0">App Logs Console</h3>
              {logInterval === "live" ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/25 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live updates (3s)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-navy-800/60 px-2 py-0.5 rounded border border-navy-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Sleep mode (1 min)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogInterval("minute")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  logInterval === "minute"
                    ? "border-gold-500/30 bg-gold-500/15 text-gold-400"
                    : "border-navy-600 bg-transparent text-slate-400 hover:border-navy-500 hover:text-slate-300"
                }`}
              >
                1 min logs
              </button>
              <button
                onClick={() => setLogInterval("live")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  logInterval === "live"
                    ? "border-gold-500/30 bg-gold-500/15 text-gold-400"
                    : "border-navy-600 bg-transparent text-slate-400 hover:border-navy-500 hover:text-slate-300"
                }`}
              >
                Live logs (3s)
              </button>
            </div>
          </div>

          <div className="relative">
            {loadingLogs ? (
              <div className="flex flex-col items-center justify-center h-64 bg-navy-950/70 rounded-lg border border-navy-800/40">
                <Loader2 size={24} className="text-gold-500 animate-spin mb-2" />
                <span className="text-xs text-slate-500 font-mono">Loading logs from runner...</span>
              </div>
            ) : (
              <pre
                ref={terminalRef}
                className="h-80 overflow-y-auto bg-navy-950 p-4 rounded-lg border border-navy-800/40 text-xs font-mono text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-navy-700 whitespace-pre-wrap"
              >
                {logs ? (
                  logs
                ) : (
                  <span className="text-slate-600 italic">No logs received yet. If the project was just deployed, wait a few moments for the startup process.</span>
                )}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Links */}
      <div className="card p-5">
        <h3 className="section-title mb-3">Repository</h3>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center">
            <GitBranch size={14} className="text-gold-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm text-slate-300 truncate">{project.repoUrl}</p>
          </div>
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-sm"
          >
            <ExternalLink size={14} />
            GitHub
          </a>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-5 border-crimson-700/20">
        <h3 className="font-display font-semibold text-base text-crimson-400 mb-3">Danger zone</h3>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger text-sm">
            <Trash2 size={14} />
            Delete project
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              This will stop the running server and permanently delete all project data. This cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={handleDelete} disabled={deleting} className="btn-danger text-sm">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? "Deleting…" : "Yes, delete project"}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-ghost text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
