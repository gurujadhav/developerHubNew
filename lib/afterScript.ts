export const MAX_AFTER_COMMANDS = 5;

export interface AfterScript {
  commands: string[]; // inline commands (up to 5), run sequentially
  file: string;       // optional path to a script committed in the repo
}

export function emptyAfterScript(): AfterScript {
  return { commands: [], file: "" };
}

/** Normalize an after-script input into a clean { commands, file }. */
export function normalizeAfterScript(input: unknown): AfterScript {
  const obj = (input ?? {}) as { commands?: unknown; file?: unknown };

  let commands: string[] = [];
  if (Array.isArray(obj.commands)) {
    commands = obj.commands.map((c) => String(c).trim());
  } else if (typeof obj.commands === "string" && obj.commands.trim()) {
    commands = [obj.commands.trim()];
  }
  commands = commands.filter(Boolean).slice(0, MAX_AFTER_COMMANDS);

  const file = typeof obj.file === "string" ? obj.file.trim() : "";
  return { commands, file };
}

/** Single-quote a value for safe use in a POSIX shell command. */
function shQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * Compose an after-script into one shell command: inline commands run first
 * (sequentially), then the repo file (if any) via `bash`. Returns "" when empty.
 */
export function composeAfterScript(a: AfterScript): string {
  const parts = [...a.commands];
  if (a.file) parts.push(`bash ${shQuote(a.file)}`);
  return parts.join(" && ");
}