/**
 * The assistant's conversations, one per tab, kept for the life of the browser
 * tab (QA B-15, E-16).
 *
 * sessionStorage rather than localStorage: a closed tab ends the conversation,
 * and nothing she asked is left on a shared computer after it. The record is
 * stamped with whose it is — the account in the access token, or "guest" — and
 * is discarded when somebody else opens the page in the same tab.
 *
 * `historyFor` builds the `history` field of the assistant contract: the last
 * eight turns of that tab, each cut to 2000 characters (the server applies the
 * same limits; sending no more than it keeps saves the bytes).
 */

export const CHAT_KEY = "womanup.assistant.chat.v1";
export const HISTORY_TURNS = 8;
export const HISTORY_CHARS = 2000;
/** Bounded so a long day of questions cannot fill the storage quota. */
const KEPT_TURNS = 40;

export interface StoredTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export type HistoryItem = { role: "user" | "assistant"; content: string };

export function historyFor(turns: ReadonlyArray<StoredTurn>): HistoryItem[] {
  return turns
    .filter((turn) => turn.text && turn.text.trim())
    .slice(-HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.text.slice(0, HISTORY_CHARS) }));
}

/** Who the conversation belongs to: the token's `sub`, else "guest". Not a
 *  security boundary — it only keeps one person's chat from greeting the next. */
export function ownerOf(token: string | null): string {
  if (!token) return "guest";
  try {
    const payload = token.split(".")[1] ?? "";
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const sub = (JSON.parse(json) as { sub?: unknown }).sub;
    return typeof sub === "string" && sub ? sub : "user";
  } catch {
    return "user";
  }
}

type Saved<T> = { owner: string; tabs: Record<string, T[]> };

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function store(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function loadChats<T extends StoredTurn>(owner: string, storage = store()): Record<string, T[]> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(CHAT_KEY);
    if (!raw) return {};
    const saved = JSON.parse(raw) as Saved<T>;
    if (!saved || saved.owner !== owner || typeof saved.tabs !== "object") {
      storage.removeItem(CHAT_KEY);
      return {};
    }
    const tabs: Record<string, T[]> = {};
    for (const [tab, turns] of Object.entries(saved.tabs)) {
      if (Array.isArray(turns)) {
        tabs[tab] = turns.filter(
          (turn) => turn && typeof turn.text === "string" && (turn.role === "user" || turn.role === "assistant"),
        );
      }
    }
    return tabs;
  } catch {
    return {};
  }
}

export function saveChats<T extends StoredTurn>(
  owner: string,
  tabs: Record<string, T[]>,
  storage = store(),
): void {
  if (!storage) return;
  const trimmed: Record<string, T[]> = {};
  for (const [tab, turns] of Object.entries(tabs)) {
    // A pending card request does not survive a reload; it is not re-sent.
    trimmed[tab] = turns.slice(-KEPT_TURNS).map((turn) =>
      "detailPending" in turn ? { ...turn, detailPending: false } : turn,
    );
  }
  try {
    storage.setItem(CHAT_KEY, JSON.stringify({ owner, tabs: trimmed } satisfies Saved<T>));
  } catch {
    /* quota or privacy mode: the conversation simply is not kept */
  }
}

let counter = 0;
export function turnId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}`;
}
