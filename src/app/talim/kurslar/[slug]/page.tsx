"use client";

/**
 * One course, end to end: what is in it, how far she has got, and the single
 * lesson to open next.
 *
 * Three columns, each with one job — the table of contents navigates, the
 * centre explains, the right-hand panel answers "where am I". The decision
 * worth defending is that the syllabus in the centre repeats the contents on
 * the left rather than avoiding the overlap: the TOC is a jump list she scans
 * with her eyes already on a lesson name, while the centre is what she reads
 * when deciding whether this course is worth ten weeks. The same lessons
 * answer two different questions, so they are shown twice, differently — the
 * centre carries kind and minutes, the TOC carries only completion.
 *
 * Enrolling happens here and nowhere else in the section: the button writes a
 * real enrollment, and every tick afterwards belongs to it.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import {
  portal,
  type Enrollment,
  type EnrollmentDetail,
  type ProgramDetail,
  type ProgramLesson,
  type ProgramModule,
} from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import {
  art,
  isComplete,
  lessonCounts,
  lessonsOf,
  minutesLeft,
  nextLessonOf,
  statusOf,
} from "@/components/learning/course";
import {
  Cover,
  EmptyState,
  ErrorState,
  Ring,
  SectionHead,
  Skeleton,
  SkeletonBlock,
  StatusBadge,
  duration,
  lessonKindKey,
  levelKey,
} from "@/components/learning/ui";

export default function CoursePage() {
  const { t, tx } = useI18n();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const { data, loading, error, retry } = useApi(async () => {
    const course = await portal.programBySlug(slug);
    // A visitor may read the card; only a signed-in woman has an enrollment.
    const mine = await portal.myEnrollments().catch(() => [] as EnrollmentDetail[]);
    return {
      course,
      enrollment: (mine.find((item) => item.program_id === course.id) ?? null) as Enrollment | null,
    };
  }, [slug]);

  // Enrolling updates this page in place: the panel switches to "Continue" and
  // the ticks become hers, without a reload.
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const current = enrollment ?? data?.enrollment ?? null;

  if (error) {
    return (
      <>
        <Back />
        <ErrorState onRetry={retry} />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Back />
        <div className="lms-course-layout">
          <div><SkeletonBlock rows={4} /></div>
          <div style={{ display: "grid", gap: 16 }}>
            <Skeleton height={96} radius={18} />
            <Skeleton height={240} radius={18} />
            <Skeleton height={240} radius={18} />
          </div>
          <div><Skeleton height={330} radius={18} /></div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Back />
        <EmptyState
          title={t("lms.course.notFound")}
          hint={t("lms.course.notFoundHint")}
          action={
            <Link className="lms-btn lms-btn-primary" href="/talim/kurslar">
              {t("lms.course.back")}
            </Link>
          }
        />
      </>
    );
  }

  const { course } = data;
  const lessons = lessonsOf(course);
  const next = nextLessonOf(course, current);

  return (
    <>
      <Back />

      <div className="lms-course-layout">
        <Contents course={course} enrollment={current} next={next} />

        <div style={{ minWidth: 0 }}>
          <header className="lms-head">
            <div className="lms-course-top">
              <Cover tone={art(course.category).tone} emblem={art(course.category).emblem} />
              <div style={{ minWidth: 0 }}>
                <h1 className="lms-h1">{tx(course.title_i18n)}</h1>
                {course.provider && (
                  <p className="lms-course-by">
                    {t("lms.course.provider")}: {course.provider}
                  </p>
                )}
              </div>
            </div>
            <p className="lms-lead">{tx(course.goal_i18n)}</p>
            <div style={{ marginTop: 14 }}>
              <StatusBadge status={statusOf(current)} />
            </div>
          </header>

          <section className="lms-sec">
            <SectionHead title={t("lms.course.contents")} />
            {lessons.length ? (
              <div style={{ display: "grid", gap: 14 }}>
                {course.modules.map((module) => (
                  <ModuleBlock
                    key={module.id}
                    module={module}
                    courseSlug={course.slug}
                    enrollment={current}
                    nextId={next?.id}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title={t("lms.course.noLessons")} hint={t("lms.course.noLessonsHint")} />
            )}
          </section>
        </div>

        <Panel
          course={course}
          enrollment={current}
          next={next}
          onEnrolled={(value) => setEnrollment(value)}
        />
      </div>
    </>
  );
}

/* ---- pieces ---------------------------------------------------------- */

function Back() {
  const { t } = useI18n();
  return (
    <Link className="lms-back" href="/talim/kurslar">
      ← {t("lms.course.back")}
    </Link>
  );
}

/** Completion marker. Done is filled, the next unfinished lesson is ringed,
 *  the rest are hollow — and the first two carry a label, because a colour is
 *  not a state a screen reader can announce. */
function Mark({ state }: { state: "done" | "current" | "todo" }) {
  const { t } = useI18n();
  if (state === "todo") return <span className="lms-mark" aria-hidden="true" />;
  return (
    <span
      className={`lms-mark lms-mark-${state}`}
      role="img"
      aria-label={state === "done" ? t("lms.lesson.completed") : t("lms.continue.current")}
    >
      {state === "done" ? "✓" : ""}
    </span>
  );
}

function markState(
  lesson: ProgramLesson,
  enrollment: Enrollment | null,
  nextId?: string,
): "done" | "current" | "todo" {
  if (isComplete(enrollment, lesson.id)) return "done";
  return lesson.id === nextId ? "current" : "todo";
}

/** The jump list. `aria-current="step"` and not `"page"`: the lesson she is up
 *  to is not the page she is on, and the page-level highlight belongs to the
 *  lesson screen. */
function Contents({
  course, enrollment, next,
}: { course: ProgramDetail; enrollment: Enrollment | null; next: ProgramLesson | null }) {
  const { t, tx } = useI18n();

  return (
    <nav className="lms-toc" aria-label={t("lms.course.contents")}>
      {course.modules.map((module) => (
        <div className="lms-toc-module" key={module.id}>
          <h2 className="lms-toc-title">{tx(module.title_i18n)}</h2>
          {module.lessons.map((lesson) => {
            const state = markState(lesson, enrollment, next?.id);
            return (
              <Link
                key={lesson.id}
                className={`lms-toc-link ${state === "done" ? "lms-toc-done" : ""}`}
                href={`/talim/kurslar/${course.slug}/${lesson.slug}`}
                aria-current={state === "current" ? "step" : undefined}
              >
                <Mark state={state} />
                <span style={{ minWidth: 0 }}>{tx(lesson.title_i18n)}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** One module in the syllabus: its own progress in the header, then the
 *  lessons with what each one asks of her — a video, a practice, a project —
 *  and how long it takes. */
function ModuleBlock({
  module, courseSlug, enrollment, nextId,
}: {
  module: ProgramModule;
  courseSlug: string;
  enrollment: Enrollment | null;
  nextId?: string;
}) {
  const { t, tx } = useI18n();
  const done = module.lessons.filter((lesson) => isComplete(enrollment, lesson.id)).length;
  const minutes = module.lessons.reduce(
    (sum, lesson) => sum + (lesson.duration_minutes ?? 0),
    0,
  );

  return (
    <section className="lms-card lms-card-pad">
      <div className="lms-sec-head">
        <h3 className="lms-goal-title">{tx(module.title_i18n)}</h3>
        <span className="lms-rec-stats">
          <span>
            {done} / {module.lessons.length} {t("lms.course.lessons")}
          </span>
          {minutes > 0 && (
            <span>{duration(minutes, t("lms.lesson.min"), t("common.hours"))}</span>
          )}
        </span>
      </div>

      <div className="lms-res">
        {module.lessons.map((lesson) => (
          <Link
            key={lesson.id}
            href={`/talim/kurslar/${courseSlug}/${lesson.slug}`}
            aria-current={lesson.id === nextId ? "step" : undefined}
          >
            <Mark state={markState(lesson, enrollment, nextId)} />
            <span style={{ minWidth: 0 }}>{tx(lesson.title_i18n)}</span>
            <span className="lms-rec-stats" style={{ marginLeft: "auto", flex: "none" }}>
              <span>{t(lessonKindKey(lesson.kind))}</span>
              {lesson.duration_minutes ? (
                <span>{lesson.duration_minutes} {t("lms.lesson.min")}</span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Where she stands, and the one button that moves her: enrol, continue, or
 *  review. A finished course sends "Review" back to the first lesson rather
 *  than to this page, so the action is never a link to where you already are. */
function Panel({
  course, enrollment, next, onEnrolled,
}: {
  course: ProgramDetail;
  enrollment: Enrollment | null;
  next: ProgramLesson | null;
  onEnrolled: (enrollment: Enrollment) => void;
}) {
  const { t, tx } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const status = statusOf(enrollment);
  const counts = lessonCounts(course, enrollment);
  const left = minutesLeft(course, enrollment);
  const target = next ?? lessonsOf(course)[0];

  async function enrol() {
    setBusy(true);
    setFailed(false);
    try {
      onEnrolled(await portal.enroll(course.id));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const actionKey: MessageKey =
    status === "completed" ? "lms.course.review"
      : status === "not_started" ? "lms.course.start"
        : "lms.course.continue";

  return (
    <aside className="lms-side-panel">
      <section className="lms-card lms-card-pad">
        <h2 className="lms-goal-title">{t("lms.course.progress")}</h2>

        <div style={{ display: "grid", justifyItems: "center", gap: 10, margin: "16px 0 8px" }}>
          <Ring percent={enrollment?.progress_percent ?? 0} size={104} />
          {counts.total > 0 && (
            <strong style={{ fontSize: "0.92rem" }}>
              {counts.done} / {counts.total} {t("lms.course.lessons")}
            </strong>
          )}
        </div>

        {/* Time left is dropped once there is none: "0 min" is noise. */}
        {left > 0 && (
          <p className="lms-course-by" style={{ textAlign: "center", margin: "0 0 16px" }}>
            {t("lms.course.timeLeft")}:{" "}
            {duration(left, t("lms.lesson.min"), t("common.hours"))}
          </p>
        )}

        {enrollment ? (
          target && (
            <Link
              className="lms-btn lms-btn-primary"
              href={`/talim/kurslar/${course.slug}/${target.slug}`}
              style={{ width: "100%" }}
            >
              {t(actionKey)}
            </Link>
          )
        ) : (
          <button
            type="button"
            className="lms-btn lms-btn-primary"
            style={{ width: "100%" }}
            onClick={() => void enrol()}
            disabled={busy}
          >
            {busy ? t("lms.course.enrolling") : t("lms.course.enroll")}
          </button>
        )}

        {failed && (
          <p className="lms-stat-label" role="alert" style={{ marginTop: 10 }}>
            {t("lms.course.enrollFailed")}
          </p>
        )}

        <dl className="lms-facts" style={{ marginTop: 20 }}>
          {course.level && (
            <div className="lms-fact">
              <dt>{t("lms.course.level")}</dt>
              <dd>{t(levelKey(course.level))}</dd>
            </div>
          )}
          {course.duration_weeks && (
            <div className="lms-fact">
              <dt>{t("lms.course.duration")}</dt>
              <dd>{course.duration_weeks} {t("common.weeks")}</dd>
            </div>
          )}
          {course.has_certificate && (
            <div className="lms-fact">
              <dt>{t("pd.certificate")}</dt>
              <dd>{t("common.yes")}</dd>
            </div>
          )}
        </dl>

        {course.skills.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <span className="lms-stat-label">{t("pd.skills")}</span>
            <div className="lms-chips" style={{ marginTop: 8 }}>
              {course.skills.map((skill) => (
                <span key={skill.slug ?? skill.label} className="lms-chip lms-chip-static">
                  {tx(skill.name_i18n) || skill.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}
