"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck, Check, Ban, Save } from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "superadmin";
  canDeploy: boolean;
  maxProjects: number;
  projectCount: number;
  createdAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [limits, setLimits] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const data = await res.json();
      setUsers(data.users);
      setLimits(
        Object.fromEntries((data.users as AdminUser[]).map((u) => [u.id, String(u.maxProjects)]))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const { user } = await res.json();
        setUsers((prev) =>
          prev
            ? prev.map((u) =>
                u.id === id
                  ? { ...u, role: user.role, canDeploy: user.canDeploy, maxProjects: user.maxProjects }
                  : u
              )
            : prev
        );
      }
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={20} className="text-gold-500 animate-spin" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-md mx-auto card p-6 text-center mt-12">
        <Ban size={24} className="text-crimson-400 mx-auto mb-3" />
        <h1 className="font-display font-bold text-lg text-white">Forbidden</h1>
        <p className="text-sm text-slate-500 mt-1">This area is restricted to super-admins.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-navy-800 border border-gold-500/30 flex items-center justify-center">
            <ShieldCheck size={16} className="text-gold-500" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">Admin</h1>
            <p className="text-slate-500 text-sm">Manage user access and project limits</p>
          </div>
        </div>
        <button onClick={load} className="btn-ghost p-2" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="card divide-y divide-navy-700/40">
        {users?.map((u) => {
          const saving = savingId === u.id;
          const admin = u.role === "superadmin";
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-4 p-4">
              {/* Identity */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white truncate">{u.name}</p>
                  {admin && (
                    <span className="badge badge-running text-xs px-2 py-0.5">super-admin</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono truncate">{u.email}</p>
              </div>

              {/* Usage */}
              <div className="text-center">
                <p className="text-xs text-slate-600 uppercase tracking-wide">Projects</p>
                <p className="text-sm text-white font-mono">
                  {u.projectCount}
                  {!admin && <span className="text-slate-600"> / {u.maxProjects}</span>}
                </p>
              </div>

              {/* Limit editor */}
              <div className="flex items-end gap-1">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Limit</label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    disabled={admin || saving}
                    className="input font-mono w-20 text-sm disabled:opacity-40"
                    value={limits[u.id] ?? ""}
                    onChange={(e) => setLimits((l) => ({ ...l, [u.id]: e.target.value }))}
                  />
                </div>
                <button
                  disabled={admin || saving || limits[u.id] === String(u.maxProjects)}
                  onClick={() => patch(u.id, { maxProjects: Number(limits[u.id]) })}
                  className="btn-ghost p-2 disabled:opacity-30"
                  title="Save limit"
                >
                  <Save size={14} />
                </button>
              </div>

              {/* Access toggle */}
              <button
                disabled={admin || saving}
                onClick={() => patch(u.id, { canDeploy: !u.canDeploy })}
                className={`text-sm px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 ${
                  u.canDeploy
                    ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-400"
                    : "border-crimson-600/40 bg-crimson-700/20 text-crimson-400"
                }`}
                title={u.canDeploy ? "Revoke deploy access" : "Grant deploy access"}
              >
                {u.canDeploy ? <Check size={14} /> : <Ban size={14} />}
                {u.canDeploy ? "Access" : "Blocked"}
              </button>

              {/* Role */}
              <select
                disabled={saving}
                value={u.role}
                onChange={(e) => patch(u.id, { role: e.target.value })}
                className="input text-sm w-32"
              >
                <option value="user">user</option>
                <option value="superadmin">super-admin</option>
              </select>

              {saving && <Loader2 size={14} className="animate-spin text-gold-500" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}