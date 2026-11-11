/**
 * Single HTTP entry point to the WomanUP API.
 *
 * Every call goes through here so auth headers, error shape and the base URL
 * are defined once.
 */

import { currentSession } from "./session";
import * as tokens from "./tokenStore";
import { browserStorages, noteOwner } from "./personalData";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
    /** The API's `detail` as it arrived. Usually a sentence, but a validation
     *  failure sends a structured reason — `{reason, field}` — and a caller
     *  that wants to say *which field* in her language needs the object, not
     *  the string it stringifies to. */
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** The access token for this tab, from memory. Null when she is not signed
 *  in — or before `bootstrapSession` has resumed a session after a reload. */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return tokens.getAccessToken();
}

/** Roles carried by the access token.
 *
 *  Read from the token rather than fetched, because this only steers what the
 *  header renders and an extra request would race the first paint. Nothing is
 *  authorised on the strength of it — the server checks every call itself, so a
 *  tampered payload buys a forged menu and nothing else.
 */
export function getRoles(): string[] {
  return tokens.decodeRoles(getAccessToken());
}

/**
 * Whether this account is staff rather than a learner.
 *
 * The distinction is the whole of the portal's shape: a coordinator, a
 * moderator or an administrator has no development profile, no assessment and
 * no plan of her own — those records exist for the women the platform serves.
 * Signed in as an administrator, the cabinet was drawing an empty profile card
 * with a staff account's name on it.
 *
 * Read from the token because it only steers what is *shown*. Nothing is
 * authorised on it: the server checks every call itself, so a tampered payload
 * buys a forged menu and nothing else.
 */
export function isStaff(): boolean {
  return getRoles().some((role) => role !== "user" && role !== "mother");
}

/** Roles that run the management panel. */
export const PANEL_ROLES = ["admin", "regional_coordinator", "moderator"] as const;
/** Roles an organisation's people act under (Step 11: employers, investors and
 *  NGOs are PARTNER, education providers are TRAINER — no new roles). */
export const ORG_ROLES = ["partner", "trainer"] as const;

/** Where a staff account belongs: the panel for administrators, coordinators
 *  and moderators; the organisation workspace for an organisation's people.
 *  Like `isStaff`, it only steers what is shown — the server authorises. */
export function staffHome(): string {
  const roles = getRoles();
  if (roles.some((role) => (PANEL_ROLES as readonly string[]).includes(role))) return "/admin";
  if (roles.some((role) => (ORG_ROLES as readonly string[]).includes(role))) return "/hamkor";
  return "/admin";
}

/** A session was opened: keep the access token for this tab. The refresh
 *  token arrived as an HttpOnly cookie and is never handled here. */
export function setAccessToken(access: string): void {
  // A different account on this browser starts without the last one's drafts.
  const { local, session } = browserStorages();
  noteOwner(tokens.decodeSubject(access), local, session);
  tokens.setAccessToken(access, storage());
  setTrouble(null);
}

/** Forget the session in this tab. The server-side half is `auth.logout`. */
export function clearSession(): void {
  tokens.setAccessToken(null, storage());
}

/* ---- QA Phase 2 (auth): session trouble, shared refresh, sign-out ----------

   `expired`: she had a session and the server no longer honours it — the
   header must stop saying "Sign out" and she is offered the sign-in (C-25).
   `offline`: the refresh could not be answered (429, 5xx, no network). The
   session may well be alive, so nothing is forgotten; she is told and can
   retry (C-02). */
export type SessionTrouble = "expired" | "offline" | null;
let trouble: SessionTrouble = null;
const troubleListeners = new Set<(value: SessionTrouble) => void>();

function setTrouble(value: SessionTrouble): void {
  if (value === trouble) return;
  trouble = value;
  for (const listener of [...troubleListeners]) listener(value);
}

export function getSessionTrouble(): SessionTrouble {
  return trouble;
}

export function onSessionTrouble(listener: (value: SessionTrouble) => void): () => void {
  troubleListeners.add(listener);
  return () => {
    troubleListeners.delete(listener);
  };
}

/** Subscribe to this tab's access token changing (sign-in, refresh, sign-out). */
export const onTokenChange = tokens.onTokenChange;

/* Tabs of the same browser share the refresh cookie, so they tell each other
   what happened to it: a fresh access token (saves the others a request) and
   a sign-out (the cookie is gone for all of them). Same-origin only. */
const CHANNEL_NAME = "womanup.auth";
let channel: BroadcastChannel | null | undefined;

type AuthMessage = { type: "access"; token: string } | { type: "signed_out" };

function authChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    channel = null;
    return channel;
  }
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    // Outside a browser (the unit tests run in Node) an open channel would
    // keep the process alive; a page never needs this.
    (channel as BroadcastChannel & { unref?: () => void }).unref?.();
    channel.onmessage = (event: MessageEvent<AuthMessage>) => {
      const message = event.data;
      if (message?.type === "access") {
        // Only a tab that already holds a session adopts it: a guest tab is
        // not signed in behind her back.
        if (getAccessToken() && !tokens.isExpired(message.token)) {
          tokens.setAccessToken(message.token, storage());
          setTrouble(null);
        }
      } else if (message?.type === "signed_out") {
        tokens.setAccessToken(null, storage());
        setTrouble(null);
      }
    };
  } catch {
    channel = null;
  }
  return channel;
}

function broadcast(message: AuthMessage): void {
  try {
    authChannel()?.postMessage(message);
  } catch {
    /* A closed channel: the other tabs find out on their next request. */
  }
}

/** Tell the other tabs this browser signed out. */
export function broadcastSignedOut(): void {
  broadcast({ type: "signed_out" });
}

/**
 * Runs `work` while no other tab of this browser is refreshing (C-01).
 *
 * Two tabs loading together used to present the same one-time cookie; the
 * second was taken for a replay and every session was revoked. Serialised,
 * the second tab presents the cookie the first one was just given.
 */
function withRefreshLock<T>(work: () => Promise<T>): Promise<T> {
  const locks =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { locks?: LockManager }).locks
      : undefined;
  if (locks?.request) return locks.request("womanup.refresh", work) as Promise<T>;
  return work();
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Seconds a 429/503 asked us to wait, capped so a page never hangs on it. */
function retryDelay(response: Response | null): number {
  const header = Number(response?.headers.get("Retry-After"));
  return Number.isFinite(header) && header > 0 ? Math.min(header, 3) * 1000 : 1000;
}

/** What one refresh attempt came to. Exported for the tests. */
export type RefreshOutcome = "ok" | "rejected" | "transient";

/** 401/403 (and a 400 for a malformed legacy token) mean the session is over;
 *  anything else — 429, 5xx, a gateway, the network — says nothing about it. */
export function classifyRefresh(status: number | null): RefreshOutcome {
  if (status !== null && status >= 200 && status < 300) return "ok";
  if (status === 400 || status === 401 || status === 403) return "rejected";
  return "transient";
}

/**
 * Asks the API for a new access token, presenting the refresh cookie.
 *
 * The access token lasts thirty minutes; the cookie thirty days and is rotated
 * on every exchange. Shared promise within the tab and a lock across tabs, so
 * ten calls failing together refresh once. Only a refusal (401/403) ends the
 * session here; a throttle or an outage keeps the marker and is retried once
 * (C-02). `legacyRefresh` is a refresh token an earlier release left in
 * storage — sent in the body exactly once, which turns it into a cookie.
 */
let refreshing: Promise<boolean> | null = null;

async function refreshTokens(legacyRefresh: string | null = null): Promise<boolean> {
  if (refreshing) return refreshing;
  const before = getAccessToken();
  const hadSession = Boolean(before) || tokens.hasSessionMarker(storage()) || Boolean(legacyRefresh);

  refreshing = (async () => {
    try {
      return await withRefreshLock(async () => {
        // Another tab refreshed while this one waited and shared the result.
        const now = getAccessToken();
        if (now && now !== before && !tokens.isExpired(now)) return true;

        for (let attempt = 0; attempt < 2; attempt += 1) {
          let response: Response | null = null;
          try {
            response = await fetch(`${BASE_URL}/auth/refresh`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(legacyRefresh ? { refresh_token: legacyRefresh } : {}),
            });
          } catch {
            response = null;
          }
          const outcome = classifyRefresh(response ? response.status : null);
          if (outcome === "ok" && response) {
            const pair = (await response.json()) as { access_token: string };
            setAccessToken(pair.access_token);
            broadcast({ type: "access", token: pair.access_token });
            return true;
          }
          if (outcome === "rejected") {
            // The refresh token is spent or revoked: nothing left to try.
            clearSession();
            setTrouble(hadSession ? "expired" : null);
            return false;
          }
          if (attempt === 0) await wait(retryDelay(response));
        }
        // Still unanswered: keep the marker so the next load tries again.
        if (hadSession) setTrouble("offline");
        return false;
      });
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

/** Retry resuming the session after `offline` — the notice's button. */
export function retrySession(): Promise<boolean> {
  return refreshTokens();
}

/**
 * Ends this browser's session on the server (C-03).
 *
 * The refresh cookie travels with the call, so the server revokes it even when
 * the access token has expired — the bearer is sent only while it is still
 * good. Retried on a throttle, an outage or a network failure; the tab forgets
 * the session either way.
 */
export async function endServerSession(access: string | null): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (access && !tokens.isExpired(access, Date.now(), 0)) headers.Authorization = `Bearer ${access}`;
  // A throttle or an outage would leave the session alive on the server, so
  // those are retried too (three tries, honouring a short Retry-After).
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response | null = null;
    try {
      response = await fetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers,
        body: "{}",
      });
    } catch {
      response = null;
    }
    if (response && classifyRefresh(response.status) !== "transient") return;
    if (attempt < 2) await wait(retryDelay(response));
  }
}

/**
 * Resume the session after a page load, before anything renders that depends
 * on it. A guest resolves at once (no marker, nothing to ask); a woman with a
 * session gets her access token back from the cookie in one request. Tokens
 * an earlier release kept in storage are taken out of it here and used once.
 */
let bootstrapping: Promise<boolean> | null = null;

export function bootstrapSession(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (bootstrapping) return bootstrapping;
  authChannel();
  bootstrapping = (async () => {
    if (getAccessToken()) return true;
    const store = storage();
    const legacy = tokens.takeLegacyTokens(store);
    if (legacy.access && !tokens.isExpired(legacy.access)) {
      setAccessToken(legacy.access);
      if (legacy.refresh) void refreshTokens(legacy.refresh);
      return true;
    }
    if (legacy.refresh) return refreshTokens(legacy.refresh);
    if (tokens.hasSessionMarker(store)) return refreshTokens();
    return false;
  })();
  return bootstrapping;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  retrying = false,
): Promise<T> {
  const token = getAccessToken();

  const session = currentSession();
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    // The first-party visitor cookie travels with every call, so an event the
    // server records beside a record — a registration, an enrollment — can be
    // tied to the visit that led to it. Same-origin in production; needed for
    // the cross-origin development setup.
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(session ? { "X-WU-Session": session } : {}),
      ...options.headers,
    },
  });

  // One refresh, one replay. `retrying` stops a server that answers 401 to a
  // freshly minted token from spinning here for ever.
  if (
    response.status === 401 &&
    !retrying &&
    (token || tokens.hasSessionMarker(storage())) &&
    !path.startsWith("/auth/") &&
    (await refreshTokens())
  ) {
    return request<T>(path, options, true);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.detail;
    throw new ApiError(
      typeof detail === "string" ? detail : response.statusText,
      response.status,
      response.headers.get("X-Request-ID") ?? undefined,
      detail,
    );
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/** A response that is a file, not JSON — a CSV export. Same token, same one
 *  refresh-and-replay as `request`. */
export async function requestText(path: string, retrying = false): Promise<string> {
  const token = getAccessToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (response.status === 401 && !retrying && token && (await refreshTokens())) {
    return requestText(path, true);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.statusText,
      response.status,
      response.headers.get("X-Request-ID") ?? undefined,
      body.detail,
    );
  }
  return response.text();
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, options),
  text: (path: string) => requestText(path),
  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
