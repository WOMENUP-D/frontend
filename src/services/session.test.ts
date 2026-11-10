/**
 * The browser session: one id per tab, renewed after thirty minutes of silence.
 * sessionStorage is stubbed, because the rule under test is the arithmetic.
 */

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { currentSession, touchSession } from "./session";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as unknown as { window: unknown }).window = {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
  };
});

test("the first touch starts a session and says so", () => {
  const first = touchSession(1_000_000);
  assert.ok(first && first.started);
  assert.match(first.id, /^[A-Za-z0-9_-]{8,32}$/);
});

test("a touch within thirty minutes keeps the same session", () => {
  const first = touchSession(1_000_000)!;
  const again = touchSession(1_000_000 + 29 * 60 * 1000)!;
  assert.equal(again.id, first.id);
  assert.equal(again.started, false);
  assert.equal(currentSession(1_000_000 + 29 * 60 * 1000), first.id);
});

test("thirty minutes of silence end the session", () => {
  const first = touchSession(1_000_000)!;
  assert.equal(currentSession(1_000_000 + 31 * 60 * 1000), null);
  const next = touchSession(1_000_000 + 31 * 60 * 1000)!;
  assert.notEqual(next.id, first.id);
  assert.equal(next.started, true);
});

test("the idle clock runs from the last touch, not the first", () => {
  const first = touchSession(0)!;
  touchSession(20 * 60 * 1000);
  const later = touchSession(45 * 60 * 1000)!;
  assert.equal(later.id, first.id);
});

test("a corrupt stored value is replaced, not thrown", () => {
  store.set("womanup.session", "{not json");
  const session = touchSession(5);
  assert.ok(session && session.started);
});
