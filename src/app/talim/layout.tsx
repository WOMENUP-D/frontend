import type { Metadata } from "next";
import "./talim.css";
import { Shell } from "@/components/learning/Shell";
import { pageMetadata } from "@/i18n/server";

/** Title and description in the visitor's language (E-01). */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: "nav.learning", description: "meta.learning.desc" });
}

export default function LearningLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
