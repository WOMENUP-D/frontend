/**
 * Shared by the browser suites (QA B-04, B-22).
 *
 * `ready()` replaces `waitUntil: "networkidle"`, which never fires against a
 * real server: the analytics beacon is a keepalive request Chromium never
 * reports as finished, so every suite timed out at 30 s. A page is ready when
 * it has loaded and drawn its `<main>`.
 *
 * `assertLocalStand()` refuses to run against anything but a local stand.
 * These suites create accounts and submit check-ins; production is not a
 * place to do that, whatever the environment variables say.
 */
import assert from "node:assert/strict";

export async function ready(page, url, { selector = "main", timeout = 20000 } = {}) {
  const response = await page.goto(url, { waitUntil: "load", timeout });
  await page.waitForSelector(selector, { timeout });
  return response;
}

const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function assertLocalStand(...urls) {
  for (const url of urls) {
    if (!url) continue;
    const host = new URL(url).hostname;
    assert.ok(LOCAL.has(host), `e2e refuses to run against ${host}: point WEB_URL/API_URL at a local stand`);
  }
}

export async function reachable(url) {
  try {
    return (await fetch(url, { redirect: "manual" })).status < 500;
  } catch {
    return false;
  }
}
