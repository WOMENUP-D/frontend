/**
 * Single HTTP entry point to the WomanUP API.
 *
 * Every call goes through here so auth headers, error shape and the base URL
 * are defined once.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const ACCESS_TOKEN_KEY = "womanup.access_token";
const REFRESH_TOKEN_KEY = "womanup.refresh_token";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** Roles carried by the access token.
 *
 *  Read from the token rather than fetched, because this only steers what the
 *  header renders and an extra request would race the first paint. Nothing is
 *  authorised on the strength of it — the server checks every call itself, so a
 *  tampered payload buys a forged menu and nothing else.
 */
export function getRoles(): string[] {
  const token = getAccessToken();
  if (!token) return [];
  try {
    const [, payload] = token.split(".");
    const json = JSON.parse(
      decodeURIComponent(
        atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join(""),
      ),
    );
    return Array.isArray(json.roles) ? json.roles : [];
  } catch {
    return [];
  }
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

export function setTokens(access: string, refresh: string): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Trades the refresh token for a new pair.
 *
 * The access token lasts thirty minutes and the refresh token thirty days, but
 * until now nothing ever spent the second one: every call simply failed once
 * the first expired. Half an hour into a session the portal started answering
 * "could not get a response" to everything — a plan, a profile save, an
 * assistant reply — and the only cure anyone could find was signing out and
 * back in, with nothing on screen explaining why.
 *
 * Shared promise, so ten calls failing together refresh once rather than ten
 * times and race each other into invalidating the result.
 */
let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  if (refreshing) return refreshing;

  refreshing = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!response.ok) {
        // The refresh token is spent or revoked: there is nothing left to try,
        // and keeping a dead pair around only makes the next call fail slower.
        clearTokens();
        return false;
      }
      const pair = (await response.json()) as { access_token: string; refresh_token: string };
      setTokens(pair.access_token, pair.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  retrying = false,
): Promise<T> {
  const token = getAccessToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // One refresh, one replay. `retrying` stops a server that answers 401 to a
  // freshly minted token from spinning here for ever.
  if (
    response.status === 401 &&
    !retrying &&
    token &&
    !path.startsWith("/auth/refresh") &&
    (await refreshTokens())
  ) {
    return request<T>(path, options, true);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.detail ?? response.statusText,
      response.status,
      response.headers.get("X-Request-ID") ?? undefined,
    );
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, options),
  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
