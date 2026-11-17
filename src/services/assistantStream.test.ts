import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SseParser,
  StreamBrokenError,
  askOverStream,
  readAssistantStream,
} from "./assistantStream";

const encoder = new TextEncoder();

/** A body that delivers `text` cut into the given byte pieces, optionally
 *  failing after them instead of ending. */
function body(pieces: Uint8Array[], fail?: Error): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < pieces.length) controller.enqueue(pieces[index++]);
      else if (fail) controller.error(fail);
      else controller.close();
    },
  });
}

function cut(text: string, size: number): Uint8Array[] {
  const bytes = encoder.encode(text);
  const out: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += size) out.push(bytes.slice(i, i + size));
  return out;
}

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const REPLY = { answer: "Salom, dunyo! Kuçli yönaliş.", route: "education", sources: [] };
const STREAM =
  ": open\n\n" +
  sse("delta", { text: "Salom, " }) +
  ": keep-alive\n\n" +
  sse("delta", { text: "dunyo! " }) +
  sse("delta", { text: "Kuçli yönaliş." }) +
  sse("reply", REPLY);

test("the parser reads events cut anywhere, comments dropped", () => {
  for (const size of [1, 2, 3, 7, 1000]) {
    const parser = new SseParser();
    const events = [];
    for (let i = 0; i < STREAM.length; i += size) events.push(...parser.push(STREAM.slice(i, i + size)));
    assert.deepEqual(
      events.map((e) => e.event),
      ["delta", "delta", "delta", "reply"],
      `size ${size}`,
    );
    assert.deepEqual(JSON.parse(events[3].data), REPLY);
  }
});

test("the parser takes CRLF, a CR split from its LF, and multi-line data", () => {
  const parser = new SseParser();
  const events = [
    ...parser.push("event: delta\r"),
    ...parser.push("\ndata: a\r\ndata: b\r\n\r"),
    ...parser.push("\n"),
  ];
  assert.deepEqual(events, [{ event: "delta", data: "a\nb" }]);
});

test("an event without its closing blank line is not an event", () => {
  const parser = new SseParser();
  assert.deepEqual(parser.push('event: reply\ndata: {"a":1}\n'), []);
  assert.deepEqual(parser.end(), []);
});

test("the stream grows the text and resolves with the final reply", async () => {
  for (const size of [1, 2, 5, 4096]) {
    // Byte pieces: multi-byte letters (ç, ö, ş) are split between reads too.
    const seen: string[] = [];
    const reply = await readAssistantStream<typeof REPLY>(body(cut(STREAM, size)), (text) =>
      seen.push(text),
    );
    assert.deepEqual(reply, REPLY);
    assert.deepEqual(seen, ["Salom, ", "Salom, dunyo! ", "Salom, dunyo! Kuçli yönaliş."]);
  }
});

test("a stream that ends without a reply keeps the partial text", async () => {
  const partial = sse("delta", { text: "Boşlang" }) + sse("delta", { text: "iç " });
  await assert.rejects(
    readAssistantStream(body(cut(partial, 3)), () => {}),
    (err: unknown) => err instanceof StreamBrokenError && err.partial === "Boşlangiç ",
  );
});

test("a server error event keeps the partial text and its detail", async () => {
  const text = sse("delta", { text: "Bir " }) + sse("error", { detail: "assistant_failed" });
  await assert.rejects(
    readAssistantStream(body(cut(text, 4)), () => {}),
    (err: unknown) =>
      err instanceof StreamBrokenError && err.partial === "Bir " && err.detail === "assistant_failed",
  );
});

test("a connection lost mid-answer is a broken stream; before any text, the original error", async () => {
  const lost = new TypeError("network");
  await assert.rejects(
    readAssistantStream(body(cut(sse("delta", { text: "Yarım " }), 5), lost), () => {}),
    (err: unknown) => err instanceof StreamBrokenError && err.partial === "Yarım " && err.reason === lost,
  );
  await assert.rejects(readAssistantStream(body([], lost), () => {}), (err: unknown) => err === lost);
});

// ------------------------------------------------------------ askOverStream

const ok = (text: string) => Promise.resolve(new Response(body(cut(text, 6))));
const noSleep = async () => {};
const transient = (err: unknown) => err instanceof TypeError || (err as { status?: number })?.status === 503;
const httpError = (status: number) => Object.assign(new Error(String(status)), { status });

test("streams and returns the reply", async () => {
  const seen: string[] = [];
  const reply = await askOverStream({
    open: () => ok(STREAM),
    fallback: () => Promise.reject(new Error("not used")),
    onText: (text) => seen.push(text),
    isTransient: transient,
    sleep: noSleep,
  });
  assert.deepEqual(reply, REPLY);
  assert.equal(seen.at(-1), REPLY.answer);
});

test("falls back to the plain request when the stream endpoint is missing", async () => {
  for (const status of [404, 405]) {
    const reply = await askOverStream({
      open: () => Promise.reject(httpError(status)),
      fallback: () => Promise.resolve({ answer: "plain" }),
      onText: () => {},
      isTransient: transient,
      sleep: noSleep,
    });
    assert.deepEqual(reply, { answer: "plain" });
  }
});

test("one quiet retry before any text; none for a limit", async () => {
  let opened = 0;
  const reply = await askOverStream({
    open: () => (++opened === 1 ? Promise.reject(httpError(503)) : ok(STREAM)),
    fallback: () => Promise.reject(new Error("not used")),
    onText: () => {},
    isTransient: transient,
    sleep: noSleep,
  });
  assert.deepEqual(reply, REPLY);
  assert.equal(opened, 2);

  opened = 0;
  await assert.rejects(
    askOverStream({
      open: () => {
        opened += 1;
        return Promise.reject(httpError(429));
      },
      fallback: () => Promise.reject(new Error("not used")),
      onText: () => {},
      isTransient: transient,
      sleep: noSleep,
    }),
    (err: unknown) => (err as { status?: number }).status === 429,
  );
  assert.equal(opened, 1);
});

test("a stream that dies before any text is retried once", async () => {
  let opened = 0;
  const reply = await askOverStream({
    open: () => (++opened === 1 ? ok(": open\n\n") : ok(STREAM)),
    fallback: () => Promise.reject(new Error("not used")),
    onText: () => {},
    isTransient: transient,
    sleep: noSleep,
  });
  assert.deepEqual(reply, REPLY);
  assert.equal(opened, 2);
});

test("no retry once text was shown: the partial text comes back", async () => {
  let opened = 0;
  await assert.rejects(
    askOverStream({
      open: () => {
        opened += 1;
        return ok(sse("delta", { text: "Yarım javob " }));
      },
      fallback: () => Promise.reject(new Error("not used")),
      onText: () => {},
      isTransient: () => true,
      sleep: noSleep,
    }),
    (err: unknown) => err instanceof StreamBrokenError && err.partial === "Yarım javob ",
  );
  assert.equal(opened, 1);
});
