export interface ParsedEnvVar {
  key: string;
  value: string;
}

/**
 * Parse the text contents of a .env file into key/value pairs.
 * - ignores blank lines and `#` comments
 * - tolerates a leading `export `
 * - strips matching surrounding single/double quotes from values
 */
export function parseEnvFile(text: string): ParsedEnvVar[] {
  const out: ParsedEnvVar[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (!key) continue;

    let value = line.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    out.push({ key, value });
  }
  return out;
}
