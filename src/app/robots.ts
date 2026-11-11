import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

/**
 * robots.txt (I-24, E-01). Private and staff screens are not for crawlers.
 * Public portfolios are deliberately NOT disallowed: they are shared by link,
 * never by search, and carry `noindex, noarchive` in their own metadata — a
 * crawler has to be allowed to fetch the page to read that, and a disallowed
 * URL can still be indexed from links pointing at it.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin", "/kabinet", "/reja", "/welcome", "/imkoniyatlar/arizalarim",
          "/talim/profil", "/talim/maqsadlar", "/talim/kundalik", "/talim/yutuqlar",
          "/api/",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
