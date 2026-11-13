"use client";

/**
 * The page's one call to action, worded for who is looking (C-05, J-01):
 * a visitor is asked to create an account, a woman without a score to take
 * the diagnostic, one with a score to build her plan, one with a plan to
 * continue it — or the course she is in the middle of — and staff are sent
 * to their panel.
 *
 * Until the answer is in, an invisible button of the same size holds the
 * place, so the guest's words never flash up in front of a signed-in woman
 * and the layout does not jump.
 */

import Link from "next/link";
import { useI18n } from "@/i18n";
import { staffHome } from "@/services/api";
import { nextStepOf } from "@/services/viewer";
import { useViewer } from "./useViewer";

export function ViewerCta({ className }: { className: string }) {
  const { t } = useI18n();
  const viewer = useViewer();

  if (!viewer) {
    return (
      <span className={`${className} au-cta-wait`} aria-hidden="true">
        {t("vw.cta.signup")}
      </span>
    );
  }
  const step = nextStepOf(viewer, staffHome());
  return (
    <Link href={step.href} className={className}>
      {t(step.key)}
    </Link>
  );
}

/** The footer's account link: "Sign in" for a visitor, her cabinet (or a
 *  staff account's panel) once she is signed in. */
export function AccountLink() {
  const { t } = useI18n();
  const viewer = useViewer();
  if (viewer && viewer.stage !== "guest") {
    return viewer.stage === "staff" ? (
      <Link href={staffHome()}>{t("vw.cta.panel")}</Link>
    ) : (
      <Link href="/kabinet">{t("nav.cabinet")}</Link>
    );
  }
  return <Link href="/login?mode=signin">{t("nav.signIn")}</Link>;
}
