"use client";

/**
 * Personal directions: the fields her diagnostic points to, each opening onto
 * the catalogue courses that lead into it, first steps first.
 *
 * A direction is a reading of her answers, not a route she is on — so the card
 * has no progress and no "start" button. It says what the field is, why it is
 * here (in her own words from the diagnostic, or plainly as a fallback), and
 * opens onto an ordered list. The list is numbered because it is a sequence:
 * the server orders it from first steps onwards.
 *
 * Partner courses are taught on their own sites and open in a new tab; the
 * portal's own courses open in the catalogue.
 */

import Link from "next/link";
import { useId, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import type { LearningDirection, Program } from "@/services/portal";
import { Badge, levelKey } from "@/components/learning/ui";
import { dimensionKey } from "@/utils/format";
import { hostOf } from "@/utils/url";

export function DirectionCard({ direction }: { direction: LearningDirection }) {
  const { t, tx } = useI18n();
  const [open, setOpen] = useState(false);
  const listId = useId();

  const why =
    direction.reason === "interest" && direction.interest
      ? t("lms.dir.why.interest", { interest: tx(direction.interest.label_i18n) })
      : direction.reason === "weakest_dimension" && direction.dimension
        ? t("lms.dir.why.weakest_dimension", { dimension: t(dimensionKey(direction.dimension)) })
        : t("lms.dir.why.popular");

  return (
    <article className={`lms-path lms-dir ${open ? "lms-dir-open" : ""}`}>
      <div className="lms-dir-why">{why}</div>

      <h3 className="lms-course-title">{tx(direction.title_i18n)}</h3>
      <p className="lms-path-lead">{tx(direction.summary_i18n)}</p>

      <div className="lms-path-foot">
        <span className="lms-rec-stats">
          <span>{t("lms.dir.count", { n: direction.course_total })}</span>
        </span>
        <button
          type="button"
          className="lms-btn lms-btn-quiet lms-btn-sm"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          style={{ marginLeft: "auto" }}
        >
          {t(open ? "lms.dir.hide" : "lms.dir.show")}
        </button>
      </div>

      {open && (
        <div id={listId} className="lms-dir-body">
          <ol className="lms-dir-steps">
            {direction.courses.map((program, index) => (
              <DirectionStep key={program.id} program={program} n={index + 1} />
            ))}
          </ol>
          {direction.topic && direction.course_total > direction.courses.length && (
            <Link
              className="lms-sec-link"
              href={`/dasturlar?skill=${encodeURIComponent(direction.topic)}`}
            >
              {t("lms.dir.all", { n: direction.course_total })}
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

function DirectionStep({ program, n }: { program: Program; n: number }) {
  const { t, tx } = useI18n();
  const outside = program.external_url ? hostOf(program.external_url) : null;
  const title = tx(program.title_i18n);

  return (
    <li className="lms-dir-step">
      <span className="lms-dir-n" aria-hidden="true">{n}</span>
      <div className="lms-dir-step-body">
        <span className="lms-dir-step-title">
          {program.external_url ? (
            <a href={program.external_url} target="_blank" rel="noopener noreferrer">
              {title}
              <span className="sr-only"> ({t("lms.dir.newTab")})</span>
            </a>
          ) : (
            <Link href={`/dasturlar/${program.id}`}>{title}</Link>
          )}
        </span>
        <span className="lms-dir-step-meta">
          {program.level && <Badge>{t(levelKey(program.level))}</Badge>}
          {program.language && <Badge>{t(`pr.lang.${program.language}` as MessageKey)}</Badge>}
          {(program.provider || outside) && (
            <span className="lms-dir-step-by">{program.provider || outside}</span>
          )}
        </span>
      </div>
    </li>
  );
}
