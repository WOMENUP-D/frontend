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

// After an o or a g, the left quote, the right quote, the plain apostrophe and
// the modifier apostrophe ʼ itself all mean the letter mark ʻ — Uzbek has no
// glottal stop straight after o or g, and models write "koʼnikma" as often as
// "koʻnikma". Anywhere else they are the glottal stop (taʼlim).
const OKINA_LIKE = "ʻʼ‘’'";
// Spellings Uzbek does not have: w; a c outside ch; ph, th, ck; a capital
// inside the word; and — for English words that do contain sh/ch — a final
// -ship, a doubled e, and a y between two consonants ("psychology").
// Not tch / sch / chr / chn / oo: Uzbek has them too (tashkilotchi, ruscha,
// uchrashuv, kuchni, koordinator) — those English words are listed instead.
const FOREIGN =
  /[wW]|[cC](?![hH])|[pP][hH]|[tT][hH]|[cC][kK]|[a-z][A-Z]|ship$|ee|[bcdfghjklmnpqrstvxz]y[bcdfghjklmnpqrstvxz]/;
const NOT_FOREIGN = new Set<string>([]);
/** English words with "sh" or "ch" that look Uzbek to the letter test —
 *  course titles such as "General English", "Machine Learning",
 *  "Child Nutrition", "Business English" (G-02). */
const PROTECTED = new Set([
  "charpentier", "shopify", "chrome", "chanel", "porsche", "bosch",
  "english", "machine", "machines", "child", "children", "fashion", "research", "search",
  "coach", "coaching", "teach", "teacher", "teachers", "teaching", "approach", "chain",
  "change", "changes", "challenge", "challenges", "chance", "channel", "chapter", "character",
  "chart", "charts", "chat", "chef", "chess", "china", "chinese", "choice", "march", "much",
  "rich", "such", "each", "branch", "launch", "lunch", "dashboard", "fresh", "flash",
  "push", "crash", "smash", "hash", "hashtag", "fish", "polish", "spanish", "british",
  "irish", "turkish", "chemistry", "chemical", "archive", "architecture", "mechanic",
  "mechanics", "mechanical", "merchant", "shell", "shift", "ship", "shop", "shops",
  "shopping", "short", "sharp", "share", "shared", "sharing", "finish", "publish",
  "publishing", "establish", "bachelor", "leadership", "ownership", "internship",
  "scholarship", "partnership", "membership", "championship", "mentorship",
  "speech", "school", "schools", "choose", "technology", "technologies", "tech", "match",
  "kitchen", "sketch", "switch", "watch", "schedule", "scheme", "psychology", "christmas", "sheet", "sheets", "headhunter", "punch", "brunch",
]);
const WORD = /[A-Za-zÖöĞğŞşÇç][A-Za-z0-9ÖöĞğŞşÇçʻʼ‘’'-]*/g;
const VERBATIM =
  /(?:https?:\/\/|www\.)[^\s,;]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\b[A-Za-z0-9-]+\.(?:uz|com|org|net|io|ru|gov|edu)\b/gi;
const RULES: ReadonlyArray<[RegExp, string]> = [
  // "qöʼlda": the new letter *and* the old mark — the mark is a leftover.
  [new RegExp(`([ÖöĞğ])[${OKINA_LIKE}]`, "g"), "$1"],
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
  const bare = word.toLowerCase().replace(/['’ʼ]+$/, "");
  if (NOT_FOREIGN.has(bare)) return false;
  return PROTECTED.has(bare) || FOREIGN.test(word);
}

/** Uzbek abbreviations the foreign-word heuristic would mistake for brands. */
const ABBREVIATIONS: Readonly<Record<string, string>> = { MChJ: "MÇJ", AQSh: "AQŞ", ShHM: "ŞHM" };

function convertWord(word: string): string {
  if (word in ABBREVIATIONS) return ABBREVIATIONS[word];
  if (isForeignWord(word)) return word;
  return RULES.reduce((text, [pattern, repl]) => text.replace(pattern, repl), word);
}

/** Cyrillic letters to the reformed Latin, for the one case where a Cyrillic
 *  letter is certainly a slip: inside a word that is otherwise Latin
 *  ("bölади", "köniкmalar" — model output mixes scripts mid-word). */
const CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "x", ц: "ts", ч: "ç", ш: "ş", щ: "şç", ъ: "ʼ", ы: "i", ь: "",
  э: "e", ю: "yu", я: "ya", ў: "ö", қ: "q", ғ: "ğ", ҳ: "h",
};
/** Letters of neighbouring alphabets that are not Uzbek and that models slip
 *  into Uzbek words: Turkish ü and dotless ı, and ñ for the ng sound. */
const NOT_UZBEK: Readonly<Record<string, string>> = { ü: "u", Ü: "U", ı: "i", ñ: "ng", Ñ: "Ng" };
const ANY_WORD = /[\p{L}][\p{L}\p{N}]*/gu;
const CYRILLIC_LETTER = /[Ѐ-ӿ]/;
const LATIN_LETTER = /[A-Za-zÖöĞğŞşÇç]/;
const NOT_UZBEK_LETTER = /[üÜıñÑ]/;

function cyrillicLetter(letter: string): string {
  const latin = CYRILLIC_TO_LATIN[letter.toLowerCase()];
  if (latin === undefined) return letter;
  return letter !== letter.toLowerCase() ? latin.charAt(0).toUpperCase() + latin.slice(1) : latin;
}

/**
 * Repairs the script slips model-written Uzbek makes inside a word: a
 * Cyrillic letter inside an otherwise Latin word, and the Turkish ü / ı or ñ,
 * are never right in Uzbek Latin. Whole Cyrillic words are left alone — a
 * Russian name quoted in an Uzbek sentence is not a slip.
 * Mirrors `mend_script` in `app/services/uzbek.py`.
 */
export function mendScript(text: string): string {
  if (!text) return text;
  return text.replace(ANY_WORD, (word) => {
    let out = word;
    if (CYRILLIC_LETTER.test(out) && LATIN_LETTER.test(out)) {
      out = [...out].map((ch) => (CYRILLIC_LETTER.test(ch) ? cyrillicLetter(ch) : ch)).join("");
    }
    if (NOT_UZBEK_LETTER.test(out)) out = [...out].map((ch) => NOT_UZBEK[ch] ?? ch).join("");
    return out;
  });
}

/** Uzbek text in the reformed alphabet, whatever alphabet it arrived in. */
export function toNewAlphabet(input: string): string {
  if (!input) return input;
  const text = mendScript(input);
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
