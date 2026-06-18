export const MAX_PORTS = 5;

/**
 * Normalize a ports input into a clean list of 1–5 valid port numbers.
 * Accepts an array (`[3000, 8080]`), a comma string (`"3000,8080"`), or a
 * single legacy `port` fallback. Invalid/duplicate entries are dropped; the
 * list is capped at MAX_PORTS and defaults to [3000] when empty.
 */
export function normalizePorts(ports: unknown, fallback?: unknown): number[] {
  let list: number[] = [];

  if (Array.isArray(ports)) {
    list = ports.map((p) => Number(p));
  } else if (ports != null && ports !== "") {
    list = String(ports)
      .split(",")
      .map((p) => Number(p.trim()));
  } else if (fallback != null && fallback !== "") {
    list = [Number(fallback)];
  }

  list = list.filter((p) => Number.isInteger(p) && p >= 1 && p <= 65535);
  list = Array.from(new Set(list)).slice(0, MAX_PORTS);
  return list.length ? list : [3000];
}