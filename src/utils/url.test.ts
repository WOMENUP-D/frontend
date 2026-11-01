/**
 * Outside addresses are rendered only when they are web addresses. The job
 * board, an organisation and a course catalogue are all untrusted here.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { hostOf, safeHttpUrl } from "./url";

test("http and https with a host pass, everything else becomes nothing", () => {
  assert.equal(safeHttpUrl("https://hh.uz/vacancy/1"), "https://hh.uz/vacancy/1");
  assert.equal(safeHttpUrl("  http://example.uz/path?x=1 "), "http://example.uz/path?x=1");
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(safeHttpUrl("vbscript:msgbox(1)"), null);
  assert.equal(safeHttpUrl("//evil.example/x"), null);
  assert.equal(safeHttpUrl("/relative"), null);
  assert.equal(safeHttpUrl(""), null);
  assert.equal(safeHttpUrl(null), null);
  assert.equal(safeHttpUrl("not a url"), null);
});

test("the host shown beside a link drops the scheme, path and www", () => {
  assert.equal(hostOf("https://www.wbip.uz/about"), "wbip.uz");
  assert.equal(hostOf("javascript:alert(1)"), null);
});
