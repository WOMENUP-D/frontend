import type { Metadata } from "next";
import "./talim.css";
import { Shell } from "@/components/learning/Shell";

export const metadata: Metadata = {
  title: "WomanUP — Taʼlim",
  description:
    "Kurslar, shaxsiy progress, maqsadlar va AI yordamchi — bitta oʻquv makonida.",
};

export default function LearningLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
