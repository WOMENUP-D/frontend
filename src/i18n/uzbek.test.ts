import assert from "node:assert/strict";
import { test } from "node:test";
import { hasOldDigraphs, looksUzbek, mendScript, toNewAlphabet, toNewAlphabetIfUzbek } from "./uzbek";

test("old digraphs become the reformed letters", () => {
  assert.equal(toNewAlphabet("Oʻz ishingizni boshlang"), "Öz işingizni boşlang");
  assert.equal(toNewAlphabet("Toshkent shahri"), "Toşkent şahri");
  assert.equal(toNewAlphabet("Chiroyli gʻoya"), "Çiroyli ğoya");
  assert.equal(toNewAlphabet("O‘rganish"), "Örganiş");
  assert.equal(toNewAlphabet("to'g'ridan-to'g'ri"), "töğridan-töğri");
  assert.equal(toNewAlphabet("To’g’ri yo’l"), "Töğri yöl");
  assert.equal(toNewAlphabet("ta'lim va ma'no"), "ta'lim va ma'no");
  assert.equal(toNewAlphabet("YaTT yoki MChJ"), "YaTT yoki MÇJ");
  assert.equal(toNewAlphabet("maʼlumot va taʼlim"), "maʼlumot va taʼlim");
});

test("case follows the word", () => {
  assert.equal(toNewAlphabet("SHAHAR MARKAZI"), "ŞAHAR MARKAZI");
  assert.equal(toNewAlphabet("Shahar"), "Şahar");
  assert.equal(toNewAlphabet("Oʻzbekiston"), "Özbekiston");
});

test("foreign words and addresses are left alone", () => {
  assert.equal(toNewAlphabet("Photoshop asoslari"), "Photoshop asoslari");
  assert.equal(toNewAlphabet("ChatGPT bilan ishlash"), "ChatGPT bilan işlaş");
  assert.equal(toNewAlphabet("WomanUPʼda ochiq"), "WomanUPʼda oçiq");
  assert.equal(toNewAlphabet("Charpentier"), "Charpentier");
  assert.equal(toNewAlphabet("https://womanup.uz/dasturlar/shahar"), "https://womanup.uz/dasturlar/shahar");
  assert.equal(toNewAlphabet("info@womanup.uz"), "info@womanup.uz");
});

test("reformed text and other scripts pass through unchanged", () => {
  for (const text of ["Öz işingiz", "Саломатлик", ""]) {
    assert.equal(toNewAlphabet(text), text);
  }
  assert.equal(hasOldDigraphs("Toshkent"), true);
  assert.equal(hasOldDigraphs("Toşkent"), false);
});

test("free text is converted only when it is evidently Uzbek", () => {
  // English carries "sh" and "ch" too: a plan written in English must survive.
  assert.equal(toNewAlphabetIfUzbek("Choose a course and finish it"), "Choose a course and finish it");
  assert.equal(toNewAlphabetIfUzbek("Выберите курс"), "Выберите курс");
  assert.equal(toNewAlphabetIfUzbek("Bu hafta bitta kursni tugating va shaxsiy reja tuzing"), "Bu hafta bitta kursni tugating va şaxsiy reja tuzing");
  assert.equal(looksUzbek("Oʻqish"), true);
  assert.equal(looksUzbek("Reading"), false);
});

test("G-14: script slips in model-written Uzbek are mended (mirrors uzbek.py)", () => {
  // A Cyrillic letter inside a Latin word.
  assert.equal(toNewAlphabet("dalil bölади"), "dalil böladi");
  assert.equal(toNewAlphabet("raqamli köniкmalar"), "raqamli könikmalar");
  // Turkish ü / ı and ñ are not Uzbek letters.
  assert.equal(toNewAlphabet("böljgan üç yönaliş"), "böljgan uç yönaliş");
  assert.equal(toNewAlphabet("boşlanğıç qiziqişiñiz"), "boşlanğiç qiziqişingiz");
  // ʼ after o / g is the okina, not a glottal stop.
  assert.equal(toNewAlphabet("koʼnikma va roʼyxat"), "könikma va röyxat");
  // The new letter and the old mark together: the mark is a leftover.
  assert.equal(toNewAlphabet("qöʼlda"), "qölda");
  assert.equal(toNewAlphabet("böʻlim"), "bölim");
  // Untouched: whole Cyrillic words, the glottal stop elsewhere, English.
  assert.equal(toNewAlphabet("Курс Иванова"), "Курс Иванова");
  assert.equal(toNewAlphabet("maʼlumot va taʼlim"), "maʼlumot va taʼlim");
  assert.equal(toNewAlphabet("Business English"), "Business English");
  assert.equal(mendScript("Привет"), "Привет");
});
