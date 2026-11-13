/**
 * What this browser keeps for one person, and how it is forgotten.
 *
 * A family handset is shared. A diagnostic draft, lesson notes, the
 * "a plan is being built" marker and the companion's chat history all belong
 * to whoever was signed in when they were written; left behind, the next
 * person to sign in on the same phone read them as her own (I-01).
 *
 * Two defences, both here:
 *  - `clearPersonalData` wipes them on sign-out, on "sign out everywhere"
 *    and after the account is deleted;
 *  - `noteOwner` remembers whose they are, so a different account signing in
 *    without the first one having signed out (her session simply expired)
 *    starts clean as well.
 *
 * Preferences that describe the device rather than the person — language,
 * theme, the analytics opt-out, the guest id — are kept.
 *
 * Pure except for the storages handed in, so it can be tested without a window.
 */

import type { StorageLike } from "./tokenStore";

/** Who the personal keys below belong to: an account id, nothing else. */
export const OWNER_KEY = "womanup.owner";

/** Exact keys in localStorage that belong to one person. */
const LOCAL_KEYS = ["womanup.plan_generating_at", "womanup.diagnostic.v3"];
/** Key prefixes in localStorage that belong to one person. */
const LOCAL_PREFIXES = ["womanup.diagnostic.", "womanup.lms.note."];
/** Keys in sessionStorage that belong to one person. */
const SESSION_KEYS = ["womanup.mascot.chat", "womanup.google_name"];

interface Enumerable extends StorageLike {
  readonly length: number;
  key(index: number): string | null;
}

function keysOf(storage: Enumerable): string[] {
  const out: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key) out.push(key);
  }
  return out;
}

/** Forget everything one person left in this browser. */
export function clearPersonalData(
  local: Enumerable | null | undefined,
  session: StorageLike | null | undefined,
): void {
  try {
    if (local) {
      for (const key of keysOf(local)) {
        if (LOCAL_KEYS.includes(key) || LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          local.removeItem(key);
        }
      }
      local.removeItem(OWNER_KEY);
    }
  } catch {
    /* Storage can be unavailable; then there is nothing in it either. */
  }
  try {
    if (session) for (const key of SESSION_KEYS) session.removeItem(key);
  } catch {
    /* as above */
  }
}

/**
 * A session was opened for `subject`. When the browser's personal data
 * belongs to somebody else, it is wiped before she sees any of it.
 * Returns true when something was wiped.
 */
export function noteOwner(
  subject: string | null,
  local: Enumerable | null | undefined,
  session: StorageLike | null | undefined,
): boolean {
  if (!subject || !local) return false;
  try {
    const previous = local.getItem(OWNER_KEY);
    if (previous === subject) return false;
    if (previous) clearPersonalData(local, session);
    local.setItem(OWNER_KEY, subject);
    return Boolean(previous);
  } catch {
    return false;
  }
}

/** The browser's own storages, or null on the server / when blocked. */
export function browserStorages(): { local: Storage | null; session: Storage | null } {
  if (typeof window === "undefined") return { local: null, session: null };
  let local: Storage | null = null;
  let session: Storage | null = null;
  try {
    local = window.localStorage;
  } catch {
    local = null;
  }
  try {
    session = window.sessionStorage;
  } catch {
    session = null;
  }
  return { local, session };
}
