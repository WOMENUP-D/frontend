"use client";

/**
 * One listing from the job board, in full and as published.
 *
 * The facts first — employer, salary, place, format, employment,
 * experience, when it was published, where it came from — then the one
 * action this page exists for: applying, which happens on the board through
 * the listing's own link. Beside and below it: the employer's complete
 * description as structured, the skills the board lists, the employer's own
 * page, and the courses WomanUP chose for the requirements.
 *
 * A listing the board has archived still opens, marked closed; one it has
 * deleted is "not found". Nothing is filled in for the employer.
 */

import Link from "next/link";
import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useI18n } from "@/i18n";
import { portal } from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import { ErrorNote, Loading } from "@/components/ui";
import { CoursesPanel } from "@/components/jobs/Detail";
import { EmployerMark, useVacancyWords } from "@/components/vacancies/VacancyCard";
import { hostOf, safeHttpUrl } from "@/utils/url";
import {
  employmentKey,
  experienceKey,
  fill,
  scheduleKey,
} from "@/components/vacancies/format";

export default function VacancyPage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { data, loading, error, retry } = useApi(() => portal.vacancies.get(id), [id]);
  const words = useVacancyWords();
  const loadCourses = useCallback(() => portal.vacancies.courses(id), [id]);

  if (loading) {
    return (
      <main className="wrap page jb-page" aria-busy="true">
        <Loading rows={4} />
      </main>
    );
  }
  if (data === undefined) {
    return (
      <main className="wrap page jb-page">
        <h1 className="jb-h1">{t("vac.notFound")}</h1>
        <p className="jb-lead">{t("vac.notFoundHint")}</p>
        <Link href="/vakansiyalar" className="btn btn-primary">
          {t("vac.back")}
        </Link>
      </main>
    );
  }
  if (error || !data) {
    return (
      <main className="wrap page jb-page">
        <ErrorNote message={t("vac.error")} />
        <button type="button" className="btn btn-outline" onClick={retry}>
          {t("lms.err.retry")}
        </button>
      </main>
    );
  }

  const vacancy = data;
  const salary = words.salary(vacancy);
  const published = words.published(vacancy.published_at);
  const format = words.format(vacancy);
  const label = vacancy.provider === "headhunter" ? "HeadHunter" : vacancy.provider;
  const employer = vacancy.employer;
  // Every address from the board is checked before it becomes a link: only
  // http(s) with a host is rendered, anything else is simply not a link.
  const applyUrl = safeHttpUrl(vacancy.url);
  const employerUrl = safeHttpUrl(employer.url);
  const employerSite = safeHttpUrl(employer.site_url);
  const host = hostOf(vacancy.url) ?? "hh.uz";

  return (
    <main className="wrap page jb-page jb-detail vc-detail">
      <Link href="/vakansiyalar" className="jb-back">
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M12.5 5l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t("vac.back")}
      </Link>

      <header className="jb-head">
        <p className="jb-head-kind">
          {vacancy.is_internship && <span className="jb-kind">{t("vac.pick.internship")}</span>}
          <span className={`jb-open ${vacancy.is_active ? "is-open" : "is-closed"}`}>
            {t(vacancy.is_active ? "job.isOpen" : "vac.closed")}
          </span>
          <span className="jb-src">{fill(t("vac.source"), { label: `${label} (${host})` })}</span>
        </p>
        <div className="vc-detail-employer">
          <EmployerMark employer={employer} size={56} />
          <div>
            <h1 className="jb-h1">{vacancy.title}</h1>
            <p className="vc-employer vc-employer-lg">
              {employerUrl ? (
                <a href={employerUrl} target="_blank" rel="noopener noreferrer nofollow">
                  {employer.name}
                </a>
              ) : (
                employer.name
              )}
              {employer.trusted && <span className="vc-trusted">{t("vac.trusted")}</span>}
            </p>
          </div>
        </div>

        <dl className="jb-facts-list vc-facts-list">
          <div className="vc-fact-salary">
            <dt>{t("job.pay")}</dt>
            <dd className={`vc-salary${salary.stated ? "" : " is-none"}`}>
              {salary.text}
              {salary.stated && vacancy.salary?.gross !== null && vacancy.salary?.gross !== undefined && (
                <span className="vc-gross">{t(vacancy.salary.gross ? "vac.salary.gross" : "vac.salary.net")}</span>
              )}
            </dd>
          </div>
          <div>
            <dt>{t("job.where")}</dt>
            <dd>{words.place(vacancy)}</dd>
          </div>
          {vacancy.address && vacancy.address !== vacancy.area && (
            <div>
              <dt>{t("vac.address")}</dt>
              <dd>{vacancy.address}</dd>
            </div>
          )}
          {format && (
            <div>
              <dt>{t("vac.workFormat")}</dt>
              <dd>
                {format}
                {vacancy.schedule && vacancy.work_formats.length > 0 && ` · ${t(scheduleKey(vacancy.schedule))}`}
              </dd>
            </div>
          )}
          {vacancy.employment && (
            <div>
              <dt>{t("vac.employment")}</dt>
              <dd>{t(employmentKey(vacancy.employment))}</dd>
            </div>
          )}
          {vacancy.experience && (
            <div>
              <dt>{t("vac.experience")}</dt>
              <dd>{t(experienceKey(vacancy.experience))}</dd>
            </div>
          )}
          {published && (
            <div>
              <dt>{t("vac.published")}</dt>
              <dd>{published}</dd>
            </div>
          )}
        </dl>
      </header>

      <div className="jb-detail-side">
        <section className="jb-panel jb-apply" aria-labelledby="vc-apply-h">
          <h2 id="vc-apply-h" className="jb-h2">
            {t("job.apply.title")}
          </h2>
          {vacancy.is_active && applyUrl ? (
            <>
              <a
                href={applyUrl}
                className="btn btn-primary jb-btn-lg"
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {t("vac.apply")}
                <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="M8 4H4.5A1.5 1.5 0 003 5.5v10A1.5 1.5 0 004.5 17h10a1.5 1.5 0 001.5-1.5V12M12 3h5v5M17 3l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <p className="jb-muted">{fill(t("vac.applyNote"), { label })}</p>
              {vacancy.has_test && <p className="jb-muted">{t("vac.hasTest")}</p>}
            </>
          ) : (
            <>
              <p className="jb-blocked-text">{t("vac.closed")}</p>
              <p className="jb-muted">{fill(t("vac.closedHint"), { label })}</p>
              {applyUrl && (
                <a href={applyUrl} className="btn btn-outline" target="_blank" rel="noopener noreferrer nofollow">
                  {fill(t("vac.employerOn"), { label })}
                </a>
              )}
            </>
          )}
        </section>
      </div>

      <div className="jb-detail-main">
        <section className="jb-panel" aria-labelledby="vc-desc-h">
          <h2 id="vc-desc-h" className="jb-h2">
            {t("vac.description")}
          </h2>
          {vacancy.description_html ? (
            // Sanitised on the server to headings, paragraphs, lists and
            // emphasis — the employer's structure, nothing executable.
            <div className="vc-rich" dangerouslySetInnerHTML={{ __html: vacancy.description_html }} />
          ) : (
            <p className="jb-muted">{t("vac.noDescription")}</p>
          )}
          {vacancy.skills.length > 0 && (
            <>
              <p className="jb-fit-label">{t("job.req.skills")}</p>
              <ul className="jb-req-skills vc-skills">
                {vacancy.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </>
          )}
          {vacancy.languages.length > 0 && (
            <>
              <p className="jb-fit-label">{t("vac.languages")}</p>
              <ul className="jb-req-skills vc-skills">
                {vacancy.languages.map((language) => (
                  <li key={language}>{language}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <CoursesPanel id={vacancy.id} load={loadCourses} />

        <section className="jb-panel vc-employer-panel" aria-labelledby="vc-emp-h">
          <h2 id="vc-emp-h" className="jb-h2">
            {t("vac.employer")}
          </h2>
          <div className="vc-detail-employer">
            <EmployerMark employer={employer} size={48} />
            <div>
              <p className="vc-employer vc-employer-lg">{employer.name}</p>
              {employer.industries.length > 0 && (
                <p className="jb-muted">
                  {t("vac.industries")}: {employer.industries.join(", ")}
                </p>
              )}
            </div>
          </div>
          {employer.description_html && (
            <div className="vc-rich" dangerouslySetInnerHTML={{ __html: employer.description_html }} />
          )}
          <p className="vc-employer-links">
            {employerSite && (
              <a href={employerSite} className="jb-inline-link" target="_blank" rel="noopener noreferrer nofollow">
                {t("vac.employerSite")}
              </a>
            )}
            {employerUrl && (
              <a href={employerUrl} className="jb-inline-link" target="_blank" rel="noopener noreferrer nofollow">
                {fill(t("vac.employerOn"), { label })}
              </a>
            )}
          </p>
        </section>
      </div>
    </main>
  );
}
