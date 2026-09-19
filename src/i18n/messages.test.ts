/**
 * The message catalogue: no hardcoded fallbacks, no language left behind.
 *
 * Every key must be written in Uzbek, Russian and English, and a sentence
 * that quotes a number or a name must quote the same ones in every language —
 * a `{total}` missing from the Russian would print as nothing for a Russian
 * reader while the English reads fine.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { messages } from "./messages";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("every message is written in all three languages", () => {
  for (const [key, entry] of Object.entries(messages)) {
    for (const language of ["uz", "ru", "en"] as const) {
      assert.ok(entry[language]?.trim(), `${key} has no ${language}`);
    }
  }
});

test("career and job messages quote the same facts in every language", () => {
  const career = Object.entries(messages).filter(
    ([key]) =>
      key.startsWith("car.") ||
      key.startsWith("job.") ||
      key.startsWith("coach.q.career") ||
      key === "nav.career",
  );
  assert.ok(career.length > 60);
  for (const [key, entry] of career) {
    const expected = placeholders(entry.en);
    assert.deepEqual(placeholders(entry.uz), expected, `${key} (uz)`);
    assert.deepEqual(placeholders(entry.ru), expected, `${key} (ru)`);
  }
});

test("no career message promises a job", () => {
  const banned = [/guarantee/i, /you will get a job/i, /гарантир/i, /kafolat/i];
  for (const [key, entry] of Object.entries(messages)) {
    if (!key.startsWith("car.") && !key.startsWith("job.")) continue;
    for (const text of [entry.uz, entry.ru, entry.en]) {
      for (const pattern of banned) assert.doesNotMatch(text, pattern, key);
    }
  }
});

test("organisation and business messages quote the same facts in every language", () => {
  const prefixes = [
    "biz.", "org.", "inv.", "share.", "disc.", "ws.", "adm.org.", "src.organization",
    "ev.", "week.", "guide.", "coach.q.event", "typ.",
  ];
  const scoped = Object.entries(messages).filter(([key]) => prefixes.some((prefix) => key.startsWith(prefix)));
  assert.ok(scoped.length > 120);
  for (const [key, entry] of scoped) {
    const expected = placeholders(entry.en);
    assert.deepEqual(placeholders(entry.uz), expected, `${key} (uz)`);
    assert.deepEqual(placeholders(entry.ru), expected, `${key} (ru)`);
  }
});

test("no business message promises money or success", () => {
  const banned = [/guarantee/i, /you will (get|win|receive) /i, /гарантир/i, /kafolatl/i, /albatta/i];
  for (const [key, entry] of Object.entries(messages)) {
    if (!key.startsWith("biz.")) continue;
    for (const text of [entry.uz, entry.ru, entry.en]) {
      for (const pattern of banned) assert.doesNotMatch(text, pattern, key);
    }
  }
});
