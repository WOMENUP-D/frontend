"use client";

/**
 * The catalogue as a shelf of spines.
 *
 * The grid is the right default — it is scannable and it carries the figures
 * people compare on. What a grid cannot do is show the catalogue as a *body*
 * of work: twenty-six cards paginate into an undifferentiated wall, and
 * nothing in them says that one programme is four times the length of another
 * until you read two numbers and subtract.
 *
 * A shelf says both at a glance. Spine width is course length, so the shape
 * of the shelf is the shape of the catalogue; spine colour is the direction,
 * so a woman looking for finance can find that stretch of the shelf without
 * reading a single title.
 *
 * Two decisions worth keeping:
 *
 * **Width encodes hours, and the scale is stated.** An encoding a reader
 * cannot decode is decoration. The legend gives the scale, and the same
 * figures stay on the card that opens when a spine is picked.
 *
 * **A spine is a button, not a card.** Vertical text is hard to read by
 * design — it is a label on a closed object. Everything that has to be read
 * properly lives in the panel the spine opens.
 */

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n";
import { type Program } from "@/services/portal";
import { categoryKey, formatKey } from "@/utils/format";

/** Hours → spine width. Clamped at both ends: a 60-hour course must not run
 *  off the shelf, and an 8-hour one must stay wide enough to hold its title. */
function spineWidth(hours: number | null): number {
  const h = hours ?? 12;
  return Math.round(Math.max(38, Math.min(112, 30 + h * 1.15)));
}

export function Shelf({ programs }: { programs: Program[] }) {
  const { t, tx } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);

  /* The legend states the range the encoding actually spans, read off the
     catalogue rather than written by hand — a hard-coded "8 → 60" went stale
     the moment a 72-hour course was added, and a legend that misstates its
     own scale is worse than none. */
  const hours = programs
    .map((program) => program.duration_hours)
    .filter((value): value is number => value != null);
  const low = hours.length ? Math.min(...hours) : 8;
  const high = hours.length ? Math.max(...hours) : 60;

  const open = programs.find((program) => program.id === openId) ?? null;

  return (
    <div className="shelf-wrap">
      <div className="shelf-scale">
        <span>{t("shelf.scale")}</span>
        <span className="shelf-scale-bars" aria-hidden="true">
          <i style={{ width: spineWidth(low) / 3 }} />
          <i style={{ width: spineWidth((low + high) / 2) / 3 }} />
          <i style={{ width: spineWidth(high) / 3 }} />
        </span>
        <span className="shelf-scale-ends">{low} → {high} {t("common.hours")}</span>
      </div>

      <div className="shelf" role="list">
        {programs.map((program) => {
          const picked = program.id === openId;
          return (
            <button
              key={program.id}
              type="button"
              role="listitem"
              data-cat={program.category}
              className={picked ? "spine is-open" : "spine"}
              style={{ width: spineWidth(program.duration_hours) }}
              onClick={() => setOpenId(picked ? null : program.id)}
              aria-expanded={picked}
              title={`${tx(program.title_i18n)} — ${program.duration_hours ?? "—"} ${t("common.hours")}`}
            >
              <span className="spine-title">{tx(program.title_i18n)}</span>
              <span className="spine-hours">{program.duration_hours ?? "—"}</span>
            </button>
          );
        })}
      </div>

      {/* The shelf board. Without it the spines float; with it they stand. */}
      <div className="shelf-board" aria-hidden="true" />

      {open ? (
        <article className="shelf-open" data-cat={open.category}>
          <span className="shelf-open-cat">{t(categoryKey(open.category))}</span>
          <h3>{tx(open.title_i18n)}</h3>
          <p>{tx(open.goal_i18n)}</p>

          <div className="shelf-open-figs">
            {open.duration_weeks != null && (
              <span><b>{open.duration_weeks}</b> {t("common.weeks")}</span>
            )}
            {open.duration_hours != null && (
              <span><b>{open.duration_hours}</b> {t("common.hours")}</span>
            )}
            <span className="shelf-open-fmt">{t(formatKey(open.format))}</span>
            {open.has_certificate && (
              <span className="shelf-open-cert">{t("pr.certificate")}</span>
            )}
          </div>

          <Link className="btn btn-primary btn-sm" href={`/dasturlar/${open.id}`}>
            {t("pr.details")}
          </Link>
        </article>
      ) : (
        <p className="shelf-hint">{t("shelf.hint")}</p>
      )}
    </div>
  );
}
