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
 * No near-black surface here. The dashboard already spends that on "Continue
 * learning" and this page is one click behind it; the rose button in the
 * progress panel is enough to make the next lesson obvious.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n, type MessageKey } from "@/i18n";
import {
  courseLessons,
  courseProgress,
  courseStatus,
  findCourse,
  nextLesson,
  type Course,
  type Lesson,
  type Module,
} from "@/content/learning";
import { useMockData } from "@/components/learning/useMockData";
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

  // `null` means "not loaded yet", `undefined` means "loaded, and there is no
  // such course" — two different screens, so they must stay distinguishable.
  const { data: course, loading, error, retry } = useMockData(() => findCourse(slug), [slug]);

  if (error) {
    return (
      <>
        <Back />
        <ErrorState onRetry={retry} />
      </>
    );
  }

  if (loading || course === null) {
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

  if (!course) {
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

  const lessons = courseLessons(course);
  const next = nextLesson(course);

  return (
    <>
      <Back />

      <div className="lms-course-layout">
        <Contents course={course} next={next} />

        <div style={{ minWidth: 0 }}>
          <header className="lms-head">
            <div className="lms-course-top">
              <Cover tone={course.tone} emblem={course.emblem} />
              <div style={{ minWidth: 0 }}>
                <h1 className="lms-h1">{tx(course.title)}</h1>
                <p className="lms-course-by">
                  {t("lms.course.instructor")}: {tx(course.instructor)}
                  {" · "}
                  {tx(course.instructorRole)}
                </p>
              </div>
            </div>
            <p className="lms-lead">{tx(course.summary)}</p>
            <div style={{ marginTop: 14 }}>
              <StatusBadge status={courseStatus(course)} />
            </div>
          </header>

          <section className="lms-sec">
            <SectionHead title={t("lms.course.contents")} />
            {lessons.length ? (
              <div style={{ display: "grid", gap: 14 }}>
                {course.modules.map((module, index) => (
                  <ModuleBlock
                    key={`${index}-${module.title.en}`}
                    module={module}
                    courseSlug={course.slug}
                    nextSlug={next?.slug}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title={t("lms.course.noLessons")} hint={t("lms.course.noLessonsHint")} />
            )}
          </section>
        </div>

        <Panel course={course} />
      </div>
    </>
  );
}

/* ---- pieces ---------------------------------------------------------- */

function Back() {
  const { t } = useI18n();
  return (
    <Link
      className="lms-back"
      href="/talim/kurslar"
    >
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

function markState(lesson: Lesson, nextSlug?: string): "done" | "current" | "todo" {
  if (lesson.completed) return "done";
  return lesson.slug === nextSlug ? "current" : "todo";
}

/** The jump list. `aria-current="step"` and not `"page"`: the lesson she is up
 *  to is not the page she is on, and the page-level highlight belongs to the
 *  lesson screen. */
function Contents({ course, next }: { course: Course; next?: Lesson }) {
  const { t, tx } = useI18n();

  return (
    <nav className="lms-toc" aria-label={t("lms.course.contents")}>
      {course.modules.map((module, index) => (
        <div className="lms-toc-module" key={`${index}-${module.title.en}`}>
          <h2 className="lms-toc-title">{tx(module.title)}</h2>
          {module.lessons.map((lesson) => {
            const state = markState(lesson, next?.slug);
            return (
              <Link
                key={lesson.slug}
                className={`lms-toc-link ${lesson.completed ? "lms-toc-done" : ""}`}
                href={`/talim/kurslar/${course.slug}/${lesson.slug}`}
                aria-current={state === "current" ? "step" : undefined}
              >
                <Mark state={state} />
                <span style={{ minWidth: 0 }}>{tx(lesson.title)}</span>
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
  module, courseSlug, nextSlug,
}: { module: Module; courseSlug: string; nextSlug?: string }) {
  const { t, tx } = useI18n();
  const done = module.lessons.filter((lesson) => lesson.completed).length;
  const minutes = module.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);

  return (
    <section className="lms-card lms-card-pad">
      <div className="lms-sec-head">
        <h3 className="lms-goal-title">{tx(module.title)}</h3>
        <span className="lms-rec-stats">
          <span>
            {done} / {module.lessons.length} {t("lms.course.lessons")}
          </span>
          <span>{duration(minutes, t("lms.lesson.min"), t("common.hours"))}</span>
        </span>
      </div>

      <div className="lms-res">
        {module.lessons.map((lesson) => (
          <Link
            key={lesson.slug}
            href={`/talim/kurslar/${courseSlug}/${lesson.slug}`}
            aria-current={lesson.slug === nextSlug ? "step" : undefined}
          >
            <Mark state={markState(lesson, nextSlug)} />
            <span style={{ minWidth: 0 }}>{tx(lesson.title)}</span>
            <span className="lms-rec-stats" style={{ marginLeft: "auto", flex: "none" }}>
              <span>{t(lessonKindKey(lesson.kind))}</span>
              <span>{lesson.minutes} {t("lms.lesson.min")}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Where she stands, and the one button that moves her. A finished course
 *  sends "Review" back to the first lesson rather than to this page, so the
 *  action is never a link to where you already are. */
function Panel({ course }: { course: Course }) {
  const { t } = useI18n();
  const progress = courseProgress(course);
  const status = courseStatus(course);
  const target = nextLesson(course) ?? courseLessons(course)[0];

  const actionKey: MessageKey =
    status === "completed" ? "lms.course.review"
      : status === "not_started" ? "lms.course.start"
        : "lms.course.continue";

  return (
    <aside className="lms-side-panel">
      <section className="lms-card lms-card-pad">
        <h2 className="lms-goal-title">{t("lms.course.progress")}</h2>

        <div style={{ display: "grid", justifyItems: "center", gap: 10, margin: "16px 0 8px" }}>
          <Ring percent={progress.percent} size={104} />
          <strong style={{ fontSize: "0.92rem" }}>
            {progress.done} / {progress.total} {t("lms.course.lessons")}
          </strong>
        </div>

        {/* Time left is dropped once there is none: "0 min" is noise. */}
        {progress.minutesLeft > 0 && (
          <p className="lms-course-by" style={{ textAlign: "center", margin: "0 0 16px" }}>
            {t("lms.course.timeLeft")}:{" "}
            {duration(progress.minutesLeft, t("lms.lesson.min"), t("common.hours"))}
          </p>
        )}

        {target && (
          <Link
            className="lms-btn lms-btn-primary"
            href={`/talim/kurslar/${course.slug}/${target.slug}`}
            style={{ width: "100%" }}
          >
            {t(actionKey)}
          </Link>
        )}

        <dl className="lms-facts" style={{ marginTop: 20 }}>
          <div className="lms-fact">
            <dt>{t("lms.course.level")}</dt>
            <dd>{t(levelKey(course.level))}</dd>
          </div>
          <div className="lms-fact">
            <dt>{t("lms.course.duration")}</dt>
            <dd>{course.weeks} {t("common.weeks")}</dd>
          </div>
          <div className="lms-fact">
            <dt>{t("lms.course.rating")}</dt>
            <dd><span aria-hidden="true">★</span> {course.rating.toFixed(1)}</dd>
          </div>
          <div className="lms-fact">
            <dt>{t("lms.course.learners")}</dt>
            <dd>{new Intl.NumberFormat("uz-UZ").format(course.learners)}</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
