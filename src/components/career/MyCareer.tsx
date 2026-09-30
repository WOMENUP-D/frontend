"use client";

/**
 * Her chosen direction in one card — or, when she has none, one sentence and
 * one way to find one.
 *
 * Used in the cabinet and at the top of the career catalogue. It answers the
 * two questions the brief puts first — "where am I?" and "what comes next?" —
 * with the server's own reading: the stage she is on and how many stages are
 * done. Nothing is counted here.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { portal, type CareerDetail } from "@/services/portal";
import { CareerIcon } from "./CareerIcon";
import { fill, glyphFor, stageTitleKey, stagesDone } from "./model";

export function MyCareer({ showFind = true }: { showFind?: boolean }) {
  const { t, tx } = useI18n();
  // undefined: loading; null: she has not chosen; false: it failed to load.
  const [career, setCareer] = useState<CareerDetail | null | undefined | false>(undefined);

  useEffect(() => {
    let live = true;
    portal
      .myCareer()
      .then((value) => live && setCareer(value))
      .catch(() => live && setCareer(false));
    return () => {
      live = false;
    };
  }, []);

  // A card that cannot load says nothing rather than something wrong: the
  // cabinet has other ways to her next step, and this is not load-bearing.
  if (career === undefined || career === false) return null;

  if (career === null) {
    return (
      <section className="mycareer is-empty" aria-labelledby="mycareer-h">
        <h2 id="mycareer-h" className="mycareer-label">
          {t("car.cab.title")}
        </h2>
        <p className="mycareer-none">{t("car.none")}</p>
        {showFind ? (
          <Link href="/kasb" className="btn btn-primary mycareer-action">
            {t("car.find")}
          </Link>
        ) : (
          <p className="mycareer-hint">{t("car.noneHint")}</p>
        )}
      </section>
    );
  }

  const progress = stagesDone(career);
  const current = career.journey?.current ?? null;

  return (
    <section className="mycareer" aria-labelledby="mycareer-h">
      <h2 id="mycareer-h" className="mycareer-label">
        {t("car.cab.title")}
      </h2>
      <div className="mycareer-row">
        <span className="mycareer-icon">
          <CareerIcon glyph={glyphFor(career.slug, career.category)} />
        </span>
        <div className="mycareer-text">
          <p className="mycareer-title">{tx(career.title_i18n)}</p>
          <p className="mycareer-meta">
            {current
              ? fill(t("car.cab.now"), { stage: t(stageTitleKey(current)) })
              : t("car.allDone")}
          </p>
          <p className="mycareer-meta">
            {fill(t("car.cab.stages"), { done: progress.done, total: progress.total })}
          </p>
        </div>
      </div>
      <Link href={`/kasb/${career.slug}`} className="btn btn-primary mycareer-action">
        {current ? t("car.continue") : t("car.cab.open")}
      </Link>
    </section>
  );
}
