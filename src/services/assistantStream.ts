/**
 * The assistant's answer, shown while it is written.
 *
 * `POST /assistant/ask/stream` answers with Server-Sent Events:
 *
 *   event: delta   data: {"text": "..."}      more of the answer — append it
 *   event: reply   data: <AssistantReply>     the whole reply; it replaces the text
 *   event: error   data: {"detail": "..."}    the answer failed part-way
 *
 * Lines starting with ":" are keep-alive comments. A refusal before the stream
 * opens (401, 422, 429) is a plain HTTP error, exactly as on `/assistant/ask`.
 *
 * Kept free of React and of the API client so the parser and the retry rules
 * can be tested in Node.
 */

export interface SseEvent {
  event: string;
  data: string;
}

/** An incremental SSE parser: feed it text as it arrives, in any pieces. */
export class SseParser {
  private buffer = "";
  private event = "";
  private data: string[] = [];

  push(chunk: string): SseEvent[] {
    this.buffer += chunk;
    const out: SseEvent[] = [];
    for (;;) {
      const match = /\r\n|\n|\r/.exec(this.buffer);
      if (!match) break;
      // A lone "\r" at the very end may be the first half of "\r\n".
      if (match[0] === "\r" && match.index === this.buffer.length - 1) break;
      const line = this.buffer.slice(0, match.index);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      this.line(line, out);
    }
    return out;
  }

  /** The body ended: an event without its closing blank line is dropped, as
   *  the SSE rules say — a half-received event is not an event. */
  end(): SseEvent[] {
    this.buffer = "";
    this.event = "";
    this.data = [];
    return [];
  }

  private line(line: string, out: SseEvent[]): void {
    if (line === "") {
      if (this.data.length) out.push({ event: this.event || "message", data: this.data.join("\n") });
      this.event = "";
      this.data = [];
      return;
    }
    if (line.startsWith(":")) return;
    const colon = line.indexOf(":");
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") this.event = value;
    else if (field === "data") this.data.push(value);
  }
}

/** The stream ended without its final reply. `partial` is what she already
 *  saw — kept on screen, with the usual error note under it. */
export class StreamBrokenError extends Error {
  constructor(
    readonly partial: string,
    readonly detail?: string,
    /** What broke it, when the connection did — a timeout reads differently. */
    readonly reason?: unknown,
  ) {
    super(detail ?? "stream_broken");
    this.name = "StreamBrokenError";
  }
}

/**
 * Read an answer stream to its end. `onText` receives the whole text so far
 * each time more arrives. Resolves with the final reply; rejects with
 * `StreamBrokenError` when the stream ends or breaks without one — or with the
 * original error when it broke before any text (so the caller may retry).
 */
export async function readAssistantStream<T>(
  body: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
): Promise<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  let text = "";

  const handle = (events: SseEvent[]): { reply: T } | null => {
    for (const { event, data } of events) {
      if (event === "delta") {
        const piece = (JSON.parse(data) as { text?: unknown }).text;
        if (typeof piece === "string" && piece) {
          text += piece;
          onText(text);
        }
      } else if (event === "reply") {
        return { reply: JSON.parse(data) as T };
      } else if (event === "error") {
        const detail = (JSON.parse(data) as { detail?: unknown }).detail;
        throw new StreamBrokenError(text, typeof detail === "string" ? detail : "assistant_failed");
      }
    }
    return null;
  };

  try {
    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (err) {
        if (!text) throw err;
        throw new StreamBrokenError(text, undefined, err);
      }
      if (chunk.done) {
        const last = handle(parser.push(decoder.decode()));
        if (last) return last.reply;
        parser.end();
        throw new StreamBrokenError(text);
      }
      const found = handle(parser.push(decoder.decode(chunk.value, { stream: true })));
      if (found) return found.reply;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

/** The stream endpoint is not there — a frontend deployed before its API. */
export function isMissingEndpoint(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return status === 404 || status === 405;
}

export interface StreamPlan<T> {
  /** Open the stream; resolves with the response once its headers are in. */
  open: () => Promise<Response>;
  /** The non-streaming request, for an API without the stream endpoint. */
  fallback: () => Promise<T>;
  onText: (text: string) => void;
  /** Whether a failure before any text is worth one quiet retry. */
  isTransient: (error: unknown) => boolean;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Ask over the stream, as `assistantAsk` asks over one request:
 *
 * - no stream endpoint (404/405) or no readable body → the plain request;
 * - a transient failure before any text arrived → one quiet retry, as before;
 * - a failure after text arrived → `StreamBrokenError` with the partial text,
 *   never a retry: she has already read the beginning of an answer.
 */
export async function askOverStream<T>(plan: StreamPlan<T>): Promise<T> {
  const sleep = plan.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let shown = false;
  const onText = (text: string) => {
    shown = true;
    plan.onText(text);
  };

  const attempt = async (): Promise<T> => {
    let response: Response;
    try {
      response = await plan.open();
    } catch (err) {
      if (isMissingEndpoint(err)) return plan.fallback();
      throw err;
    }
    if (!response.body) return plan.fallback();
    return readAssistantStream<T>(response.body, onText);
  };

  try {
    return await attempt();
  } catch (err) {
    const retryable =
      plan.isTransient(err) || (err instanceof StreamBrokenError && !err.partial);
    if (shown || !retryable) throw err;
    await sleep(plan.retryDelayMs ?? 1500);
    return attempt();
  }
}
