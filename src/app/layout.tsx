import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n";
import { Chrome } from "@/components/Chrome";
import { Petals } from "@/components/Petals";
import { Traffic } from "@/components/Traffic";
import { AmbientSakura } from "@/components/AmbientSakura";

export const metadata: Metadata = {
  title: "WomanUP — Ayol-qizlarni rivojlantirish milliy dasturi",
  description:
    "Har bir ayol uchun individual rivojlanish yo'li: diagnostika, shaxsiy reja, kurslar va real imkoniyatlar.",
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
        </I18nProvider>
      </body>
    </html>
  );
}
