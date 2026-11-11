import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n";
import { htmlLang, translate } from "@/i18n/core";
import { alternatesFor, currentPath, localeUrl, getServerLocale, siteUrl } from "@/i18n/server";
import { Chrome } from "@/components/Chrome";
import { Petals } from "@/components/Petals";
import { Traffic } from "@/components/Traffic";
import { AmbientSakura } from "@/components/AmbientSakura";
import { Mascot } from "@/components/mascot/Mascot";
import { LivingUI } from "@/components/motion/Living";
import { SessionGate } from "@/components/SessionGate";

/**
 * Every page is rendered per request. The Content Security Policy carries a
 * nonce that is new for each response (see `src/middleware.ts`), and Next
 * stamps it on its own scripts only while rendering; a page prerendered at
 * build time would carry yesterday's nonce and every script on it would be
 * refused. The pages are client-rendered shells over the API, so nothing of
 * value was static anyway.
 */
export const dynamic = "force-dynamic";

/**
 * Site-wide metadata in the visitor's language (E-01): the title template
 * every page fills, the default description, Open Graph defaults and the
 * origin canonical links resolve against. Pages add their own title,
 * description and hreflang links through `pageMetadata`.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const title = translate(locale, "meta.site.title");
  const description = translate(locale, "meta.site.description");
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: "%s — WomanUP" },
    description,
    applicationName: "WomanUP",
    alternates: alternatesFor(await currentPath(), locale),
    openGraph: { type: "website", siteName: "WomanUP", title, description, url: localeUrl(await currentPath(), locale) },
    twitter: { card: "summary", title, description },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The language is decided here, on the server (G-11), so the first HTML is
  // already in it and <html lang> matches what is on the page.
  const locale = await getServerLocale();
  return (
    <html lang={htmlLang(locale)}>
      <body>
        <I18nProvider initialLocale={locale}>
          <AmbientSakura />
          <Petals />
          <SessionGate>
            <Traffic />
            <Chrome />
            {children}
            <Mascot />
          </SessionGate>
          <LivingUI />
        </I18nProvider>
      </body>
    </html>
  );
}
