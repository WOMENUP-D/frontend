/**
 * Uzbek Latin → Cyrillic transliteration.
 *
 * Reads both the reformed alphabet (ö ğ ş ç) the portal writes and the old
 * digraphs (oʻ gʻ sh ch) still found in older records.
 *
 * uz-Latn and uz-Cyrl are the same language in two scripts, so the Cyrillic
 * locale is derived mechanically instead of being kept as a second dictionary.
 * That also covers content coming from the database (programme titles,
 * opportunity names), which only ever ships a Latin Uzbek variant.
 */

import { isForeignWord } from "./uzbek";

// Digraphs and special letters first — order is significant.
const DIGRAPHS: ReadonlyArray<[string, string]> = [
  // "yo'" is y + oʻ (йў), not yo + ʼ — it must outrank the "yo" rule below.
  // "yog'" stays yo + gʻ (ёғ), which the shorter rules handle correctly.
  ["yo'", "йў"], ["yoʻ", "йў"], ["yo‘", "йў"],
  ["o'", "ў"], ["oʻ", "ў"], ["o‘", "ў"], ["ō", "ў"],
  ["g'", "ғ"], ["gʻ", "ғ"], ["g‘", "ғ"], ["ḡ", "ғ"],
  ["sh", "ш"],
  ["ch", "ч"],
  ["ts", "ц"],
  ["yo", "ё"],
  ["yu", "ю"],
  ["ya", "я"],
  ["ye", "е"],
];

const SINGLES: Readonly<Record<string, string>> = {
  a: "а", b: "б", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и",
  j: "ж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ",
  r: "р", s: "с", t: "т", u: "у", v: "в", x: "х", y: "й", z: "з",
  c: "к",
  // The reformed alphabet's single letters.
  "ö": "ў", "ğ": "ғ", "ş": "ш", "ç": "ч",
  // tutuq belgisi — the apostrophe that is not part of oʻ / gʻ
  "'": "ъ", "ʼ": "ъ", "’": "ъ",
};

/**
 * Loanwords ending in -o. The apostrophe is ambiguous in Latin Uzbek: in `yo'l`
 * it forms the letter ў, but in `demo'ni` it only separates a borrowed stem
 * from its case suffix. For these stems the two halves are converted
 * separately and the apostrophe is dropped.
 */
const O_LOANWORDS = new Set([
  "demo", "video", "audio", "radio", "studio", "portfolio", "logo",
  "foto", "avto", "mikro", "makro", "metro", "kino", "byuro",
]);

/** Words whose mechanical output would be wrong or unidiomatic. */
const OVERRIDES: Readonly<Record<string, string>> = {
  womanup: "WomanUP",
  ai: "AI",
  id: "ID",
  kpi: "KPI",
  demo: "демо",
  edu: "Edu",
  job: "Job",
  invest: "Invest",
  hub: "HUB",
  score: "Score",
  development: "Development",
  navigator: "Навигатор",
  smm: "SMM",
  it: "IT",
  uz: "UZ",
  ru: "RU",
  en: "EN",
};

function matchCase(source: string, converted: string): string {
  if (source === source.toUpperCase() && source !== source.toLowerCase()) {
    return converted.toUpperCase();
  }
  if (source[0] === source[0]?.toUpperCase()) {
    return converted.charAt(0).toUpperCase() + converted.slice(1);
  }
  return converted;
}

function convertWord(word: string): string {
  const lower = word.toLowerCase();

  const override = OVERRIDES[lower];
  if (override !== undefined) return matchCase(word, override);

  // "demo'ni" is demo + ni, not dem + oʻ + ni.
  const split = lower.match(/^([a-z]+)['ʼ’]([a-z]+)$/);
  if (split && O_LOANWORDS.has(split[1])) {
    return matchCase(word, convertWord(split[1]) + convertWord(split[2]));
  }

  let out = "";
  let index = 0;

  while (index < lower.length) {
    // Word-initial "e" is "э"; elsewhere it is "е".
    if (index === 0 && lower[0] === "e" && lower.slice(0, 2) !== "ye") {
      out += "э";
      index += 1;
      continue;
    }

    const digraph = DIGRAPHS.find((pair) => lower.startsWith(pair[0], index));
    if (digraph) {
      out += digraph[1];
      index += digraph[0].length;
      continue;
    }

    const single = SINGLES[lower[index]];
    out += single ?? lower[index];
    index += 1;
  }

  return matchCase(word, out);
}

/**
 * Things that are addresses rather than words, and must survive untouched.
 *
 * An email address and a URL are typed back in by the reader; converting them
 * does not translate anything, it breaks them. The footer was offering
 * "инфо@WomanUP.UZ" as a contact and "ҳттпс://" as a link — neither of which
 * resolves to anything.
 *
 * A `{placeholder}` is an address of the same kind: `t()` fills it after the
 * template has been transliterated, so "{n} soat" must reach `fill()` as
 * "{n} соат", not "{н} соат" (G-01).
 *
 * Order matters: the URL pattern has to be tried before the bare domain, or
 * "https://womanup.uz" is matched from "womanup.uz" onwards and the scheme is
 * left behind to be transliterated on its own.
 */
const VERBATIM =
  /\{[A-Za-z_]\w*\}|(?:https?:\/\/|www\.)[^\s,;]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\b[A-Za-z0-9-]+\.(?:uz|com|org|net|io|ru|gov|edu)\b/gi;

/** Convert a Latin-Uzbek string to Cyrillic, leaving other scripts untouched. */
export function toCyrillic(text: string): string {
  if (!text) return text;

  // Walk the string, converting the prose between addresses and copying the
  // addresses across as they were.
  let out = "";
  let last = 0;
  for (const match of text.matchAll(VERBATIM)) {
    const start = match.index ?? 0;
    out += convertProse(text.slice(last, start)) + match[0];
    last = start + match[0].length;
  }
  return out + convertProse(text.slice(last));
}

/** Uzbek abbreviations: capitals inside them are letters, not a brand. */
const ABBREVIATIONS: Readonly<Record<string, string>> = {
  MChJ: "МЧЖ", "MÇJ": "МЧЖ", YaTT: "ЯТТ", AQSh: "АҚШ", "AQŞ": "АҚШ", ShHM: "ШҲМ", "ŞHM": "ШҲМ",
};

/**
 * English words with nothing un-Uzbek in their spelling, which the letter
 * heuristic below cannot catch. Transliterated they become nonsense
 * ("эмаил", "Бусинесс") rather than Cyrillic Uzbek, so they stay Latin —
 * the way Uzbek Cyrillic text writes them.
 */
const ENGLISH = new Set([
  // Not loanwords Uzbek writes in Cyrillic ("маркетинг", "платформа",
  // "дизайн", "менежер" are, and transliterate fine).
  "email", "e-mail", "online", "offline", "google", "digital", "business", "integration",
  "world", "excel", "canva", "figma", "python", "youtube", "linkedin", "junior", "middle",
  "senior", "freelance", "science", "english", "school", "academy", "learning", "machine",
  "web", "developer", "startup", "coursera", "stepik", "udemy", "edx",
  "the", "and", "for", "of", "to", "with",
]);

/** A word that is not Uzbek: un-Uzbek spelling (w, a lone c, ph, th, ck, a
 *  capital inside the word — see uzbek.ts) or a known English word. */
function isForeign(word: string): boolean {
  const lower = word.toLowerCase();
  if (OVERRIDES[lower] !== undefined) return false;
  return ENGLISH.has(lower.replace(/['’ʼ]+$/, "")) || isForeignWord(word);
}

const LATIN_WORD = /[A-Za-zÖöĞğŞşÇç][A-Za-zÖöĞğŞşÇç'ʼ’ʻ‘ōḡ-]*[A-Za-zÖöĞğŞşÇç'ʼ’ʻ‘ōḡ]|[A-Za-zÖöĞğŞşÇç]/g;

function convertProse(text: string): string {
  // Words first, so a run of capitalised words around a foreign one — a
  // brand or a course title such as "World Business Integration Platform" —
  // can be kept Latin as a whole (G-13).
  const words = [...text.matchAll(LATIN_WORD)];
  if (words.length === 0) return text;
  const keep = words.map((m) => !(m[0] in ABBREVIATIONS) && isForeign(m[0]));
  // A portal name with an Uzbek suffix ("WomanUPʼda") stays Latin itself but
  // does not make its neighbours foreign.
  // Only un-Uzbek spelling seeds a title: a dictionary word ("Google") at the
  // start of an Uzbek sentence must not drag "Brauzer" along with it.
  const seeds = words.map(
    (m, i) => keep[i] && isForeignWord(m[0]) && OVERRIDES[m[0].toLowerCase().split(/['’ʼ]/)[0]] === undefined,
  );
  const capital = (w: string) => /^[A-Z]/.test(w);
  // Spread "foreign" across neighbouring capitalised words joined only by
  // spaces, "&" or "-" (a title), never into lower-case Uzbek prose.
  for (let pass = 0; pass < 4; pass += 1) {
    for (let i = 0; i < words.length; i += 1) {
      if (seeds[i] || !capital(words[i][0])) continue;
      for (const j of [i - 1, i + 1]) {
        if (j < 0 || j >= words.length || !seeds[j] || !capital(words[j][0])) continue;
        const [a, b] = j < i ? [words[j], words[i]] : [words[i], words[j]];
        const between = text.slice((a.index ?? 0) + a[0].length, b.index ?? 0);
        if (/^[\s&:+\-–]*$/.test(between)) {
          keep[i] = true;
          seeds[i] = true;
        }
      }
    }
  }
  let out = "";
  let last = 0;
  words.forEach((m, i) => {
    const start = m.index ?? 0;
    const word = m[0];
    out += text.slice(last, start);
    if (word in ABBREVIATIONS) out += ABBREVIATIONS[word];
    else if (keep[i]) out += word;
    else out += word.split(/(-)/).map((part) => (part === "-" || !part ? part : convertWord(part))).join("");
    last = start + word.length;
  });
  return out + text.slice(last);
}
