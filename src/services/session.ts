/**
 * The browser session: one id per tab, renewed after thirty minutes of silence.
 *
 * Kept in sessionStorage so two tabs are two sessions and a closed tab ends
 * one, with a last-seen stamp so a page left open overnight starts a fresh
 * session in the morning rather than stretching yesterday's. The id is random
 * and says nothing about the person; the server stores it beside page views to
 * count sessions and to tell the first screen of a visit from the last.
 *
 * No imports: `api.ts` and `analytics.ts` both read it, and a dependency in
 * either direction would be a cycle.
 */

const KEY = "womanup.session";
const IDLE_MS = 30 * 60 * 1000;

interface Stored {
  id: string;
  last: number;
}

function read(): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return typeof parsed.id === "string" && typeof parsed.last === "number" ? (parsed as Stored) : null;
  } catch {
    return null;
  }
}

function write(value: Stored): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* A browser that blocks storage simply has no sessions counted. */
  }
}

function fresh(): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return id.slice(0, 24);
}

/**
 * The current session id, starting a new one if the last ended. `started` is
 * true when this call opened a session — the caller records the entry page.
 */
export function touchSession(now: number = Date.now()): { id: string; started: boolean } | null {
  if (typeof window === "undefined") return null;
  const current = read();
  if (current && now - current.last < IDLE_MS) {
    write({ id: current.id, last: now });
    return { id: current.id, started: false };
  }
  const id = fresh();
  write({ id, last: now });
  return { id, started: true };
}

/** The session id if one is live, without extending or starting one. */
export function currentSession(now: number = Date.now()): string | null {
  if (typeof window === "undefined") return null;
  const current = read();
  return current && now - current.last < IDLE_MS ? current.id : null;
}
