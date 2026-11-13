"use client";

import { LOCALES, htmlLang, useI18n } from "@/i18n";

/** UZ · ЎЗ · RU · EN — a single pill group, active segment filled with plum. */
export function LangSwitch() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="lang-switch" role="group" aria-label={t("lang.group")}>
      {LOCALES.map((item) => (
        <button
          key={item.code}
          type="button"
          title={item.title}
          // Each language names itself, in itself (E-13): a screen reader
          // reads "Русский" with a Russian voice, not "R U" in Uzbek.
          aria-label={item.title}
          lang={htmlLang(item.code)}
          aria-pressed={locale === item.code}
          className={locale === item.code ? "active" : ""}
          onClick={() => setLocale(item.code)}
        >
          {item.short}
        </button>
      ))}
    </div>
  );
}
