"use client";

import { Plus, Trash2 } from "lucide-react";

export interface AfterScriptValue {
  commands: string[];
  file: string;
}

const MAX = 5;

export const emptyAfterScript = (): AfterScriptValue => ({ commands: [], file: "" });

export default function AfterScriptEditor({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: AfterScriptValue;
  onChange: (v: AfterScriptValue) => void;
}) {
  const setCmd = (i: number, v: string) =>
    onChange({ ...value, commands: value.commands.map((c, idx) => (idx === i ? v : c)) });
  const addCmd = () => {
    if (value.commands.length < MAX) onChange({ ...value, commands: [...value.commands, ""] });
  };
  const removeCmd = (i: number) =>
    onChange({ ...value, commands: value.commands.filter((_, idx) => idx !== i) });

  return (
    <div className="border border-navy-700/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-300">{label}</p>
        <button
          type="button"
          onClick={addCmd}
          disabled={value.commands.length >= MAX}
          className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"
        >
          <Plus size={12} />
          Command
        </button>
      </div>
      {hint && <p className="text-xs text-slate-600">{hint}</p>}

      {value.commands.length > 0 && (
        <div className="space-y-2">
          {value.commands.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input font-mono flex-1 text-xs"
                placeholder="e.g. pnpm prisma migrate deploy"
                value={c}
                onChange={(e) => setCmd(i, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeCmd(i)}
                className="btn-ghost p-2 text-slate-600 hover:text-crimson-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="text-xs text-slate-500">Repo script file (optional)</label>
        <input
          className="input font-mono text-xs mt-1"
          placeholder="scripts/after.sh"
          value={value.file}
          onChange={(e) => onChange({ ...value, file: e.target.value })}
        />
      </div>
    </div>
  );
}