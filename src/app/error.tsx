"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/i18n";

/** A runtime error inside a page (G-06): said plainly, in her language, with
 *  a retry and a way home. The digest lets support find the server log. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="err-page">
      <div className="wrap err-wrap">
        <h1 className="err-title">{t("err.500.title")}</h1>
        <p className="err-lead">{t("err.500.lead")}</p>
        <div className="err-links">
          <button type="button" className="btn btn-primary" onClick={reset}>{t("err.retry")}</button>
          <Link href="/" className="btn btn-outline">{t("err.home")}</Link>
        </div>
        {error.digest && (
          <p className="err-digest muted">
            {t("err.code")}: <code>{error.digest}</code>
          </p>
        )}
      </div>
    </main>
  );
}
