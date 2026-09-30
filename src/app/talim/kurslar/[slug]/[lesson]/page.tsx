"use client";

/**
 * One lesson.
 *
 * This is the only screen where she is not choosing anything — she is reading.
 * So the centre column is capped at 68ch and holds nothing but the text, the
 * table of contents stays on the left because losing your place in a course is
 * the fastest way to abandon it, and everything that is *about* the lesson
 * rather than *in* it — resources, the assistant, where she is in the course —
 * is exiled to the right rail. The only near-black surface here is a code
 * block, which earns it: contrast is what makes code scannable.
 *
 * Completion is written to her enrollment, not to this page. The button posts
 * it and redraws from the enrollment the server sends back, so a refresh, a
 * different device or the cabinet all agree about what she has finished.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import {
  portal,
  type Enrollment,
  type EnrollmentDetail,
  type LessonBlock,
  type LessonResource,
  type ProgramDetail,
  type ProgramLesson,
  type ProgramLessonDetail,
} from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import { isComplete, lessonCounts, lessonsOf } from "@/components/learning/course";
import {
  Badge,
  Bar,
  EmptyState,
  ErrorState,
  SectionHead,
  Skeleton,
  SkeletonBlock,
  duration,
  lessonKindKey,
} from "@/components/learning/ui";

/** Notes live per course *and* per lesson: a thought about one module is not a
 *  thought about the next. Namespaced like the locale key so the portal owns
 *  one tidy corner of localStorage. They are hers alone and never leave the
 *  browser — there is no notes endpoint, and inventing one here would be a
 *  promise the backend has not made. */
const noteKeyFor = (course: string, lesson: string) =>
  `womanup.lms.note.${course}.${lesson}`;

/** Lesson text is authored with inline code between backticks. Splitting on
 *  them is what gives the `.lms-lesson code` rule something to style; printing
 *  the backticks raw would be a small lie about the text. */
function inline(text: string): ReactNode {
  return text
    .split("`")
    .map((part, index) =>
      index % 2 === 1
        ? <code key={index}>{part}</code>
        : <Fragment key={index}>{part}</Fragment>,
    );
}

export default function LessonPage() {
  const { t, tx } = useI18n();
  const params = useParams<{ slug: string; lesson: string }>();
  const courseSlug = params?.slug ?? "";
  const lessonSlug = params?.lesson ?? "";

  const { data, loading, error, retry } = useApi(async () => {
    const course = await portal.programBySlug(courseSlug);
    const [lesson, mine] = await Promise.all([
      portal.lesson(course.id, lessonSlug),
      portal.myEnrollments().catch(() => [] as EnrollmentDetail[]),
    ]);
    return {
      course,
      lesson,
      enrollment: (mine.find((item) => item.program_id === course.id) ?? null) as Enrollment | null,
    };
  }, [courseSlug, lessonSlug]);

  /* Completion lives on the enrollment. This holds the copy the server last
     sent back, so ticking a lesson updates the contents and the progress ring
     without refetching the course. */
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => setEnrollment(null), [courseSlug, lessonSlug]);
  const current = enrollment ?? data?.enrollment ?? null;

  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const noteKey = noteKeyFor(courseSlug, lessonSlug);

  // Reads and writes are both guarded: a browser set to block site data throws
  // on access rather than returning null, and an unwritable note is not worth
  // a broken page.
  useEffect(() => {
    try {
      setNote(window.localStorage.getItem(noteKey) ?? "");
    } catch {
      setNote("");
    }
    setDirty(false);
  }, [noteKey]);

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(noteKey, note);
        setSaved(true);
      } catch {
        /* private window — the textarea keeps working, the note just won't last */
      }
      setDirty(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [dirty, note, noteKey]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(timer);
  }, [saved]);

  if (error) return <ErrorState onRetry={retry} />;

  if (loading) {
    return (
      <div className="lms-course-layout">
        <div className="lms-toc"><SkeletonBlock rows={4} /></div>
        <div><Skeleton height={420} radius={18} /></div>
        <div className="lms-side-panel"><SkeletonBlock rows={2} /></div>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        mark="?"
        title={t("lms.lesson.notFound")}
        hint={t("lms.course.notFoundHint")}
        action={
          <Link className="lms-btn lms-btn-quiet" href="/talim/kurslar">
            {t("lms.course.back")}
          </Link>
        }
      />
    );
  }

  const { course, lesson } = data;
  const all = lessonsOf(course);
  const index = all.findIndex((item) => item.id === lesson.id);
  const prev = index > 0 ? all[index - 1] : undefined;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : undefined;
  const done = isComplete(current, lesson.id);
  const blocks = lesson.blocks ?? [];

  async function toggle(completed: boolean) {
    if (!current) return;
    setBusy(true);
    setFailed(false);
    try {
      setEnrollment(await portal.completeLesson(current.id, lesson.id, completed));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lms-course-layout">
      <Toc course={course} current={lesson} enrollment={current} />

      <div>
        <article className="lms-lesson">
          <h1>{tx(lesson.title_i18n)}</h1>

          {/* Kind and length before the first word: she decides whether she has
              time for this now, and that decision is cheap to answer. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 26px" }}>
            <Badge>{t(lessonKindKey(lesson.kind))}</Badge>
            {lesson.duration_minutes ? (
              <Badge>
                {duration(lesson.duration_minutes, t("lms.lesson.min"), t("common.hours"))}
              </Badge>
            ) : null}
            {done && <Badge tone="done">{t("lms.lesson.completed")}</Badge>}
          </div>

          {blocks.length ? (
            blocks.map((block, position) => <Block key={position} block={block} />)
          ) : (
            // A lesson whose text is not written yet is not an error — the
            // title, the length and the navigation are all still true.
            <EmptyState
              mark="◈"
              title={t("lms.lesson.empty")}
              hint={t("lms.ai.lead")}
              action={
                <Link className="lms-btn lms-btn-quiet" href="/yordamchi">
                  {t("lms.lesson.askAI")}
                </Link>
              }
            />
          )}
        </article>

        <nav className="lms-lesson-foot" aria-label={t("lms.course.contents")}>
          <Step lesson={prev} courseSlug={course.slug} label={t("lms.lesson.prev")} back />
          <Step lesson={next} courseSlug={course.slug} label={t("lms.lesson.next")} />

          <span className="lms-spacer" />

          {/* Without an enrollment there is nothing to write a tick to, so the
              honest offer is the one that creates one. */}
          {!current ? (
            <Link className="lms-btn lms-btn-primary" href={`/talim/kurslar/${course.slug}`}>
              {t("lms.course.enroll")}
            </Link>
          ) : done ? (
            <button
              type="button"
              className="lms-btn lms-btn-quiet"
              onClick={() => void toggle(false)}
              disabled={busy}
            >
              <span aria-hidden="true">✓</span> {t("lms.lesson.completed")}
            </button>
          ) : (
            <button
              type="button"
              className="lms-btn lms-btn-primary"
              onClick={() => void toggle(true)}
              disabled={busy}
            >
              {t("lms.lesson.complete")}
            </button>
          )}
        </nav>

        {!current && (
          <p className="lms-stat-label" style={{ marginTop: 10 }}>
            {t("lms.lesson.enrollFirst")}
          </p>
        )}
        {failed && (
          <p className="lms-stat-label" role="alert" style={{ marginTop: 10 }}>
            {t("lms.lesson.markFailed")}
          </p>
        )}

        {/* The notes sit at reading width, under the thing being noted — a
            232px rail is no place to write a paragraph. */}
        <section className="lms-sec lms-notes" style={{ maxWidth: "68ch" }}>
          <SectionHead title={t("lms.lesson.notes")} />
          <textarea
            value={note}
            aria-label={t("lms.lesson.notes")}
            placeholder={t("lms.lesson.notesPlaceholder")}
            onChange={(event) => {
              setNote(event.target.value);
              setDirty(true);
            }}
          />
          <p
            className="lms-stat-label"
            aria-live="polite"
            style={{ marginTop: 8, minHeight: "1.1em" }}
          >
            {saved ? t("lms.lesson.notesSaved") : ""}
          </p>
        </section>
      </div>

      <aside className="lms-side-panel">
        <Progress course={course} enrollment={current} />

        {lesson.resources?.length ? (
          <section className="lms-card lms-card-pad" style={{ marginTop: 16 }}>
            <SectionHead title={t("lms.lesson.resources")} />
            <div className="lms-res">
              {lesson.resources.map((resource) => (
                <ResourceLink key={resource.href} resource={resource} />
              ))}
            </div>
          </section>
        ) : null}

        <div style={{ marginTop: 16 }}>
          <Link className="lms-btn lms-btn-quiet" href="/yordamchi" style={{ width: "100%" }}>
            <span aria-hidden="true">◈</span>
            {t("lms.lesson.askAI")}
          </Link>
        </div>
      </aside>
    </div>
  );
}

/* ---- pieces ---------------------------------------------------------- */

/** The same table of contents as the course page, with this lesson marked.
 *  Completion is read from the enrollment, so ticking the button at the foot
 *  shows up in the list immediately. */
function Toc({
  course, current, enrollment,
}: { course: ProgramDetail; current: ProgramLessonDetail; enrollment: Enrollment | null }) {
  const { t, tx } = useI18n();

  return (
    <nav className="lms-toc" aria-label={t("lms.course.contents")}>
      {course.modules.map((module) => (
        <div className="lms-toc-module" key={module.id}>
          <h2 className="lms-toc-title">{tx(module.title_i18n)}</h2>
          {module.lessons.map((lesson) => {
            const here = lesson.id === current.id;
            const finished = isComplete(enrollment, lesson.id);
            return (
              <Link
                key={lesson.id}
                className={`lms-toc-link ${finished ? "lms-toc-done" : ""}`}
                href={`/talim/kurslar/${course.slug}/${lesson.slug}`}
                aria-current={here ? "page" : undefined}
              >
                <span
                  className={`lms-mark ${finished ? "lms-mark-done" : ""} ${here ? "lms-mark-current" : ""}`}
                  aria-hidden="true"
                >
                  ✓
                </span>
                {tx(lesson.title_i18n)}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Previous / next. At either end this is a real disabled button rather than a
 *  link that goes nowhere — a dead anchor is focusable, announced as a link,
 *  and lies about what will happen. */
function Step({
  lesson, courseSlug, label, back = false,
}: { lesson?: ProgramLesson; courseSlug: string; label: string; back?: boolean }) {
  const arrow = <span aria-hidden="true">{back ? "←" : "→"}</span>;
  const body = back ? <>{arrow}{label}</> : <>{label}{arrow}</>;

  if (!lesson) {
    return (
      <button type="button" className="lms-btn lms-btn-quiet lms-btn-sm" disabled>
        {body}
      </button>
    );
  }
  return (
    <Link
      className="lms-btn lms-btn-quiet lms-btn-sm"
      href={`/talim/kurslar/${courseSlug}/${lesson.slug}`}
    >
      {body}
    </Link>
  );
}

/** Where she is in the course, in the rail: the lesson answers "what", this
 *  answers "how much is left". The percentage is the server's. */
function Progress({
  course, enrollment,
}: { course: ProgramDetail; enrollment: Enrollment | null }) {
  const { t } = useI18n();
  const counts = lessonCounts(course, enrollment);
  const percent = enrollment?.progress_percent ?? 0;

  return (
    <section className="lms-card lms-card-pad">
      <SectionHead title={t("lms.course.progress")} />
      <Bar percent={percent} done={counts.total > 0 && counts.done === counts.total} />
      <div className="lms-course-meta" style={{ marginTop: 10 }}>
        <span>
          {counts.done} / {counts.total} {t("lms.course.lessons")}
        </span>
        <strong style={{ color: "var(--ink)" }}>{percent}%</strong>
      </div>
    </section>
  );
}

/** Every resource leaves the platform, so every one of them says so before it
 *  is clicked and opens in its own tab. */
function ResourceLink({ resource }: { resource: LessonResource }) {
  const { tx } = useI18n();
  const mark = resource.kind === "pdf" ? "▤" : resource.kind === "code" ? "⌗" : "↗";

  return (
    <a href={resource.href} target="_blank" rel="noreferrer">
      <span aria-hidden="true">{mark}</span>
      {tx(resource.title)}
    </a>
  );
}

/** The lesson body is data, so this is the whole renderer: one arm per variant
 *  of the union, and a compile error the day a new variant is added. */
function Block({ block }: { block: LessonBlock }) {
  const { tx } = useI18n();

  switch (block.type) {
    case "paragraph":
      return <p>{inline(tx(block.text))}</p>;

    case "heading":
      return <h2>{tx(block.text)}</h2>;

    case "list":
      return (
        <ul>
          {block.items.map((item, position) => (
            <li key={position}>{inline(tx(item))}</li>
          ))}
        </ul>
      );

    case "code":
      return (
        <pre className="lms-pre" data-lang={block.language}>
          <code>{block.code}</code>
        </pre>
      );

    case "callout":
      return <aside className="lms-callout">{inline(tx(block.text))}</aside>;

    case "figure":
      return (
        <figure className="lms-figure">
          <div className={`lms-figure-art lms-cover-${block.tone ?? "sand"}`} aria-hidden="true">
            {block.emblem ?? "✦"}
          </div>
          <figcaption>{tx(block.caption)}</figcaption>
        </figure>
      );

    default:
      return null;
  }
}
