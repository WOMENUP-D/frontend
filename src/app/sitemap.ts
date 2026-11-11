import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";
import { LOCALES, htmlLang } from "@/i18n/core";
import { localeUrl, serverFetch } from "@/i18n/server";

/**
 * sitemap.xml (E-01): the public sections and every published programme,
 * each with its hreflang alternates. Private screens (cabinet, plan, admin,
 * portfolios) are left out — they are also disallowed in robots.txt.
 * Programmes come from the API; when it cannot be reached the sitemap still
 * lists the sections.
 */

const PUBLIC_PATHS = [
  "/", "/dasturlar", "/imkoniyatlar", "/imkoniyatlar/biznes", "/vakansiyalar",
  "/tadbirlar", "/talim", "/talim/kurslar", "/talim/yollar", "/yordamchi", "/hamkor", "/maxfiylik",
];

const MAX_PAGES = 20;
const PAGE_SIZE = 100;

function entry(path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number] {
  const origin = siteUrl();
  const languages: Record<string, string> = {};
  for (const item of LOCALES) languages[htmlLang(item.code)] = `${origin}${localeUrl(path, item.code)}`;
  return {
    url: `${origin}${path}`,
    priority,
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = PUBLIC_PATHS.map((path) => entry(path, path === "/" ? 1 : 0.7));
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await serverFetch<{ items: { id: string; published_at?: string | null }[]; total: number }>(
      `/programs?size=${PAGE_SIZE}&page=${page}`,
      3600,
    );
    if (!data || data.items.length === 0) break;
    for (const program of data.items) {
      if (program.id) entries.push(entry(`/dasturlar/${program.id}`, 0.5, program.published_at ?? undefined));
    }
    if (page * PAGE_SIZE >= data.total) break;
  }
  return entries;
}
