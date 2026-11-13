import type { ReactNode } from "react";
import { pageMetadata } from "@/i18n/server";

/** Title in the visitor's language (E-01). */
export async function generateMetadata() {
  return pageMetadata({ title: "lms.nav.assistant", description: "meta.learning.desc" });
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
