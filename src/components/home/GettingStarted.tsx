"use client";

/**
 * Five short steps for somebody new — check your progress, choose what to
 * improve, learn, practise, explore — each a link to the real page that does
 * it. Not a tour and not a gate: it opens only for a woman who has not started
 * a course yet, "Hide" puts it away, and one line brings it back.
 *
 * Whether it is hidden is a per-browser convenience kept in localStorage; a
 * blocked or empty store simply shows the guide again, which is harmless.
 */

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { Icon, StepIndicator } from "@/components/ds";

const KEY = "womanup.guide.hidden";

function readHidden(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function writeHidden(hidden: boolean): void {
  try {
    if (hidden) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    /* A private window: the choice lasts for this page only. */
  }
}

export function GettingStarted({ isNew }: { isNew: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => setOpen(isNew && !readHidden()), [isNew]);

  if (open === null) return null;

  if (!open) {
    return (
      <button
        type="button"
        className="gs-reopen"
        onClick={() => {
          writeHidden(false);
          setOpen(true);
        }}
      >
        <Icon name="help" />
        {t("guide.show")}
      </button>
    );
  }

  return (
    <section className="gs" aria-labelledby="gs-h">
      <div className="gs-head">
        <div>
          <h2 id="gs-h" className="gs-title">
            {t("guide.title")}
          </h2>
          <p className="gs-lead">{t("guide.lead")}</p>
        </div>
        <button
          type="button"
          className="ds-cta is-quiet"
          onClick={() => {
            writeHidden(true);
            setOpen(false);
          }}
        >
          <span>{t("guide.hide")}</span>
        </button>
      </div>
      <StepIndicator
        label={t("guide.title")}
        steps={[
          { title: t("guide.s1"), body: t("guide.s1.body"), href: "/kabinet/diagnostika" },
          { title: t("guide.s2"), body: t("guide.s2.body"), href: "/kasb" },
          { title: t("guide.s3"), body: t("guide.s3.body"), href: "/dasturlar" },
          { title: t("guide.s4"), body: t("guide.s4.body"), href: "/talim/amaliyot" },
          { title: t("guide.s5"), body: t("guide.s5.body"), href: "/imkoniyatlar" },
        ]}
      />
    </section>
  );
}
