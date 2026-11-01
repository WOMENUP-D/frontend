import assert from "node:assert/strict";
import { test } from "node:test";
import { hasOldDigraphs, looksUzbek, toNewAlphabet, toNewAlphabetIfUzbek } from "./uzbek";

test("old digraphs become the reformed letters", () => {
  assert.equal(toNewAlphabet("Oʻz ishingizni boshlang"), "Öz işingizni boşlang");
  assert.equal(toNewAlphabet("Toshkent shahri"), "Toşkent şahri");
  assert.equal(toNewAlphabet("Chiroyli gʻoya"), "Çiroyli ğoya");
  assert.equal(toNewAlphabet("O‘rganish"), "Örganiş");
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
