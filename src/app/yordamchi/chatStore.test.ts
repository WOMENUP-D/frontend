import assert from "node:assert/strict";
import { test } from "node:test";
import { CHAT_KEY, historyFor, loadChats, ownerOf, saveChats, type StoredTurn } from "./chatStore";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

const turn = (i: number, role: "user" | "assistant" = i % 2 ? "assistant" : "user"): StoredTurn => ({
  id: String(i),
  role,
  text: `message ${i}`,
});

test("history is the last eight turns, each cut to 2000 characters", () => {
  const turns = Array.from({ length: 12 }, (_, i) => turn(i));
  turns[11] = { ...turns[11], text: "x".repeat(2500) };
  const history = historyFor(turns);
  assert.equal(history.length, 8);
  assert.deepEqual(history[0], { role: "user", content: "message 4" });
  assert.equal(history[7].content.length, 2000);
});

test("chats round-trip per tab for the same owner", () => {
  const storage = memory();
  saveChats("u1", { coach: [turn(0)], health: [turn(1)] }, storage);
  const loaded = loadChats("u1", storage);
  assert.deepEqual(Object.keys(loaded).sort(), ["coach", "health"]);
  assert.equal(loaded.health[0].text, "message 1");
});

test("another person's chat is discarded, not shown", () => {
  const storage = memory();
  saveChats("u1", { coach: [turn(0)] }, storage);
  assert.deepEqual(loadChats("guest", storage), {});
  assert.equal(storage.data.has(CHAT_KEY), false);
});

test("pending card requests are not restored as pending", () => {
  const storage = memory();
  type Pending = StoredTurn & { detailPending?: boolean };
  saveChats<Pending>("guest", { auto: [{ ...turn(1), detailPending: true }] }, storage);
  assert.equal(loadChats<Pending>("guest", storage).auto[0].detailPending, false);
});

test("the owner is the token subject", () => {
  const payload = Buffer.from(JSON.stringify({ sub: "abc-123" })).toString("base64url");
  assert.equal(ownerOf(`h.${payload}.s`), "abc-123");
  assert.equal(ownerOf(null), "guest");
  assert.equal(ownerOf("garbage"), "user");
});
