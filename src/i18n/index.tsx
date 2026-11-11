"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { MessageKey } from "./messages";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  fill,
  formatDate,
  htmlLang,
  intlLocale,
  isLocale,
  pluralKey,
  translate,
  translateField,
  translateFree,
  writtenOf,
  type I18nField,
  type Locale,
} from "./core";

export { LOCALES, typeset, htmlLang, intlLocale, formatDate } from "./core";
export type { Locale, I18nField } from "./core";

type Params = Record<string, string | number>;

interface I18nValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** UI string by key; `{name}` placeholders are filled from `params`. */
  t: (key: MessageKey, params?: Params) => string;
  /** A count with its noun in the right grammatical number: `base` names a
   *  key family with `.one` / `.few` / `.many` members (Russian needs all
   *  three, English two, Uzbek one), and `{n}` is filled with the count. */
  tn: (base: string, n: number | null | undefined, params?: Params) => string;
  /** Value out of an API i18n field, with a sensible fallback chain. */
  tx: (field: I18nField) => string;
  /** Free Uzbek text from the API — converted when the script is Cyrillic. */
  tu: (text: string | null | undefined) => string;
  /** A date in the interface language — never the browser's. */
  fmtDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  /** The tag `Intl` formatters should be given for this interface language. */
  intl: string;
  /** The locale to send the server. `uz-Cyrl` is Uzbek in another script and
   *  is transliterated in the browser, so the server only ever needs three. */
  apiLocale: "uz" | "ru" | "en";
}

const I18nContext = createContext<I18nValue | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;

function readCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE.replace(".", "\\.")}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=${ONE_YEAR}; samesite=lax${secure}`;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The interface language, decided on the server.
 *
 * The choice lives in a cookie the root layout reads, so the first HTML a
 * visitor receives is already in her language and `<html lang>` says so —
 * no Uzbek flash before hydration, and crawlers and link previews see the
 * same page as she does. localStorage keeps a copy for code that reads it
 * there, and a choice made before the cookie existed is carried over once.
 */
export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  useEffect(() => {
    // A visitor who chose a language before the cookie existed: adopt it once.
    if (readCookie() === null) {
      const stored = storage()?.getItem(LOCALE_COOKIE) ?? null;
      if (isLocale(stored) && stored !== initialLocale) {
        writeCookie(stored);
        setLocaleState(stored);
        router.refresh();
        return;
      }
      writeCookie(initialLocale);
    }
    storage()?.setItem(LOCALE_COOKIE, initialLocale);
    // Only on mount: later changes go through setLocale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = htmlLang(locale);
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      writeCookie(next);
      storage()?.setItem(LOCALE_COOKIE, next);
      // Server-rendered parts — the page title and description — follow.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nValue>(() => {
    const t = (key: MessageKey, params?: Params) => fill(translate(locale, key), params);
    const tn = (base: string, n: number | null | undefined, params?: Params) =>
      fill(translate(locale, pluralKey(base, n ?? 0, locale) as MessageKey), { n: n ?? 0, ...params });
    const intl = intlLocale(locale);
    const fmtDate = (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDate(locale, value, options);
    return {
      locale,
      setLocale,
      t,
      tn,
      tx: (field: I18nField) => translateField(locale, field),
      tu: (text: string | null | undefined) => translateFree(locale, text),
      fmtDate,
      intl,
      apiLocale: writtenOf(locale),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}

export type { MessageKey };
