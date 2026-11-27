/**
 * The assistant's conversations: a list, the way a chat app keeps them, each
 * with its own thread, title and the capability it was asked in.
 *
 * Where they live depends on who is asking:
 *  - signed in, on the server (/assistant/conversations), so the list is the
 *    same on her phone and her laptop and nothing is left in a shared
 *    browser. The page loads the list, fetches a conversation's turns when it
 *    is opened, and saves it after each answer;
 *  - a visitor, in this module's sessionStorage (QA B-15): a closed tab ends
 *    them, and nothing of hers reaches the server.
 *
 * `historyFor` builds the `history` field of the assistant contract: the last
 * eight turns of that conversation, each cut to 2000 characters (the server
 * applies the same limits; sending no more than it keeps saves the bytes).
 */

export const CHATS_KEY = "womanup.assistant.chats.v2";
/** The one-conversation-per-tab store this replaced; dropped on first load. */
export const LEGACY_CHAT_KEY = "womanup.assistant.chat.v1";
export const HISTORY_TURNS = 8;
export const HISTORY_CHARS = 2000;
/** Bounded so a long month of questions cannot fill the storage quota. */
export const KEPT_CHATS = 30;
const KEPT_TURNS = 40;
const TITLE_CHARS = 60;

export interface StoredTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export interface Conversation<T extends StoredTurn = StoredTurn> {
  id: string;
  /** The capability it was asked in — the Coach, the open assistant, … */
  tab: string;
  title: string;
  updatedAt: number;
  turns: T[];
  /** Signed in: false until the turns have been fetched from the server. */
  loaded?: boolean;
}

export type HistoryItem = { role: "user" | "assistant"; content: string };

export function historyFor(turns: ReadonlyArray<StoredTurn>): HistoryItem[] {
  return turns
    .filter((turn) => turn.text && turn.text.trim())
    .slice(-HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.text.slice(0, HISTORY_CHARS) }));
}

/** A conversation is named by its first question, on one line. */
export function titleFrom(question: string): string {
  const line = question.replace(/\s+/g, " ").trim();
  return line.length > TITLE_CHARS ? `${line.slice(0, TITLE_CHARS - 1).trimEnd()}…` : line;
}

/** Who the conversations belong to: the token's `sub`, else "guest". Not a
 *  security boundary — it only keeps one person's chats from greeting the next. */
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

type Saved<T extends StoredTurn> = { owner: string; chats: Conversation<T>[] };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Only a visitor's conversations are kept in the browser, for the life of
 *  the tab; a signed-in woman's live on the server. */
export function storageFor(owner: string): StorageLike | null {
  try {
    if (typeof window === "undefined" || owner !== "guest") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** A conversation id the server accepts: a UUID, made in the browser so a
 *  retried save is the same conversation. */
export function conversationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

/** The turns as they are saved: the newest `KEPT_TURNS`, with a pending card
 *  request recorded as finished (it is not re-sent after a reload). */
export function turnsToKeep<T extends StoredTurn>(turns: readonly T[]): T[] {
  return turns
    .slice(-KEPT_TURNS)
    .map((turn) => ("detailPending" in turn ? { ...turn, detailPending: false } : turn));
}

function isTurn(turn: unknown): turn is StoredTurn {
  const value = turn as StoredTurn | null;
  return Boolean(value) && typeof value?.text === "string" && (value?.role === "user" || value?.role === "assistant");
}

export function loadConversations<T extends StoredTurn>(
  owner: string,
  storage: StorageLike | null = storageFor(owner),
): Conversation<T>[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(CHATS_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw) as Saved<T>;
    if (!saved || saved.owner !== owner || !Array.isArray(saved.chats)) {
      storage.removeItem(CHATS_KEY);
      return [];
    }
    return saved.chats
      .filter((chat) => chat && typeof chat.id === "string" && Array.isArray(chat.turns))
      .map((chat) => ({
        id: chat.id,
        tab: typeof chat.tab === "string" ? chat.tab : "auto",
        title: typeof chat.title === "string" ? chat.title : "",
        updatedAt: Number(chat.updatedAt) || 0,
        turns: chat.turns.filter(isTurn) as T[],
      }))
      .filter((chat) => chat.turns.length > 0);
  } catch {
    return [];
  }
}

export function saveConversations<T extends StoredTurn>(
  owner: string,
  chats: ReadonlyArray<Conversation<T>>,
  storage: StorageLike | null = storageFor(owner),
): void {
  if (!storage) return;
  const kept = [...chats]
    .filter((chat) => chat.turns.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, KEPT_CHATS)
    // A pending card request does not survive a reload; it is not re-sent.
    .map((chat) => ({ ...chat, turns: turnsToKeep(chat.turns) }));
  try {
    if (kept.length === 0) storage.removeItem(CHATS_KEY);
    else storage.setItem(CHATS_KEY, JSON.stringify({ owner, chats: kept } satisfies Saved<T>));
  } catch {
    /* quota or privacy mode: the conversations simply are not kept */
  }
}

let counter = 0;
export function turnId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}`;
}
