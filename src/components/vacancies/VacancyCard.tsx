"use client";

/**
 * One listing from the job board, readable in a few seconds.
 *
 * The employer's mark and name, the title, then the salary — set in the
 * display face, because it is the first figure a job seeker reads and the
 * one thing this card must never embellish: it reads exactly as the employer
 * wrote it, or says "not specified". Below it the facts the board states —
 * place, format, experience, employment — the board's own extract, and when
 * it was published. The title's link covers the card.
 */

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n";
import type { Vacancy, VacancyEmployer } from "@/services/portal";
import { regionKey } from "@/utils/format";
import { safeHttpUrl } from "@/utils/url";
import {
  currencyUnit,
  employmentKey,
  experienceKey,
  fill,
  publishedLine,
  salaryLine,
  scheduleKey,
  shortDate,
  workFormatKey,
} from "./format";

export function useVacancyWords() {
  const { t, locale } = useI18n();
  const unit = (currency: string | null) => currencyUnit(currency, locale);
  const date = (value: Date) => shortDate(value, locale);
  return {
    salary: (vacancy: Pick<Vacancy, "salary">) => {
      const line = salaryLine(vacancy.salary, unit);
      return { text: fill(t(line.key), line.values), stated: line.key !== "vac.salary.none" };
    },
    published: (iso: string | null) => {
      const line = publishedLine(iso, Date.now(), date);
      return line ? fill(t(line.key), line.values) : null;
    },
    place: (vacancy: Pick<Vacancy, "region" | "area">) =>
      vacancy.region ? t(regionKey(vacancy.region)) : (vacancy.area ?? t("op.wholeCountry")),
    format: (vacancy: Pick<Vacancy, "work_formats" | "schedule">) =>
      vacancy.work_formats.length
        ? vacancy.work_formats.map((id) => t(workFormatKey(id))).join(", ")
        : vacancy.schedule
          ? t(scheduleKey(vacancy.schedule))
          : null,
  };
}

export function EmployerMark({ employer, size = 44 }: { employer: VacancyEmployer; size?: number }) {
  // A logo the board links to but no longer serves falls back to the initial,
  // not to the browser's broken-image glyph.
  const [broken, setBroken] = useState(false);
  const initial = (employer.name.trim()[0] ?? "•").toUpperCase();
  // The board's address is data until it proves to be a web address.
  const logo = safeHttpUrl(employer.logo_url);
  return (
    <span className="vc-logo" style={{ width: size, height: size }} aria-hidden="true">
      {logo && !broken ? (
        // The board's own image URL: not a Next asset, so not <Image>.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          loading="lazy"
          width={size}
          height={size}
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="vc-logo-initial">{initial}</span>
      )}
    </span>
  );
}

export function VacancyCard({ item }: { item: Vacancy }) {
  const { t } = useI18n();
  const words = useVacancyWords();
  const salary = words.salary(item);
  const published = words.published(item.published_at);
  const format = words.format(item);

  return (
    <li className={`vc-card${item.is_active ? "" : " is-closed"}`}>
      <div className="vc-card-head">
        <EmployerMark employer={item.employer} />
        <div className="vc-heading">
          <h2 className="vc-title">
            <Link href={`/vakansiyalar/${encodeURIComponent(item.id)}`} className="vc-link">
              {item.title}
            </Link>
          </h2>
          <p className="vc-employer">{item.employer.name}</p>
        </div>
        {item.is_internship && <span className="vc-tag">{t("vac.pick.internship")}</span>}
      </div>

      <p className={`vc-salary${salary.stated ? "" : " is-none"}`}>{salary.text}</p>

      <ul className="vc-facts">
        <li>{words.place(item)}</li>
        {format && <li>{format}</li>}
        {item.experience && <li>{t(experienceKey(item.experience))}</li>}
        {item.employment && <li>{t(employmentKey(item.employment))}</li>}
      </ul>

      {item.snippet && <p className="vc-snippet">{item.snippet}</p>}

      <div className="vc-card-foot">
        {published && <span className="vc-date">{published}</span>}
        {!item.is_active && <span className="vc-closed">{t("vac.closed")}</span>}
        <span className="vc-cta" aria-hidden="true">
          {t("vac.details")}
          <svg width="18" height="18" viewBox="0 0 20 20" focusable="false">
            <path d="M7.5 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </li>
  );
}

/** The grey shapes of a card while the board answers. */
export function VacancyCardSkeleton() {
  return (
    <li className="vc-card is-skeleton" aria-hidden="true">
      <div className="vc-card-head">
        <span className="skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} />
        <div className="vc-heading">
          <span className="skeleton" style={{ height: 22, width: "70%" }} />
          <span className="skeleton" style={{ height: 16, width: "40%", marginTop: 8 }} />
        </div>
      </div>
      <span className="skeleton" style={{ height: 24, width: "55%" }} />
      <span className="skeleton" style={{ height: 16, width: "85%" }} />
      <span className="skeleton" style={{ height: 16, width: "60%" }} />
    </li>
  );
}
