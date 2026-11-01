import assert from "node:assert/strict";
import { test } from "node:test";
import { toCyrillic } from "./translit";

test("the reformed letters transliterate to Cyrillic", () => {
  assert.equal(toCyrillic("Toşkent şahri"), "Тошкент шаҳри");
  assert.equal(toCyrillic("Özbekiston"), "Ўзбекистон");
  assert.equal(toCyrillic("ğoya va çöl"), "ғоя ва чўл");
  assert.equal(toCyrillic("ŞAHAR"), "ШАҲАР");
});

test("the old digraphs still transliterate, for older records", () => {
  assert.equal(toCyrillic("Toshkent shahri"), "Тошкент шаҳри");
  assert.equal(toCyrillic("Oʻzbekiston"), "Ўзбекистон");
});

test("addresses and brand names survive", () => {
  assert.equal(toCyrillic("WomanUP — womanup.uz"), "WomanUP — womanup.uz");
});
