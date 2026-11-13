"use client";

/**
 * The check-in result: who she said she is, where she stands, what she is
 * already good at, where she can grow most right now — and the courses
 * chosen for her goal, in the order to take them.
 *
 * Read like a map, not a report card. The number is "your development
 * point", every score carries a stage name that describes rather than judges
 * (starting point … advanced), and what to work on is ranked by her goals and
 * situation as well as by need — the server's priority, explained here.
 *
 * The courses are the server's too: the rules find and rank them from the
 * catalogue, the model (when it is on) explains them, and the page says which
 * wrote the words. Nothing here is a verdict — every course links to its own
 * page, and the decision to start is hers.
 *
 * An earlier attempt opens with `?attempt=<id>`; the server only ever returns
 * her own.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError, getAccessToken } from "@/services/api";
import {
  portal,
  type DiagnosticHistoryItem,
  type DiagnosticLevel,
  type DiagnosticPriority,
  type DiagnosticProfile,
  type DiagnosticQuestion,
  type DiagnosticRecommendation,
  type DiagnosticResult,
  type RecommendationPriority,
  type RecommendedCourse,
} from "@/services/portal";
import { Bar, Empty, ErrorNote, Loading, NeedsAuth } from "@/components/ui";
import { useStepCopy } from "@/components/Recommendations";
import { alignSteps } from "@/components/diagnostic/steps";
import { levelKey } from "@/components/learning/ui";
import { useI18n, type MessageKey, formatDate } from "@/i18n";
import { dimensionKey } from "@/utils/format";
import { hostOf } from "@/utils/url";

/** The stages in order, with where each starts — the ruler's zones. */
const STAGES: ReadonlyArray<[DiagnosticLevel, number]> = [
  ["starting_point", 0],
  ["building_foundation", 25],
  ["good_foundation", 50],
  ["strong_area", 75],
  ["advanced", 90],
];

/** Which question each profile line was answered on, so the page can show
 *  her answer in the bank's own words instead of keeping a second copy. */
const PROFILE_QUESTION: Record<string, string> = {
  situation: "pro.q1",
  goal_primary: "pro.q3",
  interests: "pro.q6",
};

const PRIORITIES: RecommendationPriority[] = ["high", "medium", "additional"];

/** Where "good foundation" starts — the lowest score called a strength. */
const STRONG_FROM = 50;

export default function DiagnosticResultPage() {
  const { tn, t, tx, tu, locale } = useI18n();
  const copy = useStepCopy();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [history, setHistory] = useState<DiagnosticHistoryItem[]>([]);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [courses, setCourses] = useState<DiagnosticRecommendation | null>(null);
  const [coursesFailed, setCoursesFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    setAuthed(Boolean(token));
    if (!token) return;
    const attempt = new URLSearchParams(window.location.search).get("attempt") ?? undefined;
    portal
      .diagnosticResult(attempt)
      .then(setResult)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setMissing(true);
        else setFailed(true);
      });
    portal.diagnosticHistory().then(setHistory).catch(() => setHistory([]));
    portal.diagnosticQuestions().then((r) => setQuestions(r.questions)).catch(() => setQuestions([]));
    // Built on first request, then served from the attempt. The rules answer
    // at once; while the model is still writing its words (`ai_pending`) the
    // page asks again every few seconds, for a couple of minutes at most.
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fetchCourses = () =>
      portal
        .diagnosticRecommendations(attempt)
        .then((rec) => {
          setCourses(rec);
          if (rec.ai_pending && polls < 24) {
            polls += 1;
            timer = setTimeout(fetchCourses, 5000);
          }
        })
        .catch(() => setCoursesFailed(true));
    fetchCourses();
    return () => clearTimeout(timer);
  }, []);

  const byCode = useMemo(() => new Map(questions.map((q) => [q.code, q])), [questions]);

  if (authed === false) return <main className="wrap page"><NeedsAuth /></main>;
  if (failed) return <main className="wrap page"><ErrorNote message={t("lms.err.title")} /></main>;
  if (missing) {
    return (
      <main className="wrap page">
        <Empty
          title={t("dr.none")}
          hint={t("dr.noneHint")}
          action={
            <Link href="/kabinet/diagnostika" className="btn btn-primary">
              {t("dr.start")}
            </Link>
          }
        />
      </main>
    );
  }
  if (!result) return <main className="wrap page"><Loading rows={5} /></main>;

  const levelLabel = (level: DiagnosticLevel) => t(`dr.level.${level}` as MessageKey);
  const scoreOf = (dimension: string) =>
    result.dimensions.find((d) => d.dimension === dimension)?.score ?? 0;
  const date = (iso: string | null) =>
    iso ? formatDate(locale, iso) : "";
  const earlier = history.filter((item) => item.attempt_id !== result.attempt_id);

  /* QA D-03: a strength is a direction that has actually reached a good
     foundation (50+). With low or equal scores the top two were zeros, and
     "your strengths: 0, 0" is not encouragement. */
  const strengths = result.strongest.filter((dimension) => scoreOf(dimension) >= STRONG_FROM);

  /* QA D-06: the course steps come from the same list as "courses for your
     goal" above. The two used to be chosen by different engines, so the page
     recommended one set of courses and then told her to start a different
     one. Non-course steps (CV, a learning path, a task) are kept as the
     server ranked them; a course step names the top recommended course. */
  const steps = alignSteps(result.next_steps, courses?.courses ?? []);

  /** Her answer on a profile question, in the bank's words. */
  const answerLabel = (field: string, value: string): string => {
    const question = byCode.get(PROFILE_QUESTION[field]);
    const option = question?.options.find((o) => o.id === value);
    return option ? tx(option.label_i18n) : value;
  };

  async function refresh() {
    setRefreshing(true);
    setCoursesFailed(false);
    try {
      const attempt = new URLSearchParams(window.location.search).get("attempt") ?? undefined;
      setCourses(await portal.refreshDiagnosticRecommendations(attempt));
    } catch {
      setCoursesFailed(true);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="wrap page">
      <div className="dr">
        {/* ---- her point -------------------------------------------------- */}
        <section className="dr-hero" aria-labelledby="dr-point">
          <h1 id="dr-point" className="dr-kicker" style={{ fontSize: "1rem", margin: 0 }}>
            {t("dr.point")}
          </h1>
          <div className="dr-figure">
            <span className="dr-number">{result.overall}</span>
            <span className="dr-of">/ 100</span>
            <span className="dr-stage">{levelLabel(result.level)}</span>
          </div>
          <p className="dr-lead">{t(`dr.lead.${result.level}` as MessageKey)}</p>
          {/* QA D-20: this number is the diagnostic's; the cabinet ring is
              today's score and moves with finished courses. */}
          <p className="faint small">{t("dr.pointNote")}</p>

          <div className="dr-ruler" aria-hidden="true">
            <span className="dr-ruler-pin" style={{ left: `${result.overall}%` }} />
            <div className="dr-ruler-track">
              {STAGES.map(([level, from]) => (
                <span
                  key={level}
                  className={result.overall >= from ? "dr-ruler-zone reached" : "dr-ruler-zone"}
                />
              ))}
            </div>
            <div className="dr-ruler-labels">
              {STAGES.map(([level]) => (
                <span key={level} className={level === result.level ? "here" : undefined}>
                  {levelLabel(level)}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* QA D-23: she said she often cannot cope. A quiet offer of support,
            not an alarm — nothing about her score changes, and the field is
            simply absent on a server that does not send it. */}
        {result.support_suggested === true && (
          <section className="card stack dr-support" aria-labelledby="dr-support">
            <h2 id="dr-support" className="dr-h2" style={{ margin: 0 }}>{t("dr.support.title")}</h2>
            <p className="muted">{t("dr.support.lead")}</p>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <Link href="/yordamchi?tab=health" className="btn btn-outline btn-sm">
                {t("dr.support.assistant")}
              </Link>
              <a href="tel:1146" className="btn btn-ghost btn-sm">
                {t("dr.support.call")}
              </a>
            </div>
          </section>
        )}

        {/* ---- who she said she is ---------------------------------------- */}
        {result.profile && <About profile={result.profile} label={answerLabel} />}

        {/* ---- the eight -------------------------------------------------- */}
        <section aria-labelledby="dr-dims">
          <h2 id="dr-dims" className="dr-h2">{t("dr.dimensions")}</h2>
          <ul className="dr-dims">
            {result.dimensions.map((d) => {
              const moved = d.current !== null && Math.round(d.current) > d.score;
              return (
                <li key={d.dimension} className="dr-dim">
                  <span className="dr-dim-name">
                    {t(dimensionKey(d.dimension))}
                    <span className="dr-dim-level">
                      {levelLabel(d.level)} — {t(`dr.levelHint.${d.level}` as MessageKey)}
                    </span>
                  </span>
                  <Bar value={d.score} />
                  <span className="dr-dim-score">{d.score}</span>
                  {moved && (
                    <span className="dr-dim-now">
                      {t("dr.now").replace("{value}", String(Math.round(d.current!)))}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---- strengths and growth --------------------------------------- */}
        <div className="dr-pair">
          <section aria-labelledby="dr-strong">
            <h2 id="dr-strong" className="dr-h2">{t("dr.strongest")}</h2>
            <ul className="dr-list">
              {strengths.length === 0 && (
                <li className="dr-item muted small">{t("dr.strongEmpty")}</li>
              )}
              {strengths.map((dimension) => (
                <li key={dimension} className="dr-item">
                  <span className="dr-item-head">
                    <span>{t(dimensionKey(dimension))}</span>
                    <span>{scoreOf(dimension)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="dr-grow">
            <h2 id="dr-grow" className="dr-h2">{t("dr.growth")}</h2>
            <p className="muted small" style={{ marginTop: -6 }}>{t("dr.growthLead")}</p>
            <ul className="dr-list">
              {result.growth.map((item) => (
                <li key={item.dimension} className="dr-item">
                  <span className="dr-item-head">
                    <span>{t(dimensionKey(item.dimension))}</span>
                    <span>{scoreOf(item.dimension)}</span>
                  </span>
                  <span className="dr-why">
                    {reasons(item).map((key) => (
                      <span key={key} className="badge badge-grey">{t(key)}</span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---- courses for her goal --------------------------------------- */}
        <section aria-labelledby="dr-courses" className="dr-courses">
          <h2 id="dr-courses" className="dr-h2">{t("dr.courses")}</h2>
          <p className="muted small" style={{ marginTop: -6 }}>{t("dr.coursesLead")}</p>
          {coursesFailed ? (
            <div className="dr-courses-state">
              <ErrorNote message={t("dr.coursesFailed")} />
              <button type="button" className="btn btn-outline btn-sm" onClick={refresh} disabled={refreshing}>
                {refreshing ? t("dr.refreshing") : t("lms.err.retry")}
              </button>
            </div>
          ) : !courses ? (
            <div className="dr-courses-state" aria-live="polite">
              <Loading rows={3} />
              <p className="muted small">{t("dr.coursesLoading")}</p>
            </div>
          ) : (
            <Courses
              rec={courses}
              refreshing={refreshing}
              onRefresh={refresh}
              date={date(courses.generated_at)}
            />
          )}
        </section>

        {/* ---- next steps ------------------------------------------------- */}
        <section aria-labelledby="dr-steps">
          <h2 id="dr-steps" className="dr-h2">{t("dr.steps")}</h2>
          {steps.length === 0 ? (
            <p className="muted">{t("dr.noSteps")}</p>
          ) : (
            <ol className="dr-steps">
              {steps.map((step, index) => (
                <li key={`${step.kind}-${step.program?.id ?? step.path?.slug ?? index}`} className="dr-step">
                  <span className="dr-step-title">{copy.title(step)}</span>
                  {step.dimension && (
                    <span className="dr-step-area">{t(dimensionKey(step.dimension))}</span>
                  )}
                  <Link href={copy.href(step)} className="btn btn-outline btn-sm">
                    {copy.action(step)}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="dr-foot">
          <Link href="/kabinet" className="btn btn-primary">{t("dr.toCabinet")}</Link>
          <Link href="/kabinet/diagnostika" className="btn btn-ghost">{t("dr.retake")}</Link>
        </div>

        {earlier.length > 0 && (
          <section aria-labelledby="dr-history">
            <h2 id="dr-history" className="dr-h2">{t("dr.history")}</h2>
            <ul className="dr-history">
              {earlier.map((item) => (
                <li key={item.attempt_id}>
                  <span>{date(item.completed_at)}</span>
                  {item.overall !== null ? (
                    <a href={`/kabinet/diagnostika/natija?attempt=${item.attempt_id}`}>
                      {item.overall} / 100
                    </a>
                  ) : (
                    <span className="faint">{t("dr.historyOld")}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );

  /* ---- who she said she is ----------------------------------------------- */

  function About({
    profile,
    label,
  }: {
    profile: DiagnosticProfile;
    label: (field: string, value: string) => string;
  }) {
    const rows: Array<[MessageKey, string]> = [];
    if (profile.situation) rows.push(["dr.about.situation", label("situation", profile.situation)]);
    if (profile.goal_primary) rows.push(["dr.about.goal", label("goal_primary", profile.goal_primary)]);
    if (profile.interests?.length) {
      rows.push(["dr.about.interests", profile.interests.map((v) => label("interests", v)).join(", ")]);
    }
    if (rows.length === 0 && !profile.goal_text) return null;
    return (
      <section aria-labelledby="dr-about" className="dr-about">
        <h2 id="dr-about" className="dr-h2">{t("dr.about")}</h2>
        <dl className="dr-about-grid">
          {rows.map(([key, value]) => (
            <div key={key} className="dr-about-row">
              <dt>{t(key)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          {profile.goal_text && (
            <div className="dr-about-row dr-about-wide">
              <dt>{t("dr.about.inWords")}</dt>
              <dd className="dr-about-quote">{tu(profile.goal_text)}</dd>
            </div>
          )}
        </dl>
      </section>
    );
  }

  /* ---- the courses, the gaps, the route ---------------------------------- */

  function Courses({
    rec,
    refreshing,
    onRefresh,
    date: when,
  }: {
    rec: DiagnosticRecommendation;
    refreshing: boolean;
    onRefresh: () => void;
    date: string;
  }) {
    const titleOf = new Map(rec.courses.map((c) => [c.program.id, tx(c.program.title_i18n)]));
    const goal = tx(rec.summary.goal_i18n);
    const situation = tx(rec.summary.situation_i18n);
    const grouped = PRIORITIES.map((p) => [p, rec.courses.filter((c) => c.priority === p)] as const)
      .filter(([, list]) => list.length > 0);

    return (
      <div className="dr-rec">
        {rec.mode !== "insufficient" && (
          <p className="dr-mode faint small" aria-live="polite">
            {rec.ai_pending ? t("dr.mode.pending") : t(`dr.mode.${rec.mode}` as MessageKey)}
            {when && <> · {t("dr.generated").replace("{date}", when)}</>}
          </p>
        )}

        {(goal || situation) && (
          <blockquote className="dr-summary">
            {goal && <p>{goal}</p>}
            {situation && <p className="muted">{situation}</p>}
          </blockquote>
        )}

        {rec.gaps.length > 0 && (
          <div className="dr-gaps">
            <span className="dr-gaps-title">{t("dr.gaps")}</span>
            <ul className="dr-gap-list">
              {rec.gaps.slice(0, 8).map((gap) => (
                <li key={gap.slug} className="dr-gap">
                  <span>{tx(gap.name_i18n) || gap.slug}</span>
                  <span className="dr-gap-why">{t(`dr.gapWhy.${gap.why}` as MessageKey)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {rec.follow_up && (
          <p className="dr-follow">
            <strong>{t("dr.followUp")}:</strong> {tx(rec.follow_up)}
          </p>
        )}

        {rec.courses.length === 0 ? (
          <Empty
            title={t("dr.noCourses")}
            hint={t("dr.noCoursesHint")}
            action={<Link href="/dasturlar" className="btn btn-outline btn-sm">{t("nav.programs")}</Link>}
          />
        ) : (
          grouped.map(([priority, list]) => (
            <div key={priority} className="dr-group">
              <h3 className="dr-h3">
                <span className={`dr-prio dr-prio-${priority}`} aria-hidden="true" />
                {t(`dr.priority.${priority}` as MessageKey)}
              </h3>
              <ul className="dr-course-list">
                {list.map((course) => <CourseRow key={course.program.id} course={course} />)}
              </ul>
            </div>
          ))
        )}

        {rec.roadmap.length > 0 && (
          <div className="dr-road">
            <h3 className="dr-h3">{t("dr.roadmap")}</h3>
            <p className="muted small" style={{ marginTop: -4 }}>{t("dr.roadmapLead")}</p>
            <ol className="dr-road-stages">
              {rec.roadmap.map((stage, i) => (
                <li key={i} className="dr-road-stage">
                  <span className="dr-road-title">{tx(stage.title_i18n)}</span>
                  <ul className="dr-road-items">
                    {stage.items.map((item, j) => (
                      <li key={j} className={`dr-road-item is-${item.kind}`}>
                        {item.kind === "course" && item.program_id ? (
                          <Link href={`/dasturlar/${item.program_id}`}>
                            {titleOf.get(item.program_id) ?? t("dr.open")}
                          </Link>
                        ) : (
                          <span>{item.text_i18n ? tx(item.text_i18n) : ""}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        )}

        {rec.next_steps.length > 0 && (
          <ul className="dr-rec-notes">
            {rec.next_steps.map((note, i) => <li key={i}>{tx(note)}</li>)}
          </ul>
        )}

        <div className="dr-rec-foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? t("dr.refreshing") : t("dr.refresh")}
          </button>
          <span className="faint small">{t("dr.refreshHint")}</span>
        </div>
      </div>
    );
  }

  function CourseRow({ course }: { course: RecommendedCourse }) {
    const { program } = course;
    const href = `/dasturlar/${program.id}`;
    const outside = program.external_url ? hostOf(program.external_url) : null;
    const status = course.enrollment_status;
    const action: MessageKey =
      status === "completed" ? "lms.course.review"
        : status === "in_progress" || status === "enrolled" ? "lms.course.continue"
          : "dr.open";
    const meta = [
      program.provider ?? outside,
      program.level ? t(levelKey(program.level)) : null,
      program.duration_hours ? `${program.duration_hours} ${tn("unit.hour", program.duration_hours)}` : null,
    ].filter(Boolean);

    return (
      <li className="dr-course">
        <div className="dr-course-head">
          <h4 className="dr-course-title"><Link href={href}>{tx(program.title_i18n)}</Link></h4>
          {meta.length > 0 && <span className="dr-course-meta">{meta.join(" · ")}</span>}
        </div>
        <dl className="dr-course-body">
          <div>
            <dt>{t("dr.why")}</dt>
            <dd>{tx(course.why_i18n)}</dd>
          </div>
          {tx(course.outcome_i18n) && (
            <div>
              <dt>{t("dr.outcome")}</dt>
              <dd>{tx(course.outcome_i18n)}</dd>
            </div>
          )}
        </dl>
        <div className="dr-course-foot">
          {course.covers.length > 0 && (
            <span className="dr-course-skills">
              {course.covers.map((skill) => (
                <span key={skill.slug ?? skill.label} className="chip chip-sm">
                  {tx(skill.name_i18n) || skill.label}
                </span>
              ))}
            </span>
          )}
          {status && (
            <span className="badge badge-grey">{t(`lms.status.${status === "enrolled" ? "in_progress" : status}` as MessageKey)}</span>
          )}
          <Link href={href} className="btn btn-outline btn-sm" style={{ marginLeft: "auto" }}>
            {t(action)}
          </Link>
        </div>
      </li>
    );
  }
}

/** Why an area is among her priorities, in words — the four parts of the
 *  server's priority that actually apply to it. */
function reasons(item: DiagnosticPriority): MessageKey[] {
  const out: MessageKey[] = [];
  if (item.goal_match >= 100) out.push("dr.why.goal");
  else if (item.goal_match >= 50) out.push("dr.why.goalNear");
  if (item.urgency > 50) out.push("dr.why.now");
  if (item.need >= 50) out.push("dr.why.room");
  return out;
}
