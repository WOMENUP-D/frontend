/**
 * Career paths in a real browser: every width, three languages, keyboard only.
 *
 * Runs against a server that is already up (`npm run dev` with the API behind
 * it) and skips itself when there is none, so it can sit in the repository
 * without breaking a run that has no servers:
 *
 *     WEB_URL=http://localhost:3000 E2E_TOKEN=<access token> npm run test:e2e
 *
 * `E2E_TOKEN` is optional; without it only what a visitor sees is checked.
 * `E2E_CAREER` names a published direction to open (default: buxgalter).
 */

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const TOKEN = process.env.E2E_TOKEN ?? "";
const CAREER = process.env.E2E_CAREER ?? "buxgalter";
const WIDTHS = [375, 390, 393, 412, 430, 540, 768, 820, 1024, 1180, 1280, 1440, 1920];
const RAW_KEY = /^(car|nav|coach|nx)\.[a-zA-Z_.]+$/;

let browser;
let reachable = true;

before(async () => {
  try {
    const response = await fetch(`${WEB}/kasb`);
    reachable = response.ok;
  } catch {
    reachable = false;
  }
  if (reachable) browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
});

async function open(path, { width = 1280, lang = "uz", theme = "light", signedIn = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: width < 700 ? 844 : 1000 },
    colorScheme: theme,
  });
  await context.addInitScript(
    ([token, locale, mode, auth]) => {
      if (auth) localStorage.setItem("womanup.access_token", token);
      else localStorage.removeItem("womanup.access_token");
      localStorage.setItem("womanup.locale", locale);
      localStorage.setItem("womanup.theme", mode);
    },
    [TOKEN, lang, theme, signedIn],
  );
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`${WEB}${path}`, { waitUntil: "networkidle" });
  await page.waitForSelector("main h1");
  return { page, context, errors };
}

/** Buttons and links smaller than a thumb. Links inside a sentence are
 *  exempt, as WCAG 2.5.8 exempts them; a card title's link is measured by the
 *  card it is stretched over, which is what she actually taps. */
async function smallTargets(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("main a, main button, main label.cp-filter-option")]
      .filter((el) => {
        const style = getComputedStyle(el);
        if (style.display === "inline" && el.closest("p")) return false;
        const target = el.classList.contains("cp-card-link") ? el.closest(".cp-card") : el;
        const box = target.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && (box.height < 44 || box.width < 44);
      })
      .map((el) => `${el.tagName} "${(el.textContent || "").trim().slice(0, 30)}"`),
  );
}

test("no page scrolls sideways and no control is too small, at every width", async (t) => {
  if (!reachable) return t.skip(`no server at ${WEB}`);
  for (const width of WIDTHS) {
    for (const path of ["/kasb", `/kasb/${CAREER}`]) {
      const { page, context } = await open(path, { width, signedIn: Boolean(TOKEN) });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      assert.ok(overflow <= 1, `${path} at ${width}px scrolls sideways by ${overflow}px`);
      if (width <= 900) {
        assert.deepEqual(await smallTargets(page), [], `${path} at ${width}px`);
      }
      await context.close();
    }
  }
});

test("every language reads without a raw key, and without console errors", async (t) => {
  if (!reachable) return t.skip(`no server at ${WEB}`);
  for (const lang of ["uz", "ru", "en"]) {
    for (const theme of ["light", "dark"]) {
      for (const path of ["/kasb", `/kasb/${CAREER}`]) {
        const { page, context, errors } = await open(path, { lang, theme, signedIn: Boolean(TOKEN) });
        const raw = await page.evaluate(
          (source) =>
            [...document.querySelectorAll("main *")]
              .filter((el) => el.children.length === 0)
              .map((el) => (el.textContent || "").trim())
              .filter((text) => new RegExp(source).test(text)),
          RAW_KEY.source,
        );
        assert.deepEqual(raw, [], `${lang}/${theme} ${path}`);
        assert.deepEqual(errors, [], `${lang}/${theme} ${path}`);
        await context.close();
      }
    }
  }
});

test("every button and link has a name a screen reader can say", async (t) => {
  if (!reachable) return t.skip(`no server at ${WEB}`);
  const { page, context } = await open(`/kasb/${CAREER}`, { signedIn: Boolean(TOKEN) });
  const nameless = await page.evaluate(() =>
    [...document.querySelectorAll("main a, main button")]
      .filter((el) => !(el.getAttribute("aria-label") || (el.textContent || "").trim()))
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  assert.deepEqual(nameless, []);
  await context.close();
});

test("a stage opens and closes from the keyboard, and shows where focus is", async (t) => {
  if (!reachable) return t.skip(`no server at ${WEB}`);
  const { page, context } = await open(`/kasb/${CAREER}`, { signedIn: Boolean(TOKEN) });
  const head = page.locator("#stage-build .journey-head");
  const before = await head.getAttribute("aria-expanded");

  await head.focus();
  await page.keyboard.press("Enter");
  const afterEnter = await head.getAttribute("aria-expanded");
  assert.notEqual(afterEnter, before);
  const panel = await head.getAttribute("aria-controls");
  assert.equal(await page.locator(`[id="${panel}"]`).isVisible(), afterEnter === "true");

  await page.keyboard.press("Space");
  assert.equal(await head.getAttribute("aria-expanded"), before);

  // Keyboard focus draws a ring; it is not left to the browser default.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const outline = await head.evaluate((el) => getComputedStyle(el).outlineStyle);
  assert.notEqual(outline, "none");
  await context.close();
});

test("every stage says its state in words, not by colour alone", async (t) => {
  if (!reachable || !TOKEN) return t.skip("needs a server and E2E_TOKEN");
  const { page, context } = await open(`/kasb/${CAREER}`, { signedIn: true, lang: "en" });
  const states = await page.$$eval(".journey-step:not(.is-you)", (steps) =>
    steps.map((step) => (step.querySelector(".journey-state")?.textContent || "").trim()),
  );
  assert.equal(states.length, 4);
  for (const state of states) assert.ok(state, "a stage has no state label");
  await context.close();
});

test("a direction that does not exist says so, and offers the way back", async (t) => {
  if (!reachable) return t.skip(`no server at ${WEB}`);
  const { page, context } = await open("/kasb/bunday-kasb-yoq", { lang: "en" });
  assert.equal(await page.locator("main h1").textContent(), "This direction wasn't found");
  assert.ok(await page.locator('main a[href="/kasb"]').isVisible());
  await context.close();
});

test("a visitor sees the route and an invitation to sign in, not a position", async (t) => {
  if (!reachable) return t.skip(`no server at ${WEB}`);
  const { page, context } = await open(`/kasb/${CAREER}`, { lang: "en" });
  assert.equal(await page.locator(".nextcard").count(), 0);
  assert.equal(await page.locator(".journey-step.is-you").count(), 0);
  assert.ok(await page.getByText("Sign in to see where you stand.").isVisible());
  await context.close();
});
