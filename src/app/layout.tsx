import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n";
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

export const metadata: Metadata = {
  title: "WomanUP — Ayol-qizlarni rivojlantiriş milliy dasturi",
  description:
    "Har bir ayol uçun individual rivojlaniş yöli: diagnostika, şaxsiy reja, kurslar va real imkoniyatlar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <I18nProvider>
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
