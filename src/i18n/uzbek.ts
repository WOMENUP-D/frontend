/**
 * Uzbek Latin as the portal writes it: the reformed alphabet.
 *
 * The reform replaced four digraphs with single letters — Oʻ oʻ → Ö ö,
 * Gʻ gʻ → Ğ ğ, Sh sh → Ş ş, Ch ch → Ç ç. The catalogue and the content are
 * written that way in the source; everything that arrives from the API —
 * programme titles, news, plans, assistant answers, some of it stored before
 * the change — passes through `toNewAlphabet` before it is shown.
 *
 * Only Uzbek words change. A word that cannot be Uzbek is left alone: one with
 * a w, a c that is not part of ch, ph, th or ck, a capital inside it (ChatGPT,
 * WomanUP), a protected name, or an address. Case follows the word:
 * "Shahar" → "Şahar", "SHAHAR" → "ŞAHAR", "Oʻzbekiston" → "Özbekiston".
 * The glottal stop ʼ is unchanged by the reform.
 *
 * Mirrors `app/services/uzbek.py` on the server; keep the two in step.
 */

const OKINA_LIKE = "ʻ‘";
const FOREIGN = /[wW]|[cC](?![hH])|[pP][hH]|[tT][hH]|[cC][kK]|[a-z][A-Z]/;
const PROTECTED = new Set(["charpentier", "shopify", "chrome", "chanel", "porsche", "bosch"]);
const WORD = /[A-Za-zÖöĞğŞşÇç][A-Za-z0-9ÖöĞğŞşÇçʻʼ‘’'-]*/g;
const VERBATIM =
  /(?:https?:\/\/|www\.)[^\s,;]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\b[A-Za-z0-9-]+\.(?:uz|com|org|net|io|ru|gov|edu)\b/gi;
const RULES: ReadonlyArray<[RegExp, string]> = [
  [new RegExp(`O[${OKINA_LIKE}]`, "g"), "Ö"],
  [new RegExp(`o[${OKINA_LIKE}]`, "g"), "ö"],
  [new RegExp(`G[${OKINA_LIKE}]`, "g"), "Ğ"],
  [new RegExp(`g[${OKINA_LIKE}]`, "g"), "ğ"],
  [/S[hH]/g, "Ş"],
  [/sh/g, "ş"],
  [/C[hH]/g, "Ç"],
  [/ch/g, "ç"],
];

export function isForeignWord(word: string): boolean {
  return PROTECTED.has(word.toLowerCase().replace(/['’]+$/, "")) || FOREIGN.test(word);
}

/** Uzbek abbreviations the foreign-word heuristic would mistake for brands. */
const ABBREVIATIONS: Readonly<Record<string, string>> = { MChJ: "MÇJ", AQSh: "AQŞ", ShHM: "ŞHM" };

function convertWord(word: string): string {
  if (word in ABBREVIATIONS) return ABBREVIATIONS[word];
  if (isForeignWord(word)) return word;
  return RULES.reduce((text, [pattern, repl]) => text.replace(pattern, repl), word);
}

/** Uzbek text in the reformed alphabet, whatever alphabet it arrived in. */
export function toNewAlphabet(text: string): string {
  if (!text) return text;
  let out = "";
  let last = 0;
  for (const match of text.matchAll(VERBATIM)) {
    const start = match.index ?? 0;
    out += text.slice(last, start).replace(WORD, convertWord) + match[0];
    last = start + match[0].length;
  }
  return out + text.slice(last).replace(WORD, convertWord);
}

/** Whether a text still carries oʻ / gʻ / sh / ch in Uzbek words. */
export function hasOldDigraphs(text: string | null | undefined): boolean {
  return Boolean(text) && toNewAlphabet(text as string) !== text;
}

const UZBEK_HINTS =
  /[ʻʼ]|[ÖöĞğŞşÇç]|\b(?:va|bilan|uchun|uçun|ham|emas|yoki|kerak|boʻl|böl|qil|yaxshi|siz|biz|bu|shu|şu|har|hech|heç|lekin|ammo|agar)\b/gi;
const CYRILLIC = /[Ѐ-ӿ]/;

/** A cheap guess for free text whose language nobody declared: Latin script
 *  with Uzbek letters or a few of its function words. English has "sh" and
 *  "ch" everywhere, so a text that merely contains them is not evidence. */
export function looksUzbek(text: string | null | undefined): boolean {
  if (!text || CYRILLIC.test(text)) return false;
  // One letter no other language here uses is decisive; otherwise two words.
  if (/[\u02bb\u02bcÖöĞğŞşÇç]/.test(text)) return true;
  return (text.match(UZBEK_HINTS) ?? []).length >= 2;
}

/** The reformed alphabet for text that is evidently Uzbek; anything else untouched. */
export function toNewAlphabetIfUzbek(text: string): string {
  return looksUzbek(text) ? toNewAlphabet(text) : text;
}
