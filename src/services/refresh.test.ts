/**
 * QA Phase 2 (auth): what a refresh does to the session in this browser.
 *
 *  - a 503 on refresh keeps the session marker and says "offline" (C-02)
 *  - a 401 on refresh ends it and says "expired" (C-25)
 *  - the refresh runs under a cross-tab lock (C-01)
 *
 * `window`, `fetch` and `navigator.locks` are stubbed; the module is imported
 * after the stubs exist, because it reads them when called.
 */

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

class MemoryStorage {
  map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

const local = new MemoryStorage();
const session = new MemoryStorage();
const lockNames: string[] = [];
let responses: Array<{ status: number; body?: unknown }> = [];
const calls: string[] = [];

(globalThis as unknown as { window: unknown }).window = { localStorage: local, sessionStorage: session };
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    locks: {
      request: async (name: string, work: () => Promise<unknown>) => {
        lockNames.push(name);
        return work();
      },
    },
  },
});
globalThis.fetch = (async (url: string) => {
  calls.push(String(url).replace(/^.*\/api\/v1/, ""));
  const next = responses.shift() ?? { status: 500 };
  return new Response(next.body === undefined ? null : JSON.stringify(next.body), {
    status: next.status,
    headers: { "Content-Type": "application/json", "Retry-After": "0.01" },
  });
}) as typeof fetch;

function jwt(payload: Record<string, unknown>): string {
  const b64 = (value: string) => Buffer.from(value).toString("base64").replace(/=+$/, "");
  return `${b64('{"alg":"HS256"}')}.${b64(JSON.stringify(payload))}.sig`;
}
const live = () => jwt({ sub: "u-1", roles: ["user"], exp: Math.floor(Date.now() / 1000) + 1800 });

beforeEach(() => {
  responses = [];
  calls.length = 0;
  lockNames.length = 0;
});

test("a refresh answered 503 twice keeps the marker and reports offline", async () => {
  const api = await import("./api");
  api.setAccessToken(live());
  assert.equal(local.getItem("womanup.session"), "1");

  responses = [{ status: 401 }, { status: 503 }, { status: 503 }];
  await assert.rejects(api.api.get("/users/me"), (err: { status?: number }) => err.status === 401);

  assert.deepEqual(calls, ["/users/me", "/auth/refresh", "/auth/refresh"]);
  assert.equal(local.getItem("womanup.session"), "1", "the session marker survives an outage");
  assert.equal(api.getSessionTrouble(), "offline");
  assert.deepEqual(lockNames, ["womanup.refresh"]);
});

test("a refresh answered 200 after one 503 resumes and replays the call", async () => {
  const api = await import("./api");
  api.setAccessToken(live());
  const fresh = live() + "x";
  responses = [{ status: 401 }, { status: 503 }, { status: 200, body: { access_token: fresh } }, { status: 200, body: { ok: 1 } }];
  const result = await api.api.get<{ ok: number }>("/users/me");
  assert.deepEqual(result, { ok: 1 });
  assert.equal(api.getAccessToken(), fresh);
  assert.equal(api.getSessionTrouble(), null);
});

test("a refresh answered 401 ends the session and reports it expired", async () => {
  const api = await import("./api");
  api.setAccessToken(live());
  responses = [{ status: 401 }, { status: 401 }];
  await assert.rejects(api.api.get("/users/me"));
  assert.equal(api.getAccessToken(), null);
  assert.equal(local.getItem("womanup.session"), null);
  assert.equal(api.getSessionTrouble(), "expired");
});

test("sign-out tells the server with the cookie even when the access token has expired", async () => {
  const api = await import("./api");
  const { logout } = await import("./auth");
  api.setAccessToken(jwt({ sub: "u-1", roles: ["user"], exp: 1 }));
  local.setItem("womanup.diagnostic.v3:u-1", "{}");
  let sentAuth: string | null = "unset";
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push(String(url).replace(/^.*\/api\/v1/, ""));
    sentAuth = (init?.headers as Record<string, string>)?.Authorization ?? null;
    assert.equal(init?.credentials, "include");
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  try {
    await logout();
  } finally {
    globalThis.fetch = original;
  }
  assert.deepEqual(calls, ["/auth/logout"]);
  assert.equal(sentAuth, null, "an expired bearer is not sent");
  assert.equal(api.getAccessToken(), null);
  assert.equal(local.getItem("womanup.diagnostic.v3:u-1"), null, "her draft is gone");
});
