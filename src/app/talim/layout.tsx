import type { Metadata } from "next";
import "./talim.css";
import { Shell } from "@/components/learning/Shell";

export const metadata: Metadata = {
  title: "WomanUP — Taʼlim",
  description:
    "Kurslar, şaxsiy progress, maqsadlar va AI yordamçi — bitta öquv makonida.",
};

export default function LearningLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
