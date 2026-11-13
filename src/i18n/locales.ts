/**
 * Locale names and the cookie that carries the choice — kept apart from the
 * dictionary so the middleware can read them without bundling every string.
 */

/** uz-Cyrl is the same language as uz in a different script — see translit.ts. */
export type Locale = "uz" | "uz-Cyrl" | "ru" | "en";
export type WrittenLocale = "uz" | "ru" | "en";

export const LOCALES: ReadonlyArray<{ code: Locale; short: string; title: string }> = [
  { code: "uz", short: "UZ", title: "Özbekça (lotin)" },
  { code: "uz-Cyrl", short: "ЎЗ", title: "Ўзбекча (кирилл)" },
  { code: "ru", short: "RU", title: "Русский" },
  { code: "en", short: "EN", title: "English" },
];

/** uz-Latn is the portal's primary language and the default for everyone
 *  who has not chosen another. */
export const DEFAULT_LOCALE: Locale = "uz";

/** One name for the choice in the cookie (read by the server) and in
 *  localStorage (read by older code and the e2e tests). */
export const LOCALE_COOKIE = "womanup.locale";

/** The query parameter that selects a locale for one URL — what the hreflang
 *  alternates point at, since the paths themselves carry no locale. */
export const LOCALE_PARAM = "lang";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "uz" || value === "uz-Cyrl" || value === "ru" || value === "en";
}

