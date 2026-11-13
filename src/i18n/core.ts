/**
 * The parts of i18n that run anywhere — the browser, a server component,
 * `generateMetadata`, a unit test. No React, no `window`.
 *
 * `index.tsx` wraps these in a context for client components; `server.ts`
 * reads the locale from the request for server code. Both call the same
 * functions, so a title in `<head>` and the heading on the page are produced
 * by the same rules.
 */

import type { MessageKey } from "./messages";
import { toCyrillic } from "./translit";
import { toNewAlphabet, toNewAlphabetIfUzbek } from "./uzbek";

export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_PARAM,
  isLocale,
  type Locale,
  type WrittenLocale,
} from "./locales";
import type { Locale, WrittenLocale } from "./locales";

/** The BCP 47 tag for `<html lang>` and `lang=` attributes. */
export function htmlLang(locale: Locale): string {
  return locale === "uz-Cyrl" ? "uz-Cyrl" : locale === "uz" ? "uz-Latn" : locale;
}

/** The dictionary column a locale reads; uz-Cyrl reads uz and transliterates. */
export function writtenOf(locale: Locale): WrittenLocale {
  return locale === "uz-Cyrl" ? "uz" : locale;
}

/** The tag `Intl` formatters get. ICU builds without Uzbek data fall back to
 *  the root locale (US grouping, English month names), so Uzbek dates and
 *  numbers ask for "uz-Latn-UZ" and are checked at the call site where it
 *  matters (see `money`). */
export function intlLocale(locale: Locale): string {
  if (locale === "uz-Cyrl") return "uz-Cyrl-UZ";
  if (locale === "uz") return "uz-Latn-UZ";
  return locale === "ru" ? "ru-RU" : "en-GB";
}

/**
 * Renders Uzbek apostrophes with characters the webfont actually carries.
 *
 * Google Fonts does not ship U+02BB / U+02BC in the Latin subsets it serves,
 * so the browser would fall back to a system face for that one glyph and
 * break the word apart on screen. The stored letter stays untouched — the
 * API, the search index and the exports keep the official character; only
 * the pixels change.
 *
 * Since the alphabet reform oʻ and gʻ are written ö and ğ, so the mark left in
 * running text is the tutuq belgisi ʼ (U+02BC) — an apostrophe, drawn as a
 * right single quote ’ (U+2019). The okina ʻ (U+02BB) only survives in older
 * records and keeps its left-quote shape ‘ (U+2018).
 */
export function typeset(text: string): string {
  return text.replace(/ʼ/g, "’").replace(/ʻ/g, "‘");
}

/** Localised JSON coming from the API, e.g. Program.title_i18n. */
export type I18nField = Record<string, string> | undefined | null;

/** Fills `{name}` placeholders. Unknown names are left as written. */
export function fill(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    params[name] !== undefined ? String(params[name]) : whole,
  );
}

/**
 * The dictionary, one table per written language (QA H-02).
 *
 * This module never imports `messages.ts` itself — doing so would put every
 * language into every browser bundle. Tables are registered instead: in the
 * browser (and in server-rendered client components) by `dictionary.ts`, which
 * bundles Uzbek and fetches Russian or English on demand; in server code by
 * `catalog.ts`, which `server.ts` imports and which registers all three.
 */
type Table = Readonly<Record<string, string>>;
const tables: Partial<Record<WrittenLocale, Table>> = {};

export function registerTable(language: WrittenLocale, table: Table): void {
  tables[language] = table;
}

export function hasTable(language: WrittenLocale): boolean {
  return tables[language] !== undefined;
}

/** UI string by key, in the locale's script. A language whose table is not
 *  loaded yet falls back to Uzbek per key, then to the key itself. */
export function translate(locale: Locale, key: MessageKey): string {
  const text = tables[writtenOf(locale)]?.[key] ?? tables.uz?.[key];
  if (text === undefined) return key;
  return typeset(locale === "uz-Cyrl" ? toCyrillic(text) : text);
}

/**
 * Whether the Uzbek column of an API field really holds Uzbek.
 *
 * Partner courses arrive with one title copied into every language; an
 * English "Machine Learning" stored under `uz` must not be reformed into
 * "Maçine Learning". A value that equals its Russian or English sibling is
 * not a translation, and a value that reads as English is not Uzbek.
 */
function uzbekColumnIsUzbek(field: Record<string, string>): boolean {
  const uz = field.uz;
  if (uz === undefined) return false;
  if ((field.en !== undefined && field.en === uz) || (field.ru !== undefined && field.ru === uz)) {
    return false;
  }
  return true;
}

/** Value out of an API i18n field, with a sensible fallback chain. */
export function translateField(locale: Locale, field: I18nField): string {
  if (!field) return "";
  const written = writtenOf(locale);
  // Prefer the requested language, then Uzbek, then whatever exists.
  const text = field[written] ?? field.uz ?? Object.values(field)[0] ?? "";
  // Only an Uzbek source is converted or transliterated; ru/en stay as they
  // are — including a Russian or English fallback shown for want of an
  // Uzbek field, and a foreign title merely copied into the Uzbek column.
  const usedUzbek = field[written] !== undefined ? written === "uz" : field.uz !== undefined;
  if (!usedUzbek) return typeset(text);
  if (!uzbekColumnIsUzbek(field)) return typeset(text);
  // Uzbek stored in the old digraphs is brought to the reformed alphabet
  // before anything else reads it — see uzbek.ts.
  const reformed = toNewAlphabet(text);
  return typeset(locale === "uz-Cyrl" ? toCyrillic(reformed) : reformed);
}

/** Free Uzbek text from the API — converted only when it is evidently Uzbek. */
export function translateFree(locale: Locale, text: string | null | undefined): string {
  if (!text) return "";
  const reformed = toNewAlphabetIfUzbek(text);
  return typeset(locale === "uz-Cyrl" ? toCyrillic(reformed) : reformed);
}

/**
 * Picks the right noun form for a count.
 *
 * Russian needs three: one результат, two-four результата, five результатов —
 * and the rule is not "last digit", because 11 to 14 take the many-form
 * whatever they end in. Uzbek inflects the verb rather than the noun after a
 * numeral, so one form covers every count; English needs two.
 */
export function pluralKey(base: string, count: number, locale: string): string {
  if (locale === "ru") {
    const mod100 = Math.abs(count) % 100;
    const mod10 = mod100 % 10;
    if (!Number.isInteger(count)) return `${base}.few`;
    if (mod100 >= 11 && mod100 <= 14) return `${base}.many`;
    if (mod10 === 1) return `${base}.one`;
    if (mod10 >= 2 && mod10 <= 4) return `${base}.few`;
    return `${base}.many`;
  }
  // uz, uz-Cyrl and en all resolve on a simple one/other split; the Uzbek
  // entries carry the same word in both, which is correct for the language.
  return count === 1 ? `${base}.one` : `${base}.many`;
}

/** Uzbek month names, for runtimes whose ICU has no Uzbek data and would
 *  otherwise print "November" into an Uzbek sentence. */
const UZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

/**
 * A date in the interface language — never the browser's.
 *
 * Russian and English go through `Intl`. Uzbek is composed here: ICU builds
 * differ in whether they carry Uzbek at all (Node's small-icu and some
 * browsers answer with English month names), and the server and the browser
 * must print the same string or hydration breaks.
 */
export function formatDate(
  locale: Locale,
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (writtenOf(locale) !== "uz") return date.toLocaleDateString(intlLocale(locale), options);
  const parts: string[] = [];
  if (options.day) parts.push(String(date.getDate()));
  if (options.month) {
    if (options.month === "numeric" || options.month === "2-digit") {
      return [options.day ? String(date.getDate()).padStart(2, "0") : null, String(date.getMonth() + 1).padStart(2, "0"), options.year ? String(date.getFullYear()) : null]
        .filter(Boolean)
        .join(".");
    }
    const month = UZ_MONTHS[date.getMonth()];
    parts.push(options.month === "short" || options.month === "narrow" ? month.slice(0, 3) : month);
  }
  if (options.year) parts.push(String(date.getFullYear()));
  const text = parts.join(" ");
  return locale === "uz-Cyrl" ? toCyrillic(text) : text;
}

/** A plain number with the grouping the language uses: a (non-breaking)
 *  space in Uzbek and Russian — "4 500 000" — and a comma in English. ICU
 *  without Uzbek data would fall back to US commas, so Uzbek borrows the
 *  Russian grouping, which is the same convention. */
export function formatNumber(locale: Locale, value: number): string {
  const tag = writtenOf(locale) === "en" ? "en-GB" : "ru-RU";
  return new Intl.NumberFormat(tag, { maximumFractionDigits: 2 }).format(value).replace(/ /g, " ");
}
