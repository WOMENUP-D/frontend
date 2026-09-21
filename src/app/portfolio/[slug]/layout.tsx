import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * A public portfolio is readable by anyone with its link — which is not the
 * same as being findable by anyone who searches her name. Search engines are
 * told not to index or follow it, so publishing a record is a decision about
 * who she sends it to, not about what Google remembers.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function PublicPortfolioLayout({ children }: { children: ReactNode }) {
  return children;
}
