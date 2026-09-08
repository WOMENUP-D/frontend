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
 * Nothing on this page is a bold call to action, deliberately. The action is
 * to keep reading.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import {
  courseProgress,
  findCourse,
  findLesson,
  type Course,
  type Lesson,
  type LessonBlock,
  type Resource,
} from "@/content/learning";
import { useMockData } from "@/components/learning/useMockData";
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

/** Notes live per course *and* per lesson: a thought about Flexbox is not a
 *  thought about Grid. Namespaced like the locale key so the portal owns one
 *  tidy corner of localStorage. */
const noteKeyFor = (course: string, lesson: string) =>
  `womanup.lms.note.${course}.${lesson}`;

/** The dataset writes inline code between backticks, the way the source
 *  content is actually authored. Splitting on them is what gives the
 *  `.lms-lesson code` rule something to style; printing the backticks raw
 *  would be a small lie about the text. */
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

  const { data, loading, error, retry } = useMockData(() => {
    const course = findCourse(courseSlug) ?? null;
    return { course, found: course ? findLesson(course, lessonSlug) ?? null : null };
  }, [courseSlug, lessonSlug]);

  // Completion is local state only, until the API stage: nothing here writes
  // back to the dataset, so a reload forgets it. Seeded from the lesson and
  // re-seeded on navigation, because the component stays mounted between
  // lessons of the same course.
  const seedCompleted = data?.found?.lesson.completed ?? false;
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDone(seedCompleted);
  }, [courseSlug, lessonSlug, seedCompleted]);

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

  if (loading || !data) {
    return (
      <div className="lms-course-layout">
        <div className="lms-toc"><SkeletonBlock rows={4} /></div>
        <div><Skeleton height={420} radius={18} /></div>
        <div className="lms-side-panel"><SkeletonBlock rows={2} /></div>
      </div>
    );
  }

  const { course, found } = data;

  if (!course) {
    return (
      <EmptyState
        mark="?"
        title={t("lms.course.notFound")}
        hint={t("lms.course.notFoundHint")}
        action={
          <Link className="lms-btn lms-btn-quiet" href="/talim/kurslar">
            {t("lms.course.back")}
          </Link>
        }
      />
    );
  }

  if (!found) {
    return (
      <EmptyState
        mark="?"
        title={t("lms.lesson.notFound")}
        hint={t("lms.course.notFoundHint")}
        action={
          <Link className="lms-btn lms-btn-quiet" href={`/talim/kurslar/${course.slug}`}>
            {t("lms.course.view")}
          </Link>
        }
      />
    );
  }

  const { lesson, index, all } = found;
  const prev = index > 0 ? all[index - 1] : undefined;
  const next = index < all.length - 1 ? all[index + 1] : undefined;
  const blocks = lesson.blocks ?? [];

  return (
    <div className="lms-course-layout">
      <Toc course={course} current={lesson} currentDone={done} />

      <div>
        <article className="lms-lesson">
          <h1>{tx(lesson.title)}</h1>

          {/* Kind and length before the first word: she decides whether she has
              time for this now, and that decision is cheap to answer. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 26px" }}>
            <Badge>{t(lessonKindKey(lesson.kind))}</Badge>
            <Badge>{duration(lesson.minutes, t("lms.lesson.min"), t("common.hours"))}</Badge>
            {done && <Badge tone="done">{t("lms.lesson.completed")}</Badge>}
          </div>

          {blocks.length ? (
            blocks.map((block, position) => <Block key={position} block={block} />)
          ) : (
            // A lesson whose text is not written yet is not an error — the
            // title, the length and the navigation are all still true. The
            // assistant is the honest offer to make in the gap.
            <EmptyState
              mark="◈"
              title={t("lms.ai.title")}
              hint={t("lms.ai.lead")}
              action={
                <Link className="lms-btn lms-btn-quiet" href="/talim/yordamchi">
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

          {done ? (
            <Badge tone="done">
              <span aria-hidden="true">✓</span>
              {t("lms.lesson.completed")}
            </Badge>
          ) : (
            <button
              type="button"
              className="lms-btn lms-btn-primary"
              onClick={() => setDone(true)}
            >
              {t("lms.lesson.complete")}
            </button>
          )}
        </nav>

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
        <Progress course={course} />

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
          <Link
            className="lms-btn lms-btn-quiet"
            href="/talim/yordamchi"
            style={{ width: "100%" }}
          >
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
 *  The current lesson's marker follows local completion so ticking the button
 *  at the foot is visible in the list without a reload. */
function Toc({
  course, current, currentDone,
}: { course: Course; current: Lesson; currentDone: boolean }) {
  const { t, tx } = useI18n();

  return (
    <nav className="lms-toc" aria-label={t("lms.course.contents")}>
      {course.modules.map((module, position) => (
        <div className="lms-toc-module" key={position}>
          <h2 className="lms-toc-title">{tx(module.title)}</h2>
          {module.lessons.map((lesson) => {
            const here = lesson.slug === current.slug;
            const finished = here ? currentDone : lesson.completed;
            return (
              <Link
                key={lesson.slug}
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
                {tx(lesson.title)}
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
}: { lesson?: Lesson; courseSlug: string; label: string; back?: boolean }) {
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
 *  answers "how much is left". */
function Progress({ course }: { course: Course }) {
  const { t } = useI18n();
  const progress = courseProgress(course);

  return (
    <section className="lms-card lms-card-pad">
      <SectionHead title={t("lms.course.progress")} />
      <Bar percent={progress.percent} done={progress.done === progress.total} />
      <div className="lms-course-meta" style={{ marginTop: 10 }}>
        <span>
          {progress.done} / {progress.total} {t("lms.course.lessons")}
        </span>
        <strong style={{ color: "var(--ink)" }}>{progress.percent}%</strong>
      </div>
    </section>
  );
}

/** Every resource leaves the platform, so every one of them says so before it
 *  is clicked and opens in its own tab. */
function ResourceLink({ resource }: { resource: Resource }) {
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
          <div className={`lms-figure-art lms-cover-${block.tone}`} aria-hidden="true">
            {block.emblem}
          </div>
          <figcaption>{tx(block.caption)}</figcaption>
        </figure>
      );

    default:
      return null;
  }
}
