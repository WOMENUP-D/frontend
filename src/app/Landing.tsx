"use client";

/**
 * The written sections of the landing page.
 *
 * Everything here is markup rather than an image: a screenshot of the
 * assistant would go stale, would not translate into four locales and would
 * not follow the theme. The roadmap is drawn along one line for the same
 * reason the journey is drawn and not listed — the claim the page makes is
 * that these are not six separate services but one route, and a list cannot
 * say that.
 */

import Link from "next/link";
import { Blossom } from "@/components/Blossom";
import { useI18n, type MessageKey } from "@/i18n";

/* ------------------------------------------------ the AI companion, drawn */

export function AiTeaser() {
  const { t } = useI18n();
  const suggestions: MessageKey[] = ["ai.teaseS1", "ai.teaseS2", "ai.teaseS3"];

  return (
    <section className="section">
      <div className="wrap ai-teaser">
        <div className="ai-copy">
          <h2>{t("ai.teaseTitle")}</h2>
          <p>{t("ai.teaseLead")}</p>
          <Link href="/yordamchi" className="btn btn-primary">
            {t("ai.teaseCta")}
          </Link>
        </div>

        <div className="ai-window" aria-hidden="true">
          <div className="ai-ask">{t("ai.teaseAsk")}</div>
          <div className="ai-reply">
            <span className="ai-avatar">AI</span>
            <div className="ai-reply-body">
              <span className="ai-typing">
                <i />
                <i />
                <i />
              </span>
              <span>{t("ai.teaseReply")}</span>
              <div className="ai-sugg">
                {suggestions.map((key, index) => (
                  <span key={key}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    {t(key)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="ai-input">
            <span>{t("ai.teaseInput")}</span>
            <span className="ai-send">➤</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------- directions, as a card set */

const DIRECTIONS: ReadonlyArray<{ icon: string; t: MessageKey; d: MessageKey }> = [
  { icon: "❖", t: "dir.work.t", d: "dir.work.d" },
  { icon: "◈", t: "dir.biz.t", d: "dir.biz.d" },
  { icon: "✿", t: "dir.health.t", d: "dir.health.d" },
  { icon: "⌂", t: "dir.family.t", d: "dir.family.d" },
  { icon: "◉", t: "dir.digital.t", d: "dir.digital.d" },
  { icon: "★", t: "dir.lead.t", d: "dir.lead.d" },
];

export function PathCards() {
  const { t } = useI18n();
  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head">
          <h2>{t("landing.faceTitle")}</h2>
          <p>{t("landing.faceLead")}</p>
        </div>

        <div className="face-grid">
          {DIRECTIONS.map((item) => (
            <Link key={item.t} href="/dasturlar" className="face-card">
              <span className="face-ico" aria-hidden="true">
                {item.icon}
              </span>
              <h3>{t(item.t)}</h3>
              <p>{t(item.d)}</p>
              <span className="face-link">
                {t("landing.faceLink")} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ the roadmap */

/** Coordinates are in the 1200×340 space the curve is drawn in; the labels are
 *  positioned as a percentage of the same box, so the line and the type stay
 *  registered at every width. */
const ROAD: ReadonlyArray<{ x: number; y: number; t: MessageKey; d: MessageKey }> = [
  { x: 80, y: 240, t: "step.id.t", d: "step.id.d" },
  { x: 290, y: 120, t: "step.diag.t", d: "step.diag.d" },
  { x: 500, y: 240, t: "step.score.t", d: "step.score.d" },
  { x: 710, y: 120, t: "step.plan.t", d: "step.plan.d" },
  { x: 920, y: 240, t: "step.prog.t", d: "step.prog.d" },
  { x: 1120, y: 120, t: "step.opp.t", d: "step.opp.d" },
];

const ROAD_PATH =
  "M80 240 C 160 240, 210 120, 290 120 S 420 240, 500 240 S 630 120, 710 120 " +
  "S 840 240, 920 240 S 1040 120, 1120 120";

export function Roadmap() {
  const { t } = useI18n();
  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head">
          <h2>{t("landing.roadTitle")}</h2>
          <p>{t("landing.roadLead")}</p>
        </div>

        <div className="road">
          <svg className="road-line" viewBox="0 0 1200 340" aria-hidden="true">
            <path d={ROAD_PATH} />
          </svg>

          {ROAD.map((stop, index) => (
            <div
              key={stop.t}
              className="road-node"
              data-side={stop.y < 180 ? "up" : "down"}
              style={{ left: `${(stop.x / 1200) * 100}%`, top: `${(stop.y / 340) * 100}%` }}
            >
              <span className="road-dot" aria-hidden="true" />
              <span className="road-label">
                <span className="road-n">{String(index + 1).padStart(2, "0")}</span>
                <span className="road-t">{t(stop.t)}</span>
                <span className="road-d">{t(stop.d)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- wellbeing */

const HABITS: ReadonlyArray<[MessageKey, MessageKey]> = [
  ["well.1.t", "well.1.d"],
  ["well.2.t", "well.2.d"],
  ["well.3.t", "well.3.d"],
  ["well.4.t", "well.4.d"],
];

export function Wellbeing() {
  const { t } = useI18n();
  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head">
          <h2>{t("landing.wellTitle")}</h2>
          <p>{t("landing.wellLead")}</p>
        </div>

        <div className="well-grid">
          <div className="stack" style={{ gap: 16 }}>
            <div className="reminder">
              <span className="dash-label">{t("well.today")}</span>
              <blockquote>{t("well.todayQuote")}</blockquote>
            </div>

            {/* The disclaimer sits inside the section rather than under it: the
                platform never issues a medical verdict, and the place to say so
                is beside the advice, not in a footnote. */}
            <div className="well-note">
              <h3>{t("well.note.t")}</h3>
              <p className="muted small">{t("well.note.d")}</p>
            </div>
          </div>

          <div className="well-list">
            {HABITS.map(([title, text]) => (
              <div key={title} className="well-item">
                <strong>{t(title)}</strong>
                <span className="muted small">{t(text)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ pricing */

const FREE: MessageKey[] = ["price.f1", "price.f2", "price.f3", "price.f4"];
const PLUS: MessageKey[] = [
  "price.p1", "price.p2", "price.p3", "price.p4", "price.p5", "price.p6", "price.p7",
];

/** Two cards, one decision. Plus is the dominant one — the near-black pill on
 *  paper, a hairline of blossom around it after dark — but the free tier is
 *  written as a real product and not as a teaser, because for most women on
 *  this platform it is the whole product.
 *
 *  NOT MOUNTED. The landing page deliberately does not render this yet: see the
 *  note in page.tsx. Kept whole — markup, strings and styles — so putting it
 *  back is a one-line change rather than a rebuild. */
export function Pricing() {
  const { t } = useI18n();
  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head">
          <h2>{t("price.title")}</h2>
          <p>{t("price.lead")}</p>
        </div>

        <div className="price-grid">
          <div className="price-card">
            <span className="price-name">{t("price.free")}</span>
            <span className="price-amount">
              {t("price.freeAmount")}
              <span className="price-unit">{t("price.unitFree")}</span>
            </span>
            <ul className="price-list">
              {FREE.map((key) => (
                <li key={key}>
                  <span className="price-tick" aria-hidden="true">✦</span>
                  {t(key)}
                </li>
              ))}
            </ul>
            <Link href="/login" className="btn btn-outline btn-block">
              {t("price.freeCta")}
            </Link>
          </div>

          <div className="price-card price-card-plus">
            <span className="price-tag">{t("price.tag")}</span>
            <span className="price-name">{t("price.plus")}</span>
            <span className="price-amount">
              {t("price.plusAmount")}
              <span className="price-unit">{t("price.unitPlus")}</span>
            </span>
            <ul className="price-list">
              {PLUS.map((key) => (
                <li key={key}>
                  <span className="price-tick" aria-hidden="true">✦</span>
                  {t(key)}
                </li>
              ))}
            </ul>
            <Link href="/login" className="btn btn-contrast btn-block">
              {t("price.plusCta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- the closing call */

export function ClosingCall() {
  const { t } = useI18n();
  return (
    <section className="section">
      <div className="wrap">
        <div className="cta-panel">
          {/* Blossom in the corners, not a second branch. The branch is the
              hero's and there is one to a page; here the garden is only
              implied — five flowers at the edge of the frame. */}
          <span className="cta-bloom" aria-hidden="true">
            <span><Blossom alive size={46} /></span>
            <span><Blossom alive size={28} /></span>
            <span><Blossom alive size={52} /></span>
            <span><Blossom alive size={32} /></span>
            <span><Blossom alive size={22} /></span>
          </span>

          <h2>{t("landing.ctaTitle")}</h2>
          <p>{t("landing.ctaLead")}</p>
          <Link href="/login" className="btn btn-primary btn-lg">
            {t("landing.ctaBtn")}
          </Link>
        </div>
      </div>
    </section>
  );
}
