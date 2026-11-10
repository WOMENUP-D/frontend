/**
 * The session store: nothing secret is written to storage, the marker says
 * only that a session exists, old tokens are taken out of storage for good,
 * and a token's roles and expiry are read without trusting it.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LEGACY_ACCESS_KEY,
  LEGACY_REFRESH_KEY,
  SESSION_MARKER_KEY,
  decodeRoles,
  getAccessToken,
  hasSessionMarker,
  isExpired,
  setAccessToken,
  takeLegacyTokens,
} from "./tokenStore";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  keys() {
    return [...this.map.keys()];
  }
}

function jwt(payload: Record<string, unknown>): string {
  const b64 = (value: string) => Buffer.from(value).toString("base64").replace(/=+$/, "");
  return `${b64('{"alg":"HS256"}')}.${b64(JSON.stringify(payload))}.sig`;
}

test("the access token stays in memory and only a marker reaches storage", () => {
  const storage = new MemoryStorage();
  setAccessToken("secret-token", storage);
  assert.equal(getAccessToken(), "secret-token");
  assert.deepEqual(storage.keys(), [SESSION_MARKER_KEY]);
  assert.equal(storage.getItem(SESSION_MARKER_KEY), "1");
  assert.equal(hasSessionMarker(storage), true);

  setAccessToken(null, storage);
  assert.equal(getAccessToken(), null);
  assert.equal(hasSessionMarker(storage), false);
  assert.deepEqual(storage.keys(), []);
});

test("tokens an earlier release stored are taken out and never written back", () => {
  const storage = new MemoryStorage();
  storage.setItem(LEGACY_ACCESS_KEY, "old-access");
  storage.setItem(LEGACY_REFRESH_KEY, "old-refresh");
  assert.deepEqual(takeLegacyTokens(storage), { access: "old-access", refresh: "old-refresh" });
  assert.deepEqual(storage.keys(), []);
  assert.deepEqual(takeLegacyTokens(storage), { access: null, refresh: null });
});

test("roles and expiry are read from the token without trusting it", () => {
  const soon = Math.floor(Date.now() / 1000) + 600;
  const token = jwt({ sub: "x", roles: ["user", "mentor"], exp: soon });
  assert.deepEqual(decodeRoles(token), ["user", "mentor"]);
  assert.equal(isExpired(token), false);
  assert.equal(isExpired(jwt({ exp: Math.floor(Date.now() / 1000) - 1 })), true);
  assert.equal(isExpired(jwt({ exp: Math.floor(Date.now() / 1000) + 10 })), true, "within the margin");
  assert.deepEqual(decodeRoles("not.a.token"), []);
  assert.equal(isExpired(null), true);
});
