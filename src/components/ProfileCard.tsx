"use client";

/**
 * The profile card — variant 4 of the mock-up.
 *
 * A tinted header the branch is drawn into, the avatar sitting low in it, and
 * the identity reading downward from there; then a plain white body where the
 * facts line up in two columns and nothing competes with them.
 *
 * Two things are deliberate. The branch is decoration and is marked
 * `aria-hidden`, so a screen reader gets the identity and the facts and none of
 * the scenery. And the completeness bar is a real `progressbar` rather than a
 * styled div: it is the one number on the card that is asking her to act, so it
 * has to be announceable.
 *
 * Every colour comes from the portal's own tokens, so the card follows the
 * light and dark themes without a second palette.
 */

import type { ReactNode } from "react";
import { useI18n } from "@/i18n";

/* ---- icons ------------------------------------------------------------
   Inline and stroked, sized in `em` so they track the row's font size. Drawn
   here rather than pulled from an icon package: three glyphs do not justify a
   dependency, and these match the weight of the type beside them. */

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

function IconCake() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h16v-6a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6Z" />
      <path d="M12 8V5M9 5.5c0-1 1.2-1.6 1.5-2.5.6.9 1.5 1.5 1.5 2.5" />
      <path d="M4 16c1.6 1.3 3.2 1.3 4.8 0s3.2-1.3 4.8 0 3.2 1.3 4.8 0" />
    </svg>
  );
}

/** The sprig in the header. One limb, five blossoms, drawn rather than fetched
 *  — the same argument the news covers make: an image request per card, on
 *  every scroll, for decoration. */
function Sprig() {
  const petals = [0, 72, 144, 216, 288];
  return (
    <svg className="profcard-sprig" viewBox="0 0 200 120" aria-hidden="true">
      {/* Thin and low-contrast: the twig is scenery on a card whose job is to
          be read, so it is drawn at the weight of a pencil line rather than the
          weight of the type it sits beside. */}
      <path
        d="M200 8 C170 18, 142 30, 120 46 C106 56, 94 68, 80 78"
        fill="none" stroke="var(--bark)" strokeWidth="1.5" strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M152 27 C147 37, 141 45, 132 52"
        fill="none" stroke="var(--bark)" strokeWidth="1.1" strokeLinecap="round"
        opacity="0.4"
      />
      {[
        [188, 12, 0.78], [158, 26, 0.64], [128, 48, 0.8], [98, 70, 0.6], [140, 58, 0.52],
      ].map(([cx, cy, scale], index) => (
        <g key={index} transform={`translate(${cx} ${cy}) scale(${scale})`}>
          {petals.map((angle) => (
            <ellipse
              key={angle}
              rx="5.2" ry="7.6" cy="-6.6"
              transform={`rotate(${angle})`}
              fill="var(--gold-soft)"
              opacity="0.8"
            />
          ))}
          <circle r="2.1" fill="var(--primary)" opacity="0.45" />
        </g>
      ))}
    </svg>
  );
}

export interface ProfileCardFact {
  icon: ReactNode;
  label: string;
  value: string;
}

export function ProfileCard({
  name,
  initials,
  womanupId,
  age,
  city,
  joined,
  completeness,
  onFill,
  fillHref,
  portfolioHref,
  headingLevel = 2,
}: {
  name: string;
  initials: string;
  womanupId: string;
  age: number | null;
  city: string | null;
  joined: string | null;
  /** 0–100. Drives both the number and the bar. */
  completeness: number;
  onFill?: () => void;
  fillHref?: string;
  /** Where her portfolio lives, when the card should offer it. */
  portfolioHref?: string;
  /** 1 where the card IS the page's identity block, as in the cabinet — the
   *  name is then the page heading and there must be exactly one of those. */
  headingLevel?: 1 | 2;
}) {
  const { t } = useI18n();
  const percent = Math.max(0, Math.min(100, Math.round(completeness)));

  // Only facts we actually hold. A row reading "Город —" tells her nothing and
  // makes the card look broken rather than incomplete.
  const facts: ProfileCardFact[] = [
    age !== null && { icon: <IconCake />, label: t("prof.age"), value: String(age) },
    city && { icon: <IconPin />, label: t("prof.city"), value: city },
    joined && { icon: <IconCalendar />, label: t("prof.joined"), value: joined },
  ].filter(Boolean) as ProfileCardFact[];

  const fillLabel = t("prof.fill");
  const Heading = (headingLevel === 1 ? "h1" : "h2") as "h1" | "h2";

  return (
    <article className="profcard">
      <div className="profcard-head">
        <Sprig />
        <span className="profcard-avatar" aria-hidden="true">{initials}</span>
        <Heading className="profcard-name">{name}</Heading>
        <p className="profcard-id">
          {t("prof.id")} <span className="profcard-idno">{womanupId}</span>
        </p>
      </div>

      <div className="profcard-body">
        {facts.length > 0 && (
          <dl className="profcard-facts">
            {facts.map((fact) => (
              <div className="profcard-fact" key={fact.label}>
                <dt>
                  <span className="profcard-ico">{fact.icon}</span>
                  {fact.label}
                </dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="profcard-progress">
          <div className="profcard-progress-head">
            <span>{t("cab.profileFull")}</span>
            <strong>{percent}%</strong>
          </div>
          <div
            className="profcard-bar"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("cab.profileFull")}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>

        {fillHref ? (
          <a className="profcard-cta" href={fillHref}>{fillLabel}</a>
        ) : (
          <button type="button" className="profcard-cta" onClick={onFill}>
            {fillLabel}
          </button>
        )}
        {portfolioHref && (
          <a className="profcard-link" href={portfolioHref}>{t("port.view")}</a>
        )}
      </div>
    </article>
  );
}
