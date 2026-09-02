"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";

const KEY = "womanup.theme";

/** Light / dark switch. The choice is stamped on <html data-theme>. */
export function ThemeToggle() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY) as "light" | "dark" | null;
    const initial =
      stored ??
      (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(KEY, next);
  }

  return (
    <button
      className="icon-btn"
      onClick={toggle}
      aria-label={t(theme === "dark" ? "nav.themeLight" : "nav.themeDark")}
      title={t(theme === "dark" ? "nav.themeLight" : "nav.themeDark")}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
