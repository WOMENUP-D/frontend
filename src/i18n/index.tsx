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
import { messages, type MessageKey } from "./messages";
import { toCyrillic } from "./translit";

/** uz-Cyrl is the same language as uz in a different script — see translit.ts. */
export type Locale = "uz" | "uz-Cyrl" | "ru" | "en";

export const LOCALES: ReadonlyArray<{ code: Locale; short: string; title: string }> = [
  { code: "uz", short: "UZ", title: "O'zbekcha (lotin)" },
  { code: "uz-Cyrl", short: "ЎЗ", title: "Ўзбекча (кирилл)" },
  { code: "ru", short: "RU", title: "Русский" },
  { code: "en", short: "EN", title: "English" },
];

const STORAGE_KEY = "womanup.locale";
const DEFAULT: Locale = "uz";

/** Localised JSON coming from the API, e.g. Program.title_i18n. */
export type I18nField = Record<string, string> | undefined | null;

interface I18nValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** UI string by key. */
  t: (key: MessageKey) => string;
  /** Value out of an API i18n field, with a sensible fallback chain. */
  tx: (field: I18nField) => string;
  /** Free Uzbek text from the API — converted when the script is Cyrillic. */
  tu: (text: string | null | undefined) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === "uz" || value === "uz-Cyrl" || value === "ru" || value === "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "uz-Cyrl" ? "uz-Cyrl" : locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const cyrillic = locale === "uz-Cyrl";
    const written = cyrillic ? "uz" : locale;

    const t = (key: MessageKey): string => {
      const entry = messages[key];
      if (!entry) return key;
      const text = entry[written as "uz" | "ru" | "en"] ?? entry.uz;
      return cyrillic ? toCyrillic(text) : text;
    };

    const tx = (field: I18nField): string => {
      if (!field) return "";
      // Prefer the requested language, then Uzbek, then whatever exists.
      const text =
        field[written] ?? field.uz ?? Object.values(field)[0] ?? "";
      // Only an Uzbek source can be transliterated; ru/en stay as they are.
      const isUzbekSource = field[written] === undefined || written === "uz";
      return cyrillic && isUzbekSource ? toCyrillic(text) : text;
    };

    const tu = (text: string | null | undefined): string => {
      if (!text) return "";
      return cyrillic ? toCyrillic(text) : text;
    };

    return { locale, setLocale, t, tx, tu };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}

export type { MessageKey };
