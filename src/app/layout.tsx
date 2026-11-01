import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n";
import { Chrome } from "@/components/Chrome";
import { Petals } from "@/components/Petals";
import { Traffic } from "@/components/Traffic";
import { AmbientSakura } from "@/components/AmbientSakura";
import { Mascot } from "@/components/mascot/Mascot";
import { LivingUI } from "@/components/motion/Living";

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
          <Traffic />
          <Chrome />
          {children}
          <Mascot />
          <LivingUI />
        </I18nProvider>
      </body>
    </html>
  );
}
