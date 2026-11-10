/**
 * Single HTTP entry point to the WomanUP API.
 *
 * Every call goes through here so auth headers, error shape and the base URL
 * are defined once.
 */

import { currentSession } from "./session";
import * as tokens from "./tokenStore";

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
  tokens.setAccessToken(access, storage());
}

/** Forget the session in this tab. The server-side half is `auth.logout`. */
export function clearSession(): void {
  tokens.setAccessToken(null, storage());
}

/**
 * Asks the API for a new access token, presenting the refresh cookie.
 *
 * The access token lasts thirty minutes; the cookie thirty days and is rotated
 * on every exchange. Shared promise, so ten calls failing together refresh
 * once rather than ten times and race each other into invalidating the result.
 * `legacyRefresh` is a refresh token an earlier release left in storage — sent
 * in the body exactly once, which turns it into a cookie.
 */
let refreshing: Promise<boolean> | null = null;

async function refreshTokens(legacyRefresh: string | null = null): Promise<boolean> {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(legacyRefresh ? { refresh_token: legacyRefresh } : {}),
      });
      if (!response.ok) {
        // The refresh token is spent or revoked: there is nothing left to try,
        // and keeping a dead session marker only makes the next load slower.
        clearSession();
        return false;
      }
      const pair = (await response.json()) as { access_token: string };
      setAccessToken(pair.access_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
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
