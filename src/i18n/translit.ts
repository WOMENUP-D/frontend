/**
 * Uzbek Latin → Cyrillic transliteration.
 *
 * uz-Latn and uz-Cyrl are the same language in two scripts, so the Cyrillic
 * locale is derived mechanically instead of being kept as a second dictionary.
 * That also covers content coming from the database (programme titles,
 * opportunity names), which only ever ships a Latin Uzbek variant.
 */

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
 * Order matters: the URL pattern has to be tried before the bare domain, or
 * "https://womanup.uz" is matched from "womanup.uz" onwards and the scheme is
 * left behind to be transliterated on its own.
 */
const VERBATIM =
  /(?:https?:\/\/|www\.)[^\s,;]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\b[A-Za-z0-9-]+\.(?:uz|com|org|net|io|ru|gov|edu)\b/gi;

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

function convertProse(text: string): string {
  // Split on runs of Latin letters plus the apostrophes Uzbek uses.
  return text.replace(/[A-Za-z][A-Za-z'ʼ’ʻ‘ōḡ]*/g, (word) => convertWord(word));
}
