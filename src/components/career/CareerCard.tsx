"use client";

/**
 * One career direction on the catalogue.
 *
 * The whole card is one tap target — the title's link is stretched over it —
 * but only the title is a link, so a screen reader hears the name of the
 * direction rather than the card read out as one long link. The "See the path"
 * label at the bottom is what a sighted visitor looks for; it repeats the
 * link and is hidden from assistive technology for that reason.
 *
 * What the card says is counted by the server: how many of its skills she
 * holds, how many courses, tasks and open listings exist for it. A zero is left
 * out rather than printed, except for courses — "0 courses" is worth knowing.
 */

import Link from "next/link";
import { useI18n } from "@/i18n";
import type { CareerCard as Card } from "@/services/portal";
import { Meter } from "@/components/guide/Parts";
import { CareerIcon } from "./CareerIcon";
import { fill, glyphFor } from "./model";

export function CareerCard({ card }: { card: Card }) {
  const { t, tx } = useI18n();
  const chosen = card.fit?.chosen ?? false;
  const facts = [
    { key: "programs", text: fill(t("car.count.programs"), { n: card.counts.programs }), show: true },
    { key: "tasks", text: fill(t("car.count.tasks"), { n: card.counts.tasks }), show: card.counts.tasks > 0 },
    {
      key: "opportunities",
      text: fill(t("car.count.opportunities"), { n: card.counts.opportunities }),
      show: card.counts.opportunities > 0,
    },
  ].filter((fact) => fact.show);

  return (
    <li className={`cp-card${chosen ? " is-chosen" : ""}${card.suggested ? " is-suggested" : ""}`}>
      <div className="cp-card-top">
        <span className="cp-card-icon">
          <CareerIcon glyph={glyphFor(card.slug, card.category)} />
        </span>
        {chosen ? (
          <span className="cp-flag is-chosen">{t("car.yours")}</span>
        ) : card.suggested ? (
          <span className="cp-flag">{t("car.suggested")}</span>
        ) : null}
      </div>

      <h2 className="cp-card-title">
        <Link href={`/kasb/${card.slug}`} className="cp-card-link">
          {tx(card.title_i18n)}
        </Link>
      </h2>
      <p className="cp-card-summary">{tx(card.summary_i18n)}</p>

      {card.fit ? (
        <Meter
          value={card.fit.have}
          max={card.fit.total}
          text={fill(t("car.have"), { have: card.fit.have, total: card.fit.total })}
        />
      ) : (
        <p className="cp-card-need">{fill(t("car.skillsCount"), { total: card.skills.length })}</p>
      )}

      <ul className="cp-card-facts">
        {facts.map((fact) => (
          <li key={fact.key}>{fact.text}</li>
        ))}
      </ul>

      <span className="cp-card-cta" aria-hidden="true">
        {t("car.see")}
        <svg width="18" height="18" viewBox="0 0 20 20" focusable="false">
          <path
            d="M7.5 5l5 5-5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </li>
  );
}
