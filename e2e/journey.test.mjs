/**
 * The critical path in a real browser (QA B-22): open an account on /login,
 * take the development check-in, get a plan and confirm it.
 *
 * Runs against a local stand that is already up and skips itself when there
 * is none. It creates a throw-away `@example.com` account and writes to the
 * database behind the stand, so it refuses any host but localhost:
 *
 *     npm run build   # with NEXT_PUBLIC_API_URL=/api/v1 API_PROXY_TARGET=http://localhost:8000
 *     PORT=3000 npm run start:standalone &
 *     WEB_URL=http://localhost:3000 node --test e2e/journey.test.mjs
 *
 * Plan generation degrades to the rule-based plan when the AI is not
 * configured, so the stand needs no model key.
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { assertLocalStand, reachable, ready } from "./helpers.mjs";

const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const PASSWORD = "Journey-Passw0rd-2026!";
let browser;
let up = false;

before(async () => {
  assertLocalStand(WEB);
  up = (await reachable(`${WEB}/healthz`)) && (await reachable(`${WEB}/api/v1/programs?size=1`));
  if (up) browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
});

test("register, take the check-in, get a plan and confirm it", { timeout: 240_000 }, async (t) => {
  if (!up) return t.skip("needs a local stand: WEB_URL with the API proxied at /api/v1");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem("womanup.locale", "en"));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  // 1. Open an account. The form is the signup form by default.
  const email = `e2e-journey-${Date.now()}@example.com`;
  await ready(page, `${WEB}/login`, { selector: "#name" });
  await page.fill("#name", "Journey (temporary)");
  // Region, then the birth date as day / month / year: an adult date.
  const selects = page.locator(".field select");
  await selects.nth(0).selectOption({ index: 1 });
  await selects.nth(1).selectOption("10");
  await selects.nth(2).selectOption("5");
  await selects.nth(3).selectOption("1995");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.check('input[type="checkbox"]');
  await page.locator('.auth-card button[type="submit"], .auth-card .btn-primary').first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });

  // 2. The check-in, answered with the mouse, through to the result.
  await ready(page, `${WEB}/kabinet/diagnostika`, { selector: ".dg-question" });
  for (let n = 1; n <= 60; n += 1) {
    await page.waitForSelector(".dg-question");
    if ((await page.locator(".dg-text textarea").count()) > 0) {
      await page.fill(".dg-text textarea", "A test answer (temporary account).");
    } else if ((await page.locator('.dg-option input[type="checkbox"]').count()) > 0) {
      for (let i = 0; i < 2; i += 1) await page.locator(".dg-option").nth(i).click();
    } else {
      await page.locator(".dg-option").nth(1).click();
    }
    const go = page.locator(".dg-nav .btn-primary");
    const last = /See my result/.test(await go.innerText());
    await go.click();
    if (last) break;
  }
  await page.waitForURL(/\/kabinet\/diagnostika\/natija/, { timeout: 60_000 });
  await page.waitForSelector(".dr-number", { timeout: 60_000 });

  // 3. The plan: proposed, then confirmed by her — never active on its own.
  await ready(page, `${WEB}/reja`);
  const confirm = page.getByRole("button", { name: /Confirm the plan/ });
  try {
    await confirm.waitFor({ timeout: 120_000 });
  } catch (error) {
    if (process.env.E2E_SHOTS) await page.screenshot({ path: `${process.env.E2E_SHOTS}/journey-plan.png` });
    throw error;
  }
  await confirm.click();
  await confirm.waitFor({ state: "detached", timeout: 30_000 });

  // The server agrees: there is an active plan for this account.
  const login = await page.request.post(`${WEB}/api/v1/auth/login`, { data: { email, password: PASSWORD } });
  assert.equal(login.status(), 200);
  const { access_token: token } = await login.json();
  const active = await page.request.get(`${WEB}/api/v1/plans/active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(active.status(), 200);
  assert.ok((await active.json()).id);

  assert.deepEqual(errors, []);
  await context.close();
});
