/**
 * Where the session lives in the browser — and where it does not.
 *
 * The access token is kept in memory only: it lasts thirty minutes, and a
 * script that runs in the page could read any storage it was written to, so it
 * is written to none. The refresh token is never in the page at all; the API
 * sets it as an HttpOnly cookie scoped to the auth endpoints, and the browser
 * presents it when the page asks for a new access token. What survives a
 * reload is one marker, "a session exists here", so the page knows to ask.
 *
 * Pure except for the storage handed in, so it can be tested without a window.
 */

export const SESSION_MARKER_KEY = "womanup.session";
/** Where earlier releases kept both tokens. Read once to migrate, then removed. */
export const LEGACY_ACCESS_KEY = "womanup.access_token";
export const LEGACY_REFRESH_KEY = "womanup.refresh_token";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null, storage?: StorageLike | null): void {
  accessToken = token;
  if (!storage) return;
  try {
    if (token) storage.setItem(SESSION_MARKER_KEY, "1");
    else storage.removeItem(SESSION_MARKER_KEY);
  } catch {
    // Storage can be unavailable; the token in memory is what matters.
  }
}

/** Whether a reload should try to resume a session before rendering. */
export function hasSessionMarker(storage?: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(SESSION_MARKER_KEY) === "1";
  } catch {
    return false;
  }
}

/** Tokens a previous release left in storage — taken out of it for good.
 *  The access token is used for this page load, the refresh token exchanged
 *  once for a cookie; neither is written back. */
export function takeLegacyTokens(
  storage?: StorageLike | null,
): { access: string | null; refresh: string | null } {
  if (!storage) return { access: null, refresh: null };
  try {
    const access = storage.getItem(LEGACY_ACCESS_KEY);
    const refresh = storage.getItem(LEGACY_REFRESH_KEY);
    storage.removeItem(LEGACY_ACCESS_KEY);
    storage.removeItem(LEGACY_REFRESH_KEY);
    return { access, refresh };
  } catch {
    return { access: null, refresh: null };
  }
}

/** The `roles` claim of a JWT, read without verifying it. It steers only
 *  what the header shows; the server authorises every call itself. */
export function decodeRoles(token: string | null): string[] {
  if (!token) return [];
  try {
    const [, payload] = token.split(".");
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const binary = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
    const json = JSON.parse(
      decodeURIComponent(
        binary
          .split("")
          .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join(""),
      ),
    );
    return Array.isArray(json.roles) ? json.roles.map(String) : [];
  } catch {
    return [];
  }
}

/** Whether a JWT has passed its `exp`, with a small margin so a token about to
 *  expire is refreshed before the request that would have failed. */
export function isExpired(token: string | null, now: number = Date.now(), marginSeconds = 30): boolean {
  if (!token) return true;
  try {
    const [, payload] = token.split(".");
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const binary = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
    const json = JSON.parse(binary);
    return typeof json.exp !== "number" || json.exp * 1000 <= now + marginSeconds * 1000;
  } catch {
    return true;
  }
}
