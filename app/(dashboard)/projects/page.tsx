"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ExternalLink,
  FolderGit2,
  PlusCircle,
  RefreshCw,
  Terminal,
  Workflow,
} from "lucide-react";

interface Project {
  _id: string;
  name: string;
  repoUrl: string;
  status: string;
  outputLink: string | null;
  runCommand: string;
  port: number;
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
  return (
    <span className={map[status] ?? "badge badge-pending"}>
      {status === "running" && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ProjectsPage() {
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
    const interval = setInterval(() => fetchProjects(true), 15_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={20} className="text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchProjects(true)}
            disabled={refreshing}
            className="btn-ghost text-sm"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
          <Link href="/projects/new" className="btn-primary text-sm">
            <PlusCircle size={14} />
            New project
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderGit2 size={40} className="text-navy-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No projects yet</p>
          <p className="text-slate-600 text-sm mt-1 mb-6">
            Deploy your first Next.js app from a GitHub repo
          </p>
          <Link href="/projects/new" className="btn-primary">
            <PlusCircle size={14} />
            Create first project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Link
              key={project._id}
              href={`/projects/${project._id}`}
              className="card p-5 hover:border-gold-500/30 hover:shadow-gold transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-navy-700 border border-navy-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-gold-500/30 transition-colors">
                    <Activity size={15} className="text-gold-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold group-hover:text-gold-300 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-slate-500 text-xs font-mono mt-0.5 truncate">
                      {project.repoUrl.replace("https://github.com/", "github.com/")}
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Terminal size={11} />
                        <code className="font-mono">{project.runCommand}</code>
                      </span>
                      <span className="text-xs text-slate-600">Port {project.port}</span>
                      {project.activeWorkflow && (
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <Workflow size={11} />
                          Server {project.activeWorkflow}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={project.status} />
                  {project.outputLink && (
                    <a
                      href={project.outputLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-gold-500 hover:text-gold-300 font-mono"
                    >
                      <ExternalLink size={11} />
                      Open app
                    </a>
                  )}
                  <span className="text-xs text-slate-700">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
