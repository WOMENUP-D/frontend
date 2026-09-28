"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";

const KEY = "womanup.theme";

/* Drawn rather than typed. "☀" and "☾" are characters, and a phone renders
   them with its own emoji font: on iOS the sun came out as a yellow sticker
   that belonged to no part of this design and could not take the button's
   colour. These are 18px line marks in currentColor, like every other mark
   in the header. */
const SUN = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.7v2.1M12 19.2v2.1M2.7 12h2.1M19.2 12h2.1M5.5 5.5l1.5 1.5M17 17l1.5 1.5M18.5 5.5L17 7M7 17l-1.5 1.5" />
  </svg>
);

const MOON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />
  </svg>
);

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
      {theme === "dark" ? SUN : MOON}
    </button>
  );
}
