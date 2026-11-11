/**
 * QA Phase 2 (i18n) regressions: placeholders survive Cyrillic (G-01),
 * foreign words survive both converters (G-02, G-13), the apostrophe is drawn
 * as an apostrophe (G-12), counts agree with their nouns (G-07), money and
 * dates follow the interface language (G-08, G-10, G-21), and the Uzbek
 * catalogue is in the reformed alphabet with no stray ASCII apostrophes (G-18).
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { messages, type MessageKey } from "./messages";
import { fill, formatDate, pluralKey, translate, translateField, typeset } from "./core";
import { toCyrillic } from "./translit";
import { toNewAlphabet } from "./uzbek";
import { money, moneyRange } from "@/utils/format";

const entries = Object.entries(messages) as [MessageKey, { uz: string; ru: string; en: string }][];
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("G-01: every placeholder survives transliteration and is filled", () => {
  let checked = 0;
  for (const [key, entry] of entries) {
    const names = placeholders(entry.uz);
    if (names.length === 0) continue;
    checked += 1;
    assert.deepEqual(placeholders(toCyrillic(entry.uz)), names, key);
    const params = Object.fromEntries(names.map((n) => [n, "7"]));
    assert.doesNotMatch(fill(translate("uz-Cyrl", key), params), /\{\w+\}/, key);
  }
  assert.ok(checked > 100);
  assert.equal(fill(toCyrillic("{n} soat"), { n: 32 }), "32 соат");
});

test("G-13: brands, English phrases and addresses stay Latin in uz-Cyrl", () => {
  assert.equal(toCyrillic("Wbip.uz — World Business Integration Platform"), "Wbip.uz — World Business Integration Platform");
  assert.equal(toCyrillic("Google Digital Marketing & E-commerce"), "Google Digital Marketing & E-commerce");
  assert.equal(toCyrillic("Excel va Canva asoslari"), "Excel ва Canva асослари");
  assert.equal(toCyrillic("email manzilingiz"), "email манзилингиз");
  assert.equal(toCyrillic("Alfa Savdo MChJ"), "Алфа Савдо МЧЖ");
  // A dictionary word at the start of a sentence does not drag Uzbek along.
  assert.equal(toCyrillic("Brauzer Google oynasini bloklab qöydi"), "Браузер Google ойнасини блоклаб қўйди");
});

test("G-02: English titles are not reformed; Uzbek still is", () => {
  for (const title of [
    "General English for First-Year Students", "ML School by REU Data Science Club",
    "Machine Learning and Data Mining", "Information Technology", "Child Nutrition",
    "Women In Tech", "Business English", "Harvard: Leadership", "Choose a course",
  ]) {
    assert.equal(toNewAlphabet(title), title);
  }
  assert.equal(toNewAlphabet("Ruscha kurs, tashkilotchi bilan uchrashuv"), "Rusça kurs, taşkilotçi bilan uçraşuv");
  assert.equal(toNewAlphabet("Koordinator bilan kuchli reja"), "Koordinator bilan kuçli reja");
});

test("G-02: a title copied into every language is shown as written", () => {
  const copied = { uz: "Machine Learning", ru: "Machine Learning", en: "Machine Learning" };
  assert.equal(translateField("uz", copied), "Machine Learning");
  assert.equal(translateField("uz-Cyrl", copied), "Machine Learning");
  assert.equal(translateField("uz", { uz: "Shaxsiy moliya", ru: "Личные финансы" }), "Şaxsiy moliya");
  assert.equal(translateField("uz-Cyrl", { uz: "Shaxsiy moliya" }), "Шахсий молия");
});

test("G-12: the glottal stop is drawn as an apostrophe, the old okina as ‘", () => {
  assert.equal(typeset("taʼlim"), "ta’lim");
  assert.equal(typeset("boʻyicha"), "bo‘yicha");
});

test("G-07: counts agree with their nouns", () => {
  const n = (base: string, count: number, locale: "ru" | "en" | "uz") =>
    translate(locale, pluralKey(base, count, locale) as MessageKey);
  assert.equal(n("unit.hour", 1, "ru"), "час");
  assert.equal(n("unit.hour", 2, "ru"), "часа");
  assert.equal(n("unit.hour", 11, "ru"), "часов");
  assert.equal(n("unit.hour", 2.5, "ru"), "часа");
  assert.equal(n("unit.week", 2, "ru"), "недели");
  assert.equal(n("unit.lesson", 1, "en"), "lesson");
  assert.equal(n("unit.lesson", 0, "en"), "lessons");
  assert.equal(n("unit.hour", 5, "uz"), "soat");
  for (const base of ["unit.hour", "unit.week", "unit.lesson", "unit.entry"]) {
    for (const form of ["one", "few", "many"]) assert.ok(`${base}.${form}` in messages, `${base}.${form}`);
  }
});

test("G-08: money is space-grouped with the unit in the interface's alphabet", () => {
  assert.equal(money(4_500_000, "UZS", "uz"), "4 500 000 söm");
  assert.equal(money(4_500_000, "UZS", "uz-Cyrl"), "4 500 000 сўм");
  assert.equal(money(4_500_000, "UZS", "ru"), "4 500 000 сум");
  assert.equal(money(4_500_000, "UZS", "en"), "4 500 000 UZS");
  assert.equal(moneyRange(4_500_000, 7_000_000, "UZS", "uz"), "4 500 000 – 7 000 000 söm");
});

test("G-10/G-21: dates follow the interface language, not the runtime", () => {
  const d = "2026-11-11T10:00:00Z";
  assert.equal(formatDate("uz", d, { year: "numeric", month: "long" }), "noyabr 2026");
  assert.equal(formatDate("uz", d), "11 noyabr 2026");
  assert.equal(formatDate("uz-Cyrl", d), "11 ноябр 2026");
  assert.match(formatDate("ru", d), /ноября 2026/);
  assert.match(formatDate("en", d), /November 2026/);
});

test("G-18: the Uzbek catalogue is in the reformed alphabet", () => {
  for (const [key, entry] of entries) {
    assert.equal(toNewAlphabet(entry.uz), entry.uz, `${key} still has old digraphs`);
    assert.doesNotMatch(entry.uz, /[öğÖĞ]'/, `${key} has an ASCII apostrophe after ö/ğ`);
  }
});

test("G-23: admin definitions do not name database tables or columns", () => {
  const schema = /\b[a-z]+_[a-z_]+\b|\b[a-z]+\.[a-z_]+_[a-z_]+\b/;
  for (const [key, entry] of entries) {
    if (!key.startsWith("an.def.") && !key.endsWith(".note")) continue;
    for (const text of [entry.uz, entry.ru, entry.en]) assert.doesNotMatch(text, schema, key);
  }
});
