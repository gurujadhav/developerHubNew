export type RunMode = "parallel" | "sequential";

export const MAX_COMMANDS = 5;

/** Normalize run commands into a clean list of 1–5 non-empty commands. */
export function normalizeCommands(commands: unknown, fallback?: unknown): string[] {
  let list: string[] = [];

  if (Array.isArray(commands)) {
    list = commands.map((c) => String(c).trim());
  } else if (typeof commands === "string" && commands.trim()) {
    list = [commands.trim()];
  } else if (typeof fallback === "string" && fallback.trim()) {
    list = [fallback.trim()];
  }

  list = list.filter(Boolean).slice(0, MAX_COMMANDS);
  return list.length ? list : ["pnpm dev"];
}

export function normalizeRunMode(mode: unknown): RunMode {
  return mode === "parallel" ? "parallel" : "sequential";
}

/**
 * Compose multiple run commands into a single shell command for the runner.
 * - sequential: `cmd1 && cmd2 && …` (each runs after the previous succeeds)
 * - parallel:   `(cmd1) & (cmd2) & … & wait` (all run at once; wrapper stays
 *   alive until every child exits, so the runner tracks one PID)
 */
export function composeRunCommand(commands: string[], mode: RunMode): string {
  const clean = commands.map((c) => c.trim()).filter(Boolean);
  if (clean.length === 0) return "pnpm dev";
  if (clean.length === 1) return clean[0];
  if (mode === "parallel") {
    return clean.map((c) => `(${c})`).join(" & ") + " & wait";
  }
  return clean.join(" && ");
}