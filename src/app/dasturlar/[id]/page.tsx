"use client";

/**
 * One programme, on its own page.
 *
 * It used to be a panel that slid in over the catalogue, which meant the card
 * had no address: it could not be linked to, shared, opened in a tab or found
 * again after a reload. A course is the thing a woman decides on, so it gets a
 * page — with what she will learn, what she will be able to do, and what the
 * course is actually made of.
 *
 * Readable without an account. Enrolling is the only part that needs one.
 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, getAccessToken } from "@/services/api";
import { portal, type Program, type ProgramDetail } from "@/services/portal";
import { useI18n, type MessageKey } from "@/i18n";
import { categoryKey, formatKey } from "@/utils/format";
import { Loading } from "@/components/ui";

export default function ProgramPage() {
  const { t, tx } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [related, setRelated] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  // One module open at a time: a page of unfolded modules is the syllabus
  // again, only longer.
  const [expanded, setExpanded] = useState<string | null>(null);
  const signedIn = Boolean(getAccessToken());

  useEffect(() => {
    if (!params?.id) return;
    portal
      .program(params.id)
      .then(setProgram)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setMissing(true);
      })
      .finally(() => setLoading(false));
  }, [params?.id]);

  useEffect(() => {
    if (!program) return;
    portal
      .programs(`?category=${program.category}&size=4`)
      .then((page) => setRelated(page.items.filter((p) => p.id !== program.id).slice(0, 3)))
      .catch(() => setRelated([]));
  }, [program]);

  useEffect(() => {
    if (!signedIn || !program) return;
    portal
      .myEnrollments()
      .then((rows) =>
        setEnrolled(
          (rows as Array<{ program_id: string }>).some((r) => r.program_id === program.id),
        ),
      )
      .catch(() => undefined);
  }, [signedIn, program]);

  async function enrol() {
    if (!program) return;
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      await portal.enroll(program.id);
      setEnrolled(true);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="wrap page">
        <Loading rows={5} />
      </main>
    );
  }

  if (missing || !program) {
    return (
      <main className="wrap page stack" style={{ gap: 14 }}>
        <h1>{t("pd.notFound")}</h1>
        <Link href="/dasturlar" className="btn btn-outline btn-sm" style={{ alignSelf: "start" }}>
          {t("pd.back")}
        </Link>
      </main>
    );
  }

  const totalMinutes = program.modules.reduce((sum, m) => sum + (m.duration_minutes ?? 0), 0);

  return (
    <main>
      {/* --- the header strip, the part she decides from --- */}
      <section className="pd-hero">
        <div className="wrap stack" style={{ gap: 16 }}>
          <Link href="/dasturlar" className="faint pd-back">
            ← {t("pd.back")}
          </Link>

          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="badge">{t(categoryKey(program.category))}</span>
            <span className="badge badge-grey">{t(formatKey(program.format))}</span>
            {program.has_certificate && (
              <span className="badge badge-green">{t("pr.certificate")}</span>
            )}
          </div>

          <h1 className="pd-title">{tx(program.title_i18n)}</h1>
          <p className="lead" style={{ maxWidth: "48rem" }}>{tx(program.goal_i18n)}</p>

          {program.provider && (
            <p className="small">
              <span className="faint">{t("pd.provider")}: </span>
              <strong>{program.provider}</strong>
            </p>
          )}

          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={enrol}
              disabled={busy || enrolled}
            >
              {enrolled ? t("pd.enrolled") : signedIn ? t("pd.enrol") : t("pd.signInFirst")}
            </button>
          </div>
        </div>
      </section>

      {/* --- the figures, as a strip like the catalogue cards promise --- */}
      <section className="wrap">
        <div className="pd-stats">
          {(
            [
              [t("pd.moduleCount").replace("{n}", String(program.modules.length)), t("pd.modules")],
              [`${program.duration_hours ?? "—"} ${t("common.hours")}`, t("pr.duration")],
              [`${program.duration_weeks ?? "—"} ${t("common.weeks")}`, t("pr.period")],
              [t("pd.levelBase"), t("pd.level")],
              [
                t(program.has_certificate ? "common.yes" : "common.no"),
                t("pr.certificate"),
              ],
            ] as Array<[string, string]>
          ).map(([value, label]) => (
            <div key={label} className="pd-stat">
              <strong>{value}</strong>
              <span className="faint">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="wrap pd-body">
          <div className="stack" style={{ gap: 34 }}>
            {program.learning_outcomes.length > 0 && (
              <div className="stack" style={{ gap: 14 }}>
                <h2 className="pd-h2">{t("pd.outcomes")}</h2>
                <ul className="pd-outcomes">
                  {program.learning_outcomes.map((outcome, index) => (
                    <li key={index}>
                      <span className="pd-tick" aria-hidden="true">✓</span>
                      <span>{tx(outcome)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {program.modules.length > 0 && (
              <div className="stack" style={{ gap: 14 }}>
                <div className="spread">
                  <h2 className="pd-h2">{t("pd.modules")}</h2>
                  {totalMinutes > 0 && (
                    <span className="faint">
                      {Math.round(totalMinutes / 60)} {t("common.hours")}
                    </span>
                  )}
                </div>
                {/* Each module opens onto what it actually covers. A list of
                    names a woman cannot look inside tells her nothing about
                    whether the course is the one she needs. */}
                <div className="pd-modules">
                  {program.modules.map((module, index) => {
                    const body = tx(module.content_i18n);
                    const open = expanded === module.id;
                    return (
                      <div key={module.id} className="pd-module">
                        <button
                          className="pd-module-head"
                          onClick={() => setExpanded(open ? null : module.id)}
                          aria-expanded={open}
                          aria-controls={`module-${module.id}`}
                          disabled={!body}
                        >
                          <span className="pd-module-n" aria-hidden="true">{index + 1}</span>
                          <strong className="pd-module-title">{tx(module.title_i18n)}</strong>
                          {module.duration_minutes && (
                            <span className="faint nowrap">
                              {module.duration_minutes} {t("pd.minutes")}
                            </span>
                          )}
                          {body && (
                            <span className={open ? "pd-caret open" : "pd-caret"} aria-hidden="true">
                              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                                <path
                                  d="M1 1.5 6 6.5l5-5"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          )}
                        </button>
                        {open && body && (
                          <div className="pd-module-body" id={`module-${module.id}`}>
                            <p>{body}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <aside className="stack" style={{ gap: 22 }}>
            {program.skills_taught.length > 0 && (
              <div className="card stack" style={{ gap: 10 }}>
                <span className="eyebrow">{t("pd.skills")}</span>
                <div className="row" style={{ gap: 7, flexWrap: "wrap" }}>
                  {program.skills_taught.map((skill) => (
                    <span key={skill} className="badge badge-grey">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {program.next_step && (
              <div className="card stack" style={{ gap: 6 }}>
                <span className="eyebrow">{t("pd.nextStep")}</span>
                <span className="small">{program.next_step}</span>
              </div>
            )}
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section ed-alt">
          <div className="wrap stack" style={{ gap: 20 }}>
            <h2 className="pd-h2">{t("pd.related")}</h2>
            <div className="showcase-grid">
              {related.map((item) => (
                <Link key={item.id} href={`/dasturlar/${item.id}`} className="tile">
                  <span className="badge">{t(categoryKey(item.category) as MessageKey)}</span>
                  <h3 className="tile-title">{tx(item.title_i18n)}</h3>
                  <p className="muted small tile-lead">{tx(item.goal_i18n)}</p>
                  <span className="faint">
                    {item.duration_hours} {t("common.hours")}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
