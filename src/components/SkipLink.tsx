"use client";

import { useI18n } from "@/i18n";

/**
 * "Skip to content" (QA E-12): the first stop of the keyboard, hidden until it
 * has focus. Pages own their `<main>`, so the target is found at the moment of
 * use rather than by an id every page would have to carry.
 */
export function SkipLink() {
  const { t } = useI18n();
  return (
    <a
      href="#main"
      className="skip-link"
      onClick={(event) => {
        const main = document.querySelector<HTMLElement>("main");
        if (!main) return;
        event.preventDefault();
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
        main.focus();
        main.scrollIntoView();
      }}
    >
      {t("a11y.skip")}
    </a>
  );
}
