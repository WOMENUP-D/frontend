import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { messages } from "./messages";

const require = createRequire(import.meta.url);
const { tableFor } = require("../../scripts/i18n-locale-loader.cjs") as {
  tableFor: (source: string, locale: string) => Record<string, string>;
};
const source = readFileSync(new URL("./messages.ts", import.meta.url), "utf8");

for (const locale of ["uz", "ru", "en"] as const) {
  test(`the ${locale} chunk is exactly the ${locale} column of messages.ts`, () => {
    const table = tableFor(source, locale);
    const expected = Object.fromEntries(
      Object.entries(messages).map(([key, entry]) => [key, (entry as Record<string, string>)[locale]]),
    );
    assert.deepEqual(table, expected);
  });
}

test("the Uzbek chunk carries no Russian or English", () => {
  const table = tableFor(source, "uz");
  assert.equal(table["common.loading"], "Yuklanmoqda…");
  assert.ok(!JSON.stringify(table).includes("Загрузка…"));
});

test("an unknown locale is refused", () => {
  assert.throws(() => tableFor(source, "de"));
});
