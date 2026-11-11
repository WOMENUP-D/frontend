import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/i18n/server";

/**
 * A public portfolio is readable by anyone with its link — which is not the
 * same as being findable by anyone who searches her name. Search engines are
 * told not to index or follow it, so publishing a record is a decision about
 * who she sends it to, not about what Google remembers.
 */
export async function generateMetadata(): Promise<Metadata> {
  const base = await pageMetadata({ title: "meta.portfolio.title" });
  return {
    ...base,
    // No canonical/hreflang either: nothing here should be offered to a crawler.
    alternates: null,
    robots: { index: false, follow: false, nocache: true, noarchive: true },
    referrer: "no-referrer",
  };
}

export default function PublicPortfolioLayout({ children }: { children: ReactNode }) {
  return children;
}
