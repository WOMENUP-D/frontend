import type { MetadataRoute } from "next";

/**
 * The web app manifest (QA B-20): installable from the browser, with the
 * WomanUP blossom — the same mark the header draws — as its icon. Uzbek is the
 * primary locale, so the names are the Uzbek ones from the page metadata.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WomanUP — Ayol-qizlarni rivojlantiriş milliy dasturi",
    short_name: "WomanUP",
    description:
      "Har bir ayol uçun individual rivojlaniş yöli: diagnostika, şaxsiy reja, kurslar va real imkoniyatlar.",
    lang: "uz",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbf9f8",
    theme_color: "#fbf9f8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
