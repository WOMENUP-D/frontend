"use client";

/**
 * The learning dashboard.
 *
 * One question decides the layout: what is she here to do right now? Almost
 * always, continue the thing she was last doing. So "Continue learning" is the
 * only near-black surface on the screen and everything else — progress,
 * courses, deadlines, the goal, the assistant — is quiet and outlined behind
 * it. Spend the boldness once.
 *
 * The right-hand column is the calendar of her commitments; the left is the
 * work itself. On a narrow screen the two stack in that order, so the work
 * still comes first.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import {
  assistantActions,
  continueCourse,
  courseProgress,
  enrolledCourses,
  events,
  findCourse,
  goals,
  learner,
  learningStats,
  nextLesson,
  recommendations,
} from "@/content/learning";
import { useMockData } from "@/components/learning/useMockData";
import {
  Bar,
  CourseCard,
  EmptyState,
  ErrorState,
  EventRow,
  Ring,
  SectionHead,
  Skeleton,
  SkeletonBlock,
  SkeletonCards,
  StatCard,
  duration,
  levelKey,
} from "@/components/learning/ui";

/** Resolved after mount: the hour is a client fact, and reading it during
 *  render would make the server and the browser disagree. */
function useGreeting(): MessageKey | null {
  const [key, setKey] = useState<MessageKey | null>(null);
  useEffect(() => {
    const hour = new Date().getHours();
    setKey(
      hour < 12 ? "lms.greet.morning" : hour < 18 ? "lms.greet.afternoon" : "lms.greet.evening",
    );
  }, []);
  return key;
}

export default function LearningDashboard() {
  const { t, tx } = useI18n();
  const greeting = useGreeting();

  const { data, loading, error, retry } = useMockData(() => ({
    resume: continueCourse(),
    mine: enrolledCourses().slice(0, 4),
    upcoming: events.filter((event) => event.status !== "completed").slice(0, 3),
    recommendation: recommendations[0],
    goal: goals[0],
    stats: {
      completed: learningStats.completed,
      inProgress: learningStats.inProgress,
      hours: learningStats.hours,
      streak: learningStats.streak,
    },
  }));

  if (error) {
    return (
      <>
        <Head greeting={greeting} />
        <ErrorState onRetry={retry} />
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        <Head greeting={greeting} />
        <Skeleton height={186} radius={28} />
        <div className="lms-sec">
          <SkeletonBlock rows={1} />
        </div>
        <div className="lms-sec">
          <SkeletonCards rows={3} />
        </div>
      </>
    );
  }

  const { resume, mine, upcoming, recommendation, goal, stats } = data;
  const recommended = findCourse(recommendation.courseSlug);

  return (
    <>
      <Head greeting={greeting} />

      {/* ---- the one thing to press --------------------------------- */}
      {resume ? <Resume slug={resume.slug} /> : (
        <EmptyState
          title={t("lms.continue.empty")}
          hint={t("lms.continue.emptyHint")}
          action={
            <Link className="lms-btn lms-btn-primary" href="/talim/kurslar">
              {t("lms.courses.explore")}
            </Link>
          }
        />
      )}

      {/* ---- progress ------------------------------------------------ */}
      <section className="lms-sec">
        <SectionHead title={t("lms.stats.title")} />
        <div className="lms-stats">
          <StatCard value={stats.completed} label={t("lms.stats.completed")} />
          <StatCard value={stats.inProgress} label={t("lms.stats.inProgress")} />
          <StatCard value={`${stats.hours}${t("common.hours").slice(0, 1)}`} label={t("lms.stats.hours")} />
          <StatCard
            value={<>{stats.streak} <span aria-hidden="true">🔥</span></>}
            label={t("lms.stats.streak")}
          />
        </div>
      </section>

      <div className="lms-sec lms-split">
        <div className="lms-col">
          {/* ---- her courses ---------------------------------------- */}
          <section>
            <SectionHead
              title={t("lms.courses.title")}
              href="/talim/kurslar"
              linkLabel={t("lms.courses.all")}
            />
            {mine.length ? (
              <div className="lms-courses">
                {mine.map((course) => <CourseCard key={course.slug} course={course} />)}
              </div>
            ) : (
              <EmptyState
                title={t("lms.courses.empty")}
                hint={t("lms.courses.emptyHint")}
                action={
                  <Link className="lms-btn lms-btn-primary" href="/talim/kurslar">
                    {t("lms.courses.explore")}
                  </Link>
                }
              />
            )}
          </section>

          {/* ---- one recommendation, with its reason ----------------- */}
          {recommended && (
            <section>
              <SectionHead title={t("lms.rec.title")} />
              <article className="lms-card lms-card-pad lms-rec">
                <div className="lms-course-top">
                  <span
                    className={`lms-cover lms-cover-${recommended.tone}`}
                    aria-hidden="true"
                  >
                    {recommended.emblem}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h3 className="lms-course-title">
                      <Link href={`/talim/kurslar/${recommended.slug}`}>
                        {tx(recommended.title)}
                      </Link>
                    </h3>
                    <p className="lms-course-by">{tx(recommended.instructor)}</p>
                  </div>
                </div>

                {/* The AI's reason, shown before the numbers: a suggestion
                    without one is just an advertisement. */}
                <p className="lms-rec-why">{tx(recommendation.reason)}</p>

                <div className="lms-rec-stats">
                  <span>{t("lms.course.level")}: {t(levelKey(recommended.level))}</span>
                  <span>{recommended.weeks} {t("common.weeks")}</span>
                  <span>★ {recommended.rating.toFixed(1)}</span>
                  <span>
                    {new Intl.NumberFormat("uz-UZ").format(recommended.learners)}
                    {" "}{t("lms.course.learners").toLowerCase()}
                  </span>
                </div>

                <div>
                  <Link
                    className="lms-btn lms-btn-primary"
                    href={`/talim/kurslar/${recommended.slug}`}
                  >
                    {t("lms.course.view")}
                  </Link>
                </div>
              </article>
            </section>
          )}
        </div>

        <div className="lms-col">
          {/* ---- what is due ---------------------------------------- */}
          <section className="lms-card lms-card-pad">
            <SectionHead
              title={t("lms.upcoming.title")}
              href="/talim/kalendar"
              linkLabel={t("lms.upcoming.all")}
            />
            {upcoming.length ? (
              <div className="lms-events">
                {upcoming.map((event) => {
                  const course = findCourse(event.courseSlug);
                  return (
                    <EventRow
                      key={event.id}
                      event={event}
                      courseTitle={course ? tx(course.title) : ""}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="lms-lead" style={{ margin: 0 }}>
                {t("lms.upcoming.emptyHint")}
              </p>
            )}
          </section>

          {/* ---- the goal ------------------------------------------- */}
          {goal && (
            <section className="lms-card lms-card-pad">
              <SectionHead
                title={t("lms.goal.title")}
                href="/talim/maqsadlar"
                linkLabel={t("lms.goal.view")}
              />
              <h3 className="lms-goal-title">{tx(goal.title)}</h3>

              <div
                style={{
                  display: "flex", alignItems: "center", gap: 14, margin: "14px 0 4px",
                }}
              >
                <span className="lms-goal-pct">{goal.percent}%</span>
                <div style={{ flex: 1 }}><Bar percent={goal.percent} /></div>
              </div>

              <div style={{ marginTop: 18 }}>
                <span className="lms-stat-label" style={{ marginTop: 0 }}>
                  {t("lms.goal.weekly")}
                </span>
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 12, marginTop: 7,
                  }}
                >
                  <strong style={{ fontSize: "0.95rem", whiteSpace: "nowrap" }}>
                    {learner.weeklyDoneHours} / {learner.weeklyTargetHours} {t("common.hours")}
                  </strong>
                  <div style={{ flex: 1 }}>
                    <Bar
                      percent={(learner.weeklyDoneHours / learner.weeklyTargetHours) * 100}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ---- the assistant --------------------------------------- */}
          <section className="lms-ai">
            <div className="lms-ai-head">
              <span className="lms-ai-mark" aria-hidden="true">◈</span>
              <h2 className="lms-ai-title">{t("lms.ai.title")}</h2>
            </div>
            <p className="lms-lead" style={{ margin: "12px 0 14px", fontSize: "0.92rem" }}>
              {t("lms.ai.lead")}
            </p>
            <div className="lms-chips">
              {assistantActions.map((action) => (
                <Link
                  key={action.id}
                  className="lms-chip"
                  href={`/talim/yordamchi?ask=${action.id}`}
                >
                  {tx(action.label)}
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Link className="lms-btn lms-btn-primary" href="/talim/yordamchi">
                {t("lms.ai.ask")}
              </Link>
            </div>
            <p className="lms-disclaimer">{t("lms.ai.disclaimer")}</p>
          </section>
        </div>
      </div>
    </>
  );
}

/* ---- pieces ---------------------------------------------------------- */

function Head({ greeting }: { greeting: MessageKey | null }) {
  const { t } = useI18n();
  return (
    <header className="lms-head">
      <h1 className="lms-h1">
        {greeting ? `${t(greeting)}, ${learner.name}` : learner.name}{" "}
        <span aria-hidden="true">👋</span>
      </h1>
      <p className="lms-lead">
        {t("lms.greet.sub")} {t("lms.greet.streak")}
      </p>
    </header>
  );
}

/** Re-reads the course by slug so the card always reflects the dataset rather
 *  than a copy captured when the page loaded. */
function Resume({ slug }: { slug: string }) {
  const { t, tx } = useI18n();
  const course = findCourse(slug);
  if (!course) return null;

  const progress = courseProgress(course);
  const next = nextLesson(course);

  return (
    <section className="lms-hero">
      <div style={{ minWidth: 0 }}>
        <span className="lms-hero-label">{t("lms.continue.title")}</span>
        <h2 className="lms-hero-title">{tx(course.title)}</h2>

        {next && (
          <>
            <p className="lms-hero-lesson">
              {t("lms.continue.current")}: <strong>{tx(next.title)}</strong>
            </p>
            <p className="lms-hero-meta">
              {progress.done} / {progress.total} {t("lms.course.lessons")}
              {" · "}
              {duration(progress.minutesLeft, t("lms.lesson.min"), t("common.hours"))}
            </p>
          </>
        )}

        <div className="lms-hero-bar">
          <span style={{ width: `${progress.percent}%` }} />
        </div>

        <Link
          className="lms-hero-cta"
          href={next
            ? `/talim/kurslar/${course.slug}/${next.slug}`
            : `/talim/kurslar/${course.slug}`}
        >
          {t("lms.continue.action")}
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="lms-hero-side">
        <Ring percent={progress.percent} size={116} onDark />
      </div>
    </section>
  );
}
