import type { ReactNode } from "react";
import { getServerLocale, pageMetadata, serverFetch, textMetadata } from "@/i18n/server";
import { translateField } from "@/i18n/core";

/**
 * The programme's own title and description in `<head>` (E-01), read from the
 * public API on the server so search engines and link previews see them.
 * When the API cannot be reached the section title stands in.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await serverFetch<{ title_i18n: Record<string, string>; description_i18n?: Record<string, string> }>(`/programs/${encodeURIComponent(id)}`);
  if (!item) return pageMetadata({ title: "nav.programs" });
  const locale = await getServerLocale();
  return textMetadata(translateField(locale, item.title_i18n), item.description_i18n ? translateField(locale, item.description_i18n) : null);
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
