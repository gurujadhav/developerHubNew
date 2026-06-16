"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderGit2,
  PlusCircle,
  RefreshCw,
  Zap,
} from "lucide-react";

interface Project {
  _id: string;
  name: string;
  repoUrl: string;
  status: string;
  outputLink: string | null;
  activeWorkflow: number | null;
  createdAt: string;
  deployedAt: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: "badge-running",
    deploying: "badge-deploying",
    failed: "badge-failed",
    pending: "badge-pending",
    stopped: "badge-stopped",
  };
  const labels: Record<string, string> = {
    running: "Running",
    deploying: "Deploying…",
    failed: "Failed",
    pending: "Pending",
    stopped: "Stopped",
  };
  return (
    <span className={map[status] ?? "badge badge-pending"}>
      {status === "running" && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
      )}
      {labels[status] ?? status}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // Poll every 15s for deploying/pending projects
    const interval = setInterval(() => fetchProjects(true), 15_000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    total: projects.length,
    running: projects.filter((p) => p.status === "running").length,
    deploying: projects.filter((p) => p.status === "deploying").length,
    failed: projects.filter((p) => p.status === "failed").length,
  };

  const recent = [...projects].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={20} className="text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Overview</h1>
          <p className="text-slate-500 text-sm mt-1">All your deployments at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchProjects(true)}
            disabled={refreshing}
            className="btn-ghost text-sm"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link href="/projects/new" className="btn-primary text-sm">
            <PlusCircle size={14} />
            New project
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total projects"
          value={stats.total}
          icon={FolderGit2}
          accent="bg-navy-700 text-slate-300"
        />
        <StatCard
          label="Running"
          value={stats.running}
          icon={CheckCircle2}
          accent="bg-emerald-900/50 text-emerald-400"
        />
        <StatCard
          label="Deploying"
          value={stats.deploying}
          icon={Zap}
          accent="bg-gold-500/10 text-gold-400"
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={AlertTriangle}
          accent="bg-crimson-700/20 text-crimson-400"
        />
      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent projects</h2>
          <Link href="/projects" className="text-sm text-gold-400 hover:text-gold-300">
            View all →
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="card p-12 text-center">
            <FolderGit2 size={36} className="text-navy-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No projects yet</p>
            <p className="text-slate-600 text-sm mt-1 mb-4">
              Connect a GitHub repo and deploy your first app
            </p>
            <Link href="/projects/new" className="btn-primary">
              <PlusCircle size={14} />
              Create first project
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-navy-700/40">
            {recent.map((project) => (
              <Link
                key={project._id}
                href={`/projects/${project._id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-navy-800/40 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-navy-700 border border-navy-600 flex items-center justify-center shrink-0">
                    <Activity size={14} className="text-gold-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate group-hover:text-gold-300 transition-colors">
                      {project.name}
                    </p>
                    <p className="text-slate-600 text-xs font-mono truncate">
                      {project.repoUrl.replace("https://github.com/", "")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <StatusBadge status={project.status} />
                  {project.outputLink && (
                    <a
                      href={project.outputLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-500 hover:text-gold-400 transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <Clock size={12} className="text-slate-700" />
                  <span className="text-slate-600 text-xs">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
