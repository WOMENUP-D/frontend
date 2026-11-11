/**
 * The interface language for server code: the root layout, `generateMetadata`,
 * the sitemap. Reads what the middleware decided (`x-locale`: the `?lang=`
 * parameter, else the cookie) and falls back to the cookie itself, then to
 * uz-Latn. Never `Accept-Language`: the portal's primary language is Uzbek,
 * and a visitor sees it until she chooses another.
 */

import { cookies, headers } from "next/headers";
// All three languages for server-side translate() (QA H-02).
import "./catalog";
import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_PARAM, LOCALES, htmlLang, isLocale, translate, type Locale } from "./core";
import type { MessageKey } from "./messages";
import { siteUrl } from "@/config/site";

export async function getServerLocale(): Promise<Locale> {
  const fromMiddleware = (await headers()).get("x-locale");
  if (isLocale(fromMiddleware)) return fromMiddleware;
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
}

/** The current request's path, as the middleware saw it. */
export async function currentPath(): Promise<string> {
  return (await headers()).get("x-pathname") || "/";
}

/** The address of `path` in a given locale: the bare path is uz-Latn, the
 *  others carry `?lang=` — the paths themselves are not localised. */
export function localeUrl(path: string, locale: Locale): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return locale === DEFAULT_LOCALE ? clean : `${clean}?${LOCALE_PARAM}=${encodeURIComponent(locale)}`;
}

/** `alternates` for a page: its canonical in the current locale and one
 *  hreflang link per locale, plus x-default (uz-Latn). */
export function alternatesFor(path: string, locale: Locale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const item of LOCALES) languages[htmlLang(item.code)] = localeUrl(path, item.code);
  languages["x-default"] = localeUrl(path, DEFAULT_LOCALE);
  return { canonical: localeUrl(path, locale), languages };
}

const OG_LOCALE: Record<Locale, string> = { uz: "uz_UZ", "uz-Cyrl": "uz_UZ", ru: "ru_RU", en: "en_GB" };

/**
 * Metadata for a page: a localised title and description, canonical and
 * hreflang links, and Open Graph / Twitter cards for link previews.
 */
export async function pageMetadata(
  keys: { title: MessageKey | string; description?: MessageKey | string },
  options: { noindex?: boolean } = {},
): Promise<Metadata> {
  const locale = await getServerLocale();
  const path = await currentPath();
  const say = (value: string) => translate(locale, value as MessageKey);
  const title = say(keys.title);
  const description = keys.description ? say(keys.description) : say("meta.site.description");
  return {
    // Absolute: a nested layout's plain title would otherwise drop the root
    // template for its children, and "— WomanUP" with it.
    title: { absolute: `${title} — WomanUP` },
    description,
    alternates: alternatesFor(path, locale),
    openGraph: {
      type: "website",
      siteName: "WomanUP",
      title,
      description,
      url: localeUrl(path, locale),
      locale: OG_LOCALE[locale],
    },
    twitter: { card: "summary", title, description },
    ...(options.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Same, with text already in hand (a programme title from the API). */
export async function textMetadata(title: string, description: string | null): Promise<Metadata> {
  const locale = await getServerLocale();
  const path = await currentPath();
  const clean = description?.replace(/\s+/g, " ").trim();
  const desc = clean ? clean.slice(0, 200) : translate(locale, "meta.site.description");
  return {
    title: { absolute: `${title} — WomanUP` },
    description: desc,
    alternates: alternatesFor(path, locale),
    openGraph: { type: "article", siteName: "WomanUP", title, description: desc, url: localeUrl(path, locale), locale: OG_LOCALE[locale] },
    twitter: { card: "summary", title, description: desc },
  };
}

/** The API, from the server. In production the browser reaches it through
 *  the same origin (`/api/v1`), which a server has no host for, so
 *  `API_INTERNAL_URL` names it (e.g. http://api:8000/api/v1). Without one,
 *  pages fall back to their section titles. */
export function serverApiBase(): string | null {
  const explicit = process.env.API_INTERNAL_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const proxy = process.env.API_PROXY_TARGET;
  if (proxy) return `${proxy.replace(/\/$/, "")}/api/v1`;
  const pub = process.env.NEXT_PUBLIC_API_URL;
  if (pub && /^https?:\/\//.test(pub)) return pub.replace(/\/$/, "");
  return null;
}

/** A public API read for metadata: short timeout, never throws. */
export async function serverFetch<T>(path: string, revalidate = 300): Promise<T | null> {
  const base = serverApiBase();
  if (!base) return null;
  try {
    const response = await fetch(`${base}${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(2500),
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export { siteUrl };
