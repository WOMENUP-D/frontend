"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/locales";
import { htmlLang, translate, writtenOf } from "@/i18n/core";
// Registers the Uzbek strings and loads another language on demand (QA H-02).
import { loadTable } from "@/i18n/dictionary";
import "./globals.css";

/** When the root layout itself fails there is no provider to ask, so the
 *  language comes straight from the cookie (G-06). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  let locale = DEFAULT_LOCALE;
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|; )womanup\.locale=([^;]*)/);
    const value = match ? decodeURIComponent(match[1]) : null;
    if (isLocale(value)) locale = value;
  }
  // Uzbek is bundled; another language is fetched and the page re-rendered.
  const [, setLoaded] = useState(false);
  useEffect(() => {
    loadTable(writtenOf(locale)).then(() => setLoaded(true), () => {});
  }, [locale]);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return (
    <html lang={htmlLang(locale)}>
      <body>
        <main className="err-page">
          <div className="wrap err-wrap">
            <h1 className="err-title">{t("err.500.title")}</h1>
            <p className="err-lead">{t("err.500.lead")}</p>
            <div className="err-links">
              <button type="button" className="btn btn-primary" onClick={reset}>{t("err.retry")}</button>
              {/* A full reload on purpose: the root layout is what failed. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="btn btn-outline">{t("err.home")}</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
