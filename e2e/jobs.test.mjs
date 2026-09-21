/**
 * Jobs and opportunities in a real browser: every width, three languages,
 * keyboard only. Read-only — nothing here applies, saves or consents.
 *
 * Runs against servers that are already up and skips itself when there are
 * none:
 *
 *     WEB_URL=http://localhost:3000 API_URL=http://localhost:8000/api/v1 \
 *       E2E_TOKEN=<access token> npm run test:e2e
 */

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";

const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://localhost:8000/api/v1";
const TOKEN = process.env.E2E_TOKEN ?? "";
const WIDTHS = [375, 390, 393, 412, 430, 540, 768, 820, 1024, 1180, 1280, 1440, 1920];
const RAW_KEY = /^(job|op|car|typ|reg|src|nav)\.[a-zA-Z_.]+$/;

let browser;
let reachable = true;
let listing = null;

before(async () => {
  try {
    const response = await fetch(`${API}/opportunities/discover?size=1`);
    reachable = response.ok && (await fetch(`${WEB}/imkoniyatlar`)).ok;
    if (reachable) listing = (await response.json()).items[0]?.id ?? null;
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
    hasTouch: width < 900,
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

const pages = () => [
  "/imkoniyatlar",
  ...(listing ? [`/imkoniyatlar/${listing}`] : []),
  ...(TOKEN ? ["/imkoniyatlar/arizalarim"] : []),
];

test("no page scrolls sideways and no control is too small, at every width", async (t) => {
  if (!reachable) return t.skip(`no server at ${WEB}`);
  for (const width of WIDTHS) {
    for (const path of pages()) {
      const { page, context } = await open(path, { width, signedIn: Boolean(TOKEN) });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      assert.ok(overflow <= 1, `${path} at ${width}px scrolls sideways by ${overflow}px`);
      if (width <= 900) {
        const small = await page.evaluate(() =>
          [...document.querySelectorAll("main a, main button, main select, main input")]
            .filter((el) => {
              const style = getComputedStyle(el);
              if (style.display === "inline" && el.closest("p")) return false;
              if (el.type === "checkbox" || el.type === "radio") return false;
              if (el.closest(".jb-kinds") && el.closest(".jb-kinds").scrollWidth > el.closest(".jb-kinds").clientWidth) {
                // In a sideways strip: measured by height only.
                return el.getBoundingClientRect().height < 44;
              }
              const target = el.classList.contains("jb-link") ? el.closest(".jb-card") : el;
              const box = target.getBoundingClientRect();
              return box.width > 0 && box.height > 0 && (box.height < 44 || box.width < 44);
            })
            .map((el) => `${el.tagName}.${el.className} "${(el.textContent || "").trim().slice(0, 24)}"`),
        );
        assert.deepEqual(small, [], `${path} at ${width}px`);
      }
      await context.close();
    }
  }
});

test("every language reads without a raw key, and without console errors", async (t) => {
  if (!reachable) return t.skip(`no server at ${WEB}`);
  for (const lang of ["uz", "ru", "en"]) {
    for (const theme of ["light", "dark"]) {
      for (const path of pages()) {
        const { page, context, errors } = await open(path, {
          lang,
          theme,
          signedIn: Boolean(TOKEN),
        });
        const raw = await page.evaluate(
          (source) =>
            [...document.querySelectorAll("main *, dialog *")]
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

test("on a phone the filters open in a panel, from the keyboard, and close again", async (t) => {
  if (!reachable) return t.skip(`no server at ${WEB}`);
  const { page, context } = await open("/imkoniyatlar", { width: 390, lang: "en" });
  const button = page.getByRole("button", { name: /^Filters/ });
  await button.focus();
  await page.keyboard.press("Enter");
  const sheet = page.locator("dialog.jb-sheet");
  assert.equal(await sheet.evaluate((dialog) => dialog.open), true);
  assert.ok(await sheet.getByRole("button", { name: "Clear all" }).isVisible());
  assert.ok(await sheet.getByRole("button", { name: /^Show results/ }).isVisible());
  // Only the controls the data supports: no remote, no experience.
  const labels = await sheet.locator(".jb-label").allInnerTexts();
  assert.deepEqual(labels, ["Region", "Skill"]);
  await page.keyboard.press("Escape");
  assert.equal(await sheet.evaluate((dialog) => dialog.open), false);
  await context.close();
});

test("the kinds are real toggles and the address follows them", async (t) => {
  if (!reachable) return t.skip(`no server at ${WEB}`);
  const { page, context } = await open("/imkoniyatlar", { lang: "en" });
  const pills = page.locator(".jb-kind-pill");
  const second = pills.nth(1);
  assert.equal(await second.getAttribute("aria-pressed"), "false");
  await second.click();
  await page.waitForURL(/type=/);
  assert.equal(await second.getAttribute("aria-pressed"), "true");
  assert.equal(await pills.first().getAttribute("aria-pressed"), "false");
  await context.close();
});

test("a listing's requirements open in place, and a visitor is asked to sign in", async (t) => {
  if (!reachable || !listing) return t.skip("needs a server and a listing");
  const { page, context } = await open(`/imkoniyatlar/${listing}`, { lang: "en" });
  const disclosure = page.locator(".jb-disclosure");
  assert.equal(await disclosure.getAttribute("aria-expanded"), "false");
  await disclosure.focus();
  await page.keyboard.press("Enter");
  assert.equal(await disclosure.getAttribute("aria-expanded"), "true");
  assert.ok(await page.getByRole("link", { name: "Sign in to apply" }).isVisible());
  assert.equal(await page.locator(".jb-save").count(), 0);
  await context.close();
});

test("nothing matching says so, and never shows an invented listing", async (t) => {
  if (!reachable) return t.skip(`no server at ${WEB}`);
  const { page, context } = await open("/imkoniyatlar?q=zzzz-yoq-zzzz", { lang: "en" });
  await page.waitForSelector(".jb-empty-title");
  assert.equal(
    await page.locator(".jb-empty-title").innerText(),
    "We couldn't find a current opportunity matching these filters.",
  );
  assert.equal(await page.locator(".jb-card").count(), 0);
  await context.close();
});

test("every button and link has a name a screen reader can say", async (t) => {
  if (!reachable) return t.skip(`no server at ${WEB}`);
  for (const path of pages()) {
    const { page, context } = await open(path, { signedIn: Boolean(TOKEN) });
    const nameless = await page.evaluate(() =>
      [...document.querySelectorAll("main a, main button, main select, main input")]
        .filter((el) => {
          const label = el.getAttribute("aria-label") || (el.textContent || "").trim();
          const labelled = el.id && document.querySelector(`label[for="${el.id}"]`);
          return !label && !labelled && !el.closest("label");
        })
        .map((el) => el.outerHTML.slice(0, 80)),
    );
    assert.deepEqual(nameless, [], path);
    await context.close();
  }
});
