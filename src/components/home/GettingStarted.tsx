"use client";

/**
 * Four short steps for somebody new — check your progress, learn, practise,
 * explore — each a link to the real page that does it, ticked once done. Not a tour and not a gate: it opens only for a woman who has not started
 * a course yet, "Hide" puts it away, and one line brings it back.
 *
 * Whether it is hidden is a per-browser convenience kept in localStorage; a
 * blocked or empty store simply shows the guide again, which is harmless.
 */

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { Icon, StepIndicator } from "@/components/ds";
import type { ViewerState } from "@/services/viewer";

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

export function GettingStarted({ viewer }: { viewer: ViewerState | null }) {
  const { t } = useI18n();
  // A woman who has started a course is past the guide: not shown, and no
  // button to bring it back either (C-26).
  const isNew = viewer !== null && viewer.stage !== "guest" && viewer.stage !== "staff" && !viewer.hasEnrollments;
  /* Read at the first render when the viewer is already known, not in an
     effect: a block appearing one frame later above everything else pushed
     the whole cabinet down (QA H-01). */
  const [open, setOpen] = useState<boolean | null>(() =>
    typeof window === "undefined" || viewer === null ? null : isNew ? !readHidden() : null,
  );

  useEffect(() => {
    if (viewer === null) return;
    setOpen(isNew ? !readHidden() : null);
  }, [viewer, isNew]);

  if (open === null || !isNew) return null;

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

  const assessed = viewer.stage === "assessed" || viewer.stage === "planned";
  const done = t("au.guide.done");

  return (
    <section className="gs" aria-labelledby="gs-h">
      <div className="gs-head">
        <div>
          <h2 id="gs-h" className="gs-title">
            {t("guide.title")}
          </h2>
          <p className="gs-lead">{t("au.guide.lead")}</p>
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
        doneLabel={done}
        steps={[
          {
            title: t("guide.s1"),
            body: t("guide.s1.body"),
            // Done: the step is her result, not the questionnaire.
            href: assessed ? "/kabinet/diagnostika/natija" : "/kabinet/diagnostika",
            done: assessed,
          },
          { title: t("guide.s3"), body: t("guide.s3.body"), href: "/dasturlar", done: viewer.hasEnrollments },
          { title: t("guide.s4"), body: t("guide.s4.body"), href: "/talim/amaliyot" },
          { title: t("guide.s5"), body: t("guide.s5.body"), href: "/imkoniyatlar" },
        ]}
      />
    </section>
  );
}
