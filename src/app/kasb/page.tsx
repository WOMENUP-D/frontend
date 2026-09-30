"use client";

/**
 * Find a career direction.
 *
 * One decision on this screen: which direction to open. Everything else is in
 * service of it — her own direction on top when she has one, a choice between
 * working for somebody and working for herself, and the directions as cards
 * that each say, in a sentence, what the work is and how much of it she
 * already has.
 *
 * Open to a visitor. The catalogue is the answer to "what can this platform
 * lead to?", and a newcomer is owed it before she has an account; her fit on
 * each direction simply appears once she is signed in.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { getAccessToken } from "@/services/api";
import { portal, type CareerCategory } from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import { ErrorNote, Loading } from "@/components/ui";
import { CareerCard } from "@/components/career/CareerCard";
import { MyCareer } from "@/components/career/MyCareer";

type Filter = CareerCategory | "all";
const FILTERS: Filter[] = ["all", "employment", "own_business"];

export default function CareersPage() {
  const { t } = useI18n();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const { data, loading, error, retry } = useApi(() => portal.careers(), []);

  useEffect(() => setAuthed(Boolean(getAccessToken())), []);

  const cards = data ?? [];
  const shown = filter === "all" ? cards : cards.filter((card) => card.category === filter);
  // The filter only earns its place when both kinds of work exist.
  const kinds = new Set(cards.map((card) => card.category));

  return (
    <main className="wrap page cp-page">
      <header className="cp-hero">
        <h1 className="cp-h1">{t("car.title")}</h1>
        <p className="cp-lead">{t("car.lead")}</p>
      </header>

      {authed && cards.length > 0 && (
        <div className="cp-mine">
          <MyCareer showFind={false} />
        </div>
      )}

      {authed === false && cards.length > 0 && (
        <p className="cp-signin">
          {t("car.signIn")}{" "}
          <Link href="/login" className="cp-inline-link">
            {t("car.signInCta")}
          </Link>
        </p>
      )}

      {loading ? (
        <Loading rows={3} />
      ) : error ? (
        <div className="stack" style={{ gap: 12 }}>
          <ErrorNote message={t("car.loadError")} />
          <button type="button" className="btn btn-outline" onClick={retry}>
            {t("lms.err.retry")}
          </button>
        </div>
      ) : cards.length === 0 ? (
        <section className="cp-empty">
          <h2 className="cp-h2">{t("car.empty")}</h2>
          <p>{t("car.emptyHint")}</p>
          <div className="cp-empty-actions">
            <Link href="/dasturlar" className="btn btn-primary">
              {t("nav.programs")}
            </Link>
            <Link href="/imkoniyatlar" className="btn btn-outline">
              {t("nav.opportunities")}
            </Link>
          </div>
        </section>
      ) : (
        <>
          {kinds.size > 1 && (
            <fieldset className="cp-filter">
              <legend className="sr-only">{t("car.filterLabel")}</legend>
              {FILTERS.map((value) => (
                <label key={value} className={`cp-filter-option${filter === value ? " is-on" : ""}`}>
                  <input
                    type="radio"
                    name="career-kind"
                    value={value}
                    checked={filter === value}
                    onChange={() => setFilter(value)}
                  />
                  <span>{value === "all" ? t("common.all") : t(`car.cat.${value}`)}</span>
                </label>
              ))}
            </fieldset>
          )}

          {shown.length ? (
            <ul className="cp-grid">
              {shown.map((card) => (
                <CareerCard key={card.id} card={card} />
              ))}
            </ul>
          ) : (
            <p className="cp-muted">{t("car.emptyFilter")}</p>
          )}
        </>
      )}
    </main>
  );
}
