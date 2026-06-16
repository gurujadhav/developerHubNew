"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Clock,
  ExternalLink,
  GitBranch,
  Loader2,
  RefreshCw,
  Terminal,
  Trash2,
  Workflow,
  Zap,
} from "lucide-react";

interface Project {
  _id: string;
  name: string;
  repoUrl: string;
  runCommand: string;
  port: number;
  envVars: Array<{ key: string; value: string }>;
  cfSubdomain: string | null;
  status: string;
  outputLink: string | null;
  activeWorkflow: number | null;
  activeWorkflowRunId: string | null;
  deployedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

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
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    const interval = setInterval(() => fetchProject(true), 10_000);
    return () => clearInterval(interval);
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      router.push("/projects");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={20} className="text-gold-500 animate-spin" />
      </div>
    );
  }

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
            <p className="text-slate-500 text-sm mt-1 font-mono">
              {project.repoUrl.replace("https://github.com/", "github.com/")}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchProject(true)}
          className="btn-ghost p-2 shrink-0"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Output link */}
      {project.outputLink && (
        <div className="card p-4 border-gold-500/20 bg-navy-800/30">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">
                Live URL
              </p>
              <p className="font-mono text-sm text-gold-400 truncate">{project.outputLink}</p>
            </div>
            <a
              href={project.outputLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm shrink-0"
            >
              <ExternalLink size={14} />
              Open
            </a>
          </div>
        </div>
      )}

      {/* Failure message */}
      {project.status === "failed" && project.failureReason && (
        <div className="card p-4 border-crimson-600/30 bg-crimson-700/10">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="text-crimson-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-crimson-400">Deployment failed</p>
              <p className="text-sm text-crimson-300/80 mt-0.5">{project.failureReason}</p>
            </div>
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
                GitHub Actions is setting up your server workflow and tunnel. This can take 2–5 minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Project details */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Config */}
        <div className="card p-5">
          <h3 className="section-title mb-3">Configuration</h3>
          <div>
            <InfoRow label="Run command">
              <code className="font-mono text-gold-400 text-xs">{project.runCommand}</code>
            </InfoRow>
            <InfoRow label="Port">
              <code className="font-mono">{project.port}</code>
            </InfoRow>
            <InfoRow label="Env variables">
              {project.envVars.length > 0
                ? `${project.envVars.length} variable${project.envVars.length !== 1 ? "s" : ""}`
                : "None"}
            </InfoRow>
            <InfoRow label="CF subdomain">
              {project.cfSubdomain ?? (
                <span className="text-slate-600">Quick-tunnel (auto)</span>
              )}
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
        <h3 className="font-display font-semibold text-base text-crimson-400 mb-3">
          Danger zone
        </h3>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger text-sm"
          >
            <Trash2 size={14} />
            Delete project
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              This will stop the running server workflow and permanently delete all project data. This cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger text-sm"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? "Deleting…" : "Yes, delete project"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
