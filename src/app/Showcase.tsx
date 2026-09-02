"use client";

/**
 * The three showcase sections on the landing page.
 *
 * The page used to describe the portal in prose — six numbered rows and six
 * directions — without showing a single thing that is actually in it. A visitor
 * read *about* the product instead of seeing it. These sections pull real rows
 * from the public endpoints, so the landing page is never more optimistic than
 * the database.
 *
 * The progress dashboard is drawn rather than screenshotted: a real ring, real
 * dimension bars, a real next step. Screenshots would go stale, would not
 * translate, and would not follow the theme.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { portal, type Opportunity, type OpportunityStats, type Program } from "@/services/portal";
import { useI18n, type MessageKey } from "@/i18n";
import { categoryKey, money, sourceKey, typeKey } from "@/utils/format";

/* ---------------------------------------- career progress, as one instrument */

/** The composite score, the dimensions under it and the single next step
 *  beside it. This used to be three separate vignettes — a ring, a checklist
 *  and a streak grid — which showed three features rather than one product.
 *  A woman does not open a dashboard to admire three widgets; she opens it to
 *  find out where she stands and what to do next. */
export function CareerProgress() {
  const { t } = useI18n();

  const score = 58;
  const dims: ReadonlyArray<[MessageKey, number]> = [
    ["dim.education_skills", 78],
    ["dim.employment", 56],
    ["dim.entrepreneurship", 39],
    ["dim.financial_literacy", 61],
  ];

  const size = 112;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head">
          <h2>{t("ls.pathTitle")}</h2>
          <p>{t("ls.pathLead")}</p>
        </div>

        <div className="dash">
          <div className="dash-main">
            <span className="dash-label">{t("ls.dashTitle")}</span>

            <div className="dash-figure">
              <svg width={size} height={size} aria-hidden="true" style={{ flex: "none" }}>
                <circle
                  cx={size / 2} cy={size / 2} r={radius}
                  fill="none" stroke="var(--surface-2)" strokeWidth={stroke}
                />
                <circle
                  cx={size / 2} cy={size / 2} r={radius}
                  fill="none" stroke="var(--gold)" strokeWidth={stroke} strokeLinecap="round"
                  strokeDasharray={`${(circumference * score) / 100} ${circumference}`}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              </svg>
              <div className="stack" style={{ gap: 8 }}>
                <span className="dash-value">
                  {score}
                  <em> / 100</em>
                </span>
                <p className="dash-caption">{t("ls.dashCaption")}</p>
              </div>
            </div>

            <div className="dash-bars">
              {dims.map(([key, value]) => (
                <div key={key} className="dash-row">
                  <span>{t(key)}</span>
                  <span className="dash-pct">{value}%</span>
                  <span className="dash-track">
                    <span style={{ width: `${value}%` }} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* One recommendation, not a list of them. A plan that offers four
              equally weighted next steps is a plan nobody starts. */}
          <aside className="dash-next">
            <span className="dash-label">{t("ls.dashNext")}</span>
            <h3>{t("ls.dashNextT")}</h3>
            <p>{t("ls.dashNextD")}</p>
            <Link href="/reja" className="btn btn-primary btn-sm">
              {t("ls.dashCta")}
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------- live rows from the API */

export function ProgramShowcase() {
  const { t, tx } = useI18n();
  const [items, setItems] = useState<Program[]>([]);

  useEffect(() => {
    portal
      .programs("?size=6")
      .then((page) => setItems(page.items))
      .catch(() => setItems([]));
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="section">
      <div className="wrap">
        <div className="sec-head">
          <h2>{t("ls.catTitle")}</h2>
          <p>{t("ls.catLead")}</p>
        </div>

        <div className="showcase-grid">
          {items.map((program) => (
            <article key={program.id} className="tile">
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                <span className="badge">{t(categoryKey(program.category))}</span>
                {program.has_certificate && (
                  <span className="badge badge-grey">{t("ls.cert")}</span>
                )}
              </div>
              <h3 className="tile-title">{tx(program.title_i18n)}</h3>
              <p className="muted small tile-lead">{tx(program.goal_i18n)}</p>
              <span className="faint">
                {program.duration_hours} {t("ls.hours")}
              </span>
              {/* The card ends in the action it is selling. A whole-card link
                  cannot hold a button, so the card is an article and the
                  button is the only thing in it that navigates. */}
              <Link
                href={`/dasturlar/${program.id}`}
                className="btn btn-primary btn-sm btn-block"
              >
                {t("ls.catStart")}
              </Link>
            </article>
          ))}
        </div>

        <div className="sec-more">
          <Link href="/dasturlar" className="btn btn-outline">
            {t("ls.catAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function rewardLine(reward: Record<string, unknown>, locale: string): string | null {
  const currency = (reward.currency as string) ?? "UZS";
  if (reward.salary_from) {
    const to = reward.salary_to ? `–${money(Number(reward.salary_to), currency, locale)}` : "";
    return `${money(Number(reward.salary_from), currency, locale)}${to}`;
  }
  if (reward.amount) return money(Number(reward.amount), currency, locale);
  if (reward.stipend) return money(Number(reward.stipend), currency, locale);
  if (typeof reward.commission_percent === "number") {
    return `${reward.commission_percent}%`;
  }
  return null;
}

/* Read order for the breakdown: paid work first, then capital, then the rest.
   A visitor scanning it should meet the most concrete thing on offer first. */
const TYPE_ORDER = [
  "vacancy",
  "internship",
  "grant",
  "investment",
  "marketplace",
  "mentorship",
  "international_program",
] as const;

export function OpportunityShowcase() {
  const { t, tx, locale } = useI18n();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<OpportunityStats | null>(null);

  useEffect(() => {
    portal
      .opportunitiesPublic({ size: 4 })
      .then((page) => setItems(page.items))
      .catch(() => setItems([]));
    // What is on offer, said in numbers rather than adjectives — and said
    // before the page asks anyone to register. Its own request, so a missing
    // count never costs the visitor the listings themselves.
    portal
      .opportunityStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="section">
      <div className="wrap stack" style={{ gap: 24 }}>
        <div className="sec-head" style={{ marginBottom: 0 }}>
          <h2>{t("ls.opTitle")}</h2>
          <p>{t("ls.opLead")}</p>
        </div>

        {stats && stats.total > 0 && (
          <div className="stack" style={{ gap: 10, alignItems: "center" }}>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <Link href="/imkoniyatlar" className="stat-pill stat-pill-hot stat-pill-link">
                {t("ls.opTotal")} <strong>{stats.total}</strong>
              </Link>
              {stats.regions > 0 && (
                <Link href="/imkoniyatlar" className="stat-pill stat-pill-link">
                  {t("ls.opRegions")} <strong>{stats.regions}</strong>
                </Link>
              )}
              {/* Each count opens the rows it counted — a pill that reads as a
                  chip and does nothing when pressed is a broken control. */}
              {TYPE_ORDER.filter((key) => stats.by_type[key] > 0).map((key) => (
                <Link
                  key={key}
                  href={`/imkoniyatlar?type=${key}`}
                  className="stat-pill stat-pill-link"
                >
                  {t(`typp.${key}` as MessageKey)} <strong>{stats.by_type[key]}</strong>
                </Link>
              ))}
            </div>
            <p className="faint center">{t("ls.opOpen")}</p>
          </div>
        )}

        <div className="showcase-grid showcase-grid-2">
          {items.map((item) => {
            const reward = rewardLine(item.reward, locale);
            const left = item.deadline
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(item.deadline).getTime() - Date.now()) / 86_400_000,
                  ),
                )
              : null;
            return (
              <Link key={item.id} href="/imkoniyatlar" className="tile tile-op">
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <span className="badge">{t(sourceKey(item.source))}</span>
                  <span className="badge badge-grey">{t(typeKey(item.type))}</span>
                  {left !== null && left <= 30 && (
                    <span className="badge badge-red">
                      {left} {t("ls.deadline")}
                    </span>
                  )}
                </div>
                <h3 className="tile-title">{tx(item.title_i18n)}</h3>
                <p className="muted small tile-lead">{tx(item.description_i18n)}</p>
                <div className="spread">
                  <span className="faint">{item.organisation}</span>
                  {reward && <strong className="small">{reward}</strong>}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="sec-more">
          <Link href="/imkoniyatlar" className="btn btn-outline">
            {t("ls.opAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}
