import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHATS_KEY,
  KEPT_CHATS,
  historyFor,
  loadConversations,
  ownerOf,
  saveConversations,
  titleFrom,
  type Conversation,
  type StoredTurn,
} from "./chatStore";

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

const chat = (id: string, updatedAt: number, turns = [turn(0), turn(1)]): Conversation => ({
  id,
  tab: "coach",
  title: `chat ${id}`,
  updatedAt,
  turns,
});

test("history is the last eight turns, each cut to 2000 characters", () => {
  const turns = Array.from({ length: 12 }, (_, i) => turn(i));
  turns[11] = { ...turns[11], text: "x".repeat(2500) };
  const history = historyFor(turns);
  assert.equal(history.length, 8);
  assert.deepEqual(history[0], { role: "user", content: "message 4" });
  assert.equal(history[7].content.length, 2000);
});

test("conversations round-trip for the same owner, newest first", () => {
  const storage = memory();
  saveConversations("u1", [chat("a", 1), chat("b", 5)], storage);
  const loaded = loadConversations("u1", storage);
  assert.deepEqual(loaded.map((c) => c.id), ["b", "a"]);
  assert.equal(loaded[0].turns[1].text, "message 1");
});

test("another person's conversations are discarded, not shown", () => {
  const storage = memory();
  saveConversations("u1", [chat("a", 1)], storage);
  assert.deepEqual(loadConversations("u2", storage), []);
  assert.equal(storage.data.has(CHATS_KEY), false);
});

test("an empty conversation is not kept, and the list is bounded", () => {
  const storage = memory();
  const many = Array.from({ length: KEPT_CHATS + 5 }, (_, i) => chat(String(i), i));
  saveConversations("u1", [...many, chat("empty", 999, [])], storage);
  const loaded = loadConversations("u1", storage);
  assert.equal(loaded.length, KEPT_CHATS);
  assert.ok(!loaded.some((c) => c.id === "empty"));
  assert.equal(loaded[0].id, String(KEPT_CHATS + 4));
});

test("pending card requests are not restored as pending", () => {
  const storage = memory();
  type Pending = StoredTurn & { detailPending?: boolean };
  saveConversations<Pending>("guest", [{ ...chat("a", 1), turns: [{ ...turn(1), detailPending: true }] }], storage);
  assert.equal(loadConversations<Pending>("guest", storage)[0].turns[0].detailPending, false);
});

test("a title is the first question on one line, cut with an ellipsis", () => {
  assert.equal(titleFrom("  What should\n I learn?  "), "What should I learn?");
  const long = titleFrom("a".repeat(100));
  assert.equal(long.length, 60);
  assert.ok(long.endsWith("…"));
});

test("the owner is the token subject", () => {
  const payload = Buffer.from(JSON.stringify({ sub: "abc-123" })).toString("base64url");
  assert.equal(ownerOf(`h.${payload}.s`), "abc-123");
  assert.equal(ownerOf(null), "guest");
  assert.equal(ownerOf("garbage"), "user");
});
