import assert from "node:assert/strict";
import { test } from "node:test";
import { isTransientError } from "./transient";

const withStatus = (status: number) => Object.assign(new Error("x"), { status });

test("server, gateway and network failures are retried once", () => {
  for (const s of [500, 502, 503, 504, 520, 499, 408]) assert.equal(isTransientError(withStatus(s)), true, String(s));
  assert.equal(isTransientError(new TypeError("Failed to fetch")), true);
});

test("client errors, limits and timeouts are not", () => {
  for (const s of [400, 401, 403, 404, 422, 429]) assert.equal(isTransientError(withStatus(s)), false, String(s));
  assert.equal(isTransientError(Object.assign(new Error("t"), { name: "TimeoutError" })), false);
  assert.equal(isTransientError(Object.assign(new Error("a"), { name: "AbortError" })), false);
  assert.equal(isTransientError(null), false);
});
