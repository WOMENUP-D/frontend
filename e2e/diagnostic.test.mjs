/**
 * The development check-in in a real browser: keyboard only, every width,
 * three languages, through to the result page.
 *
 * Runs against servers that are already up and skips itself when there are
 * none. It needs a signed-in account, and it *submits* check-ins — point it at
 * a development database, never production:
 *
 *     WEB_URL=http://localhost:3000 E2E_TOKEN=<access token> npm run test:e2e
 */

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const TOKEN = process.env.E2E_TOKEN ?? "";
const WIDTHS = [375, 390, 412, 768, 1024, 1280, 1920];
const RAW_KEY = /\b(dg|dr|dim|nx)\.[a-z_]+(\.[a-z_]+)?\b/;

let browser;
let reachable = true;

before(async () => {
  try {
    reachable = Boolean(TOKEN) && (await fetch(`${WEB}/kabinet/diagnostika`)).ok;
  } catch {
    reachable = false;
  }
  if (reachable) browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
});

async function open(path, { width = 1280, lang = "uz" } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 1000 } });
  await context.addInitScript(
    ([token, locale]) => {
      localStorage.setItem("womanup.access_token", token);
      localStorage.setItem("womanup.locale", locale);
      localStorage.removeItem("womanup.diagnostic.v2");
    },
    [TOKEN, lang],
  );
  const page = await context.newPage();
  await page.goto(`${WEB}${path}`, { waitUntil: "networkidle" });
  return { page, context };
}

const overflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

test("one question per screen, with the section and the count", async (t) => {
  if (!reachable) return t.skip("needs running servers and E2E_TOKEN");
  const { page, context } = await open("/kabinet/diagnostika");
  await page.waitForSelector(".dg-question");
  assert.match(await page.locator(".dg-count").innerText(), /1\D+25/);
  assert.equal(await page.locator(".dg-option").count(), 5);
  // Nothing to go back to, and nothing to go on with until she answers.
  assert.ok(await page.getByRole("button", { name: /Orqaga/ }).isDisabled());
  assert.ok(await page.getByRole("button", { name: /Keyingisi/ }).isDisabled());
  await context.close();
});

test("the whole check-in works from the keyboard and ends on the result", async (t) => {
  if (!reachable) return t.skip("needs running servers and E2E_TOKEN");
  const { page, context } = await open("/kabinet/diagnostika");
  await page.waitForSelector(".dg-question");

  for (let n = 1; n <= 25; n += 1) {
    assert.match(await page.locator(".dg-count").innerText(), new RegExp(`${n}\\D+25`));
    const goals = (await page.locator('.dg-option input[type="checkbox"]').count()) > 0;
    // Tab into the options and choose with the keyboard.
    await page.locator(".dg-option input").first().focus();
    if (goals) {
      for (let i = 0; i < 3; i += 1) {
        await page.keyboard.press("Space");
        await page.keyboard.press("Tab");
      }
      // At three the rest are disabled, so Tab has already skipped past them.
      assert.equal(await page.locator(".dg-option.on").count(), 3);
      assert.ok(await page.locator(".dg-option.off").count() > 0);
      assert.equal(await page.evaluate(() => document.activeElement?.tagName), "BUTTON");
    } else {
      await page.keyboard.press("ArrowDown"); // moves to and selects the second option
      assert.equal(await page.locator(".dg-option.on").count(), 1);
    }
    if (n === 2) {
      // Back keeps the earlier answer.
      await page.getByRole("button", { name: /Orqaga/ }).click();
      assert.equal(await page.locator(".dg-option.on").count(), 1);
      await page.getByRole("button", { name: /Keyingisi/ }).click();
      await page.locator(".dg-option input").first().focus();
      await page.keyboard.press("ArrowDown");
    }
    const next = page.getByRole("button", { name: n === 25 ? /Natijani/ : /Keyingisi/ });
    await next.focus();
    await page.keyboard.press("Enter");
  }

  await page.waitForURL(/\/kabinet\/diagnostika\/natija/);
  await page.waitForSelector(".dr-number");
  assert.equal(await page.locator(".dr-dim").count(), 8);
  assert.equal(await page.locator("#dr-strong ~ .dr-list .dr-item, section:has(#dr-strong) .dr-item").count(), 2);
  const steps = await page.locator(".dr-step").count();
  assert.ok(steps >= 1 && steps <= 3, `steps: ${steps}`);
  assert.doesNotMatch(await page.locator("main").innerText(), RAW_KEY);
  // The draft is gone once the attempt is stored.
  assert.equal(await page.evaluate(() => localStorage.getItem("womanup.diagnostic.v2")), null);
  await context.close();
});

for (const lang of ["uz", "ru", "en"]) {
  test(`the result reads in ${lang} at every width without sideways scroll`, async (t) => {
  if (!reachable) return t.skip("needs running servers and E2E_TOKEN");
    for (const width of WIDTHS) {
      const { page, context } = await open("/kabinet/diagnostika/natija", { width, lang });
      await page.waitForSelector(".dr-number, .empty-card");
      assert.equal(await overflow(page), false, `${lang} @ ${width}`);
      assert.doesNotMatch(await page.locator("main").innerText(), RAW_KEY, `${lang} @ ${width}`);
      await context.close();

      const quiz = await open("/kabinet/diagnostika", { width, lang });
      await quiz.page.waitForSelector(".dg-question");
      assert.equal(await overflow(quiz.page), false, `check-in ${lang} @ ${width}`);
      const small = await quiz.page.evaluate(() =>
        [...document.querySelectorAll(".dg-option")].filter(
          (el) => el.getBoundingClientRect().height < 44,
        ).length,
      );
      assert.equal(small, 0, `tap targets ${lang} @ ${width}`);
      await quiz.context.close();
    }
  });
}
