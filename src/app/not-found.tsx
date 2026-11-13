import Link from "next/link";
import type { Metadata } from "next";
import { translate } from "@/i18n/core";
import { getServerLocale } from "@/i18n/server";

/** 404 in the visitor's language (G-06), with the three places most people
 *  were trying to reach. Rendered on the server, so it is localised before
 *  any script runs; Next keeps the HTTP 404 status and `noindex`. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return { title: { absolute: `${translate(locale, "err.404.title")} — WomanUP` }, robots: { index: false, follow: true } };
}

export default async function NotFound() {
  const locale = await getServerLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return (
    <main className="err-page">
      <div className="wrap err-wrap">
        <p className="err-code" aria-hidden="true">404</p>
        <h1 className="err-title">{t("err.404.title")}</h1>
        <p className="err-lead">{t("err.404.lead")}</p>
        <nav className="err-links" aria-label={t("err.404.title")}>
          <Link href="/" className="btn btn-primary">{t("err.home")}</Link>
          <Link href="/dasturlar" className="btn btn-outline">{t("nav.programs")}</Link>
          <Link href="/yordamchi" className="btn btn-outline">{t("asst.nav")}</Link>
        </nav>
      </div>
    </main>
  );
}
