import type { ReactNode } from "react";
import { getServerLocale, pageMetadata, serverFetch, textMetadata } from "@/i18n/server";
import { translateField } from "@/i18n/core";

/**
 * The organisation's own title and description in `<head>` (E-01), read from the
 * public API on the server so search engines and link previews see them.
 * When the API cannot be reached the section title stands in.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await serverFetch<{ name: string; description_i18n?: Record<string, string> }>(`/organizations/public/${encodeURIComponent(slug)}`);
  if (!item) return pageMetadata({ title: "meta.org.title" });
  const locale = await getServerLocale();
  return textMetadata(item.name, item.description_i18n ? translateField(locale, item.description_i18n) : null);
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
