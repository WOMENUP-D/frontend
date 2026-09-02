"use client";

import { LOCALES, useI18n } from "@/i18n";

/** UZ · ЎЗ · RU · EN — a single pill group, active segment filled with plum. */
export function LangSwitch() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="lang-switch" role="group" aria-label="Til / Язык / Language">
      {LOCALES.map((item) => (
        <button
          key={item.code}
          type="button"
          title={item.title}
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
