import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/v1/**", (route) => route.fulfill({
    status: 200, json: { items: [], total: 0, page: 1, page_size: 20 },
  }));
  for (const path of ["/", "/login", "/maxfiylik"]) {
    const response = await page.goto(base + path);
    assert.equal(response.status(), 200, path);
    await page.locator("body").waitFor();
    await page.waitForLoadState("networkidle");
    assert.ok((await page.locator("body").innerText()).length > 50, path);
  }
  const config = await (await page.request.get(base + "/public-config")).json();
  assert.deepEqual(Object.keys(config).sort(), ["apiKey", "appId", "authDomain", "messagingSenderId", "projectId", "storageBucket"].sort());
  assert.equal((await page.request.get(base + "/healthz")).status(), 200);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
