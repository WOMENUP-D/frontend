import type { ReactNode } from "react";
import { pageMetadata, serverFetch, textMetadata } from "@/i18n/server";

/**
 * The vacancy's own title and description in `<head>` (E-01), read from the
 * public API on the server so search engines and link previews see them.
 * When the API cannot be reached the section title stands in.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await serverFetch<{ title: string; description_text?: string }>(`/vacancies/${encodeURIComponent(id)}`);
  if (!item) return pageMetadata({ title: "nav.vacancies" });
  return textMetadata(item.title, item.description_text ?? null);
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
