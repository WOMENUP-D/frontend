import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { I18nProvider } from "@/i18n";
import { Chrome } from "@/components/Chrome";
import { Traffic } from "@/components/Traffic";
import { AmbientSakura } from "@/components/AmbientSakura";
import { DeferredMascot, DeferredPetals } from "@/components/Deferred";
import { SkipLink } from "@/components/SkipLink";
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

export const metadata: Metadata = {
  title: "WomanUP — Ayol-qizlarni rivojlantiriş milliy dasturi",
  description:
    "Har bir ayol uçun individual rivojlaniş yöli: diagnostika, şaxsiy reja, kurslar va real imkoniyatlar.",
};

/* PWA (QA B-20): the manifest, favicon.ico, icon.svg and apple-icon.png are
   file conventions in this folder; Next links them itself. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f8" },
    { media: "(prefers-color-scheme: dark)", color: "#17131c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={fontVariables}>
      <body>
        <I18nProvider>
          <SkipLink />
          <AmbientSakura />
          <DeferredPetals />
          <SessionGate>
            <Traffic />
            <Chrome />
            {children}
            <DeferredMascot />
          </SessionGate>
          <LivingUI />
        </I18nProvider>
      </body>
    </html>
  );
}
