import type { ReactNode } from "react";
import { pageMetadata } from "@/i18n/server";

/** Title and description in the visitor's language (E-01). */
export async function generateMetadata() {
  return pageMetadata({ title: "meta.programs.title", description: "meta.programs.desc" });
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
