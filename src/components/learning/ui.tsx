"use client";

/**
 * The learning section's design system.
 *
 * One home for every repeated piece, so no screen invents its own card, badge
 * or progress bar. Everything here is presentational: it takes data and
 * renders it, and never fetches, never decides. Labels come from the i18n
 * catalogue through `t`, content strings out of the mock dataset through `tx`.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import {
  courseProgress,
  courseStatus,
  nextLesson,
  type CalendarEvent,
  type Course,
  type CourseLevel,
  type CourseStatus,
  type CoverTone,
  type EventKind,
  type EventStatus,
  type LessonKind,
} from "@/content/learning";

/* ---- label helpers ------------------------------------------------- */

export const levelKey = (v: CourseLevel) => `lms.level.${v}` as MessageKey;
export const statusKey = (v: CourseStatus) => `lms.status.${v}` as MessageKey;
export const lessonKindKey = (v: LessonKind) => `lms.kind.${v}` as MessageKey;
export const eventKindKey = (v: EventKind) => `lms.event.${v}` as MessageKey;
export const eventStatusKey = (v: EventStatus) => `lms.evst.${v}` as MessageKey;
export const monthKey = (month: number) => `mon.${month}` as MessageKey;

/** "1h 20m" / "45m" — minutes are unreadable past an hour or so. */
export function duration(minutes: number, minLabel: string, hourLabel: string): string {
  if (minutes < 60) return `${minutes} ${minLabel}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ${hourLabel} ${rest} ${minLabel}` : `${hours} ${hourLabel}`;
}

/* ---- primitives ----------------------------------------------------- */

export function Cover({
  tone, emblem, className = "",
}: { tone: CoverTone; emblem: string; className?: string }) {
  return (
    <span className={`lms-cover lms-cover-${tone} ${className}`} aria-hidden="true">
      {emblem}
    </span>
  );
}

/** Progress as an arc. Used where the number is the point; the bar is used
 *  where progress is a detail on a card. */
export function Ring({
  percent, size = 92, onDark = false,
}: { percent: number; size?: number; onDark?: boolean }) {
  const stroke = size < 70 ? 6 : 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.max(0, Math.min(100, percent));

  return (
    <svg
      className={`lms-ring ${onDark ? "lms-ring-on-dark" : ""}`}
      width={size}
      height={size}
      role="img"
      aria-label={`${Math.round(safe)}%`}
    >
      <circle
        className="lms-ring-track"
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" strokeWidth={stroke}
      />
      <circle
        className="lms-ring-fill"
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - safe / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        className="lms-ring-value"
        x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.26}
      >
        {Math.round(safe)}%
      </text>
    </svg>
  );
}

export function Bar({ percent, done = false }: { percent: number; done?: boolean }) {
  return (
    <div
      className={`lms-bar ${done ? "lms-bar-done" : ""}`}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}

export function Badge({
  tone = "neutral", children,
}: { tone?: "neutral" | "live" | "done" | "warn"; children: ReactNode }) {
  const suffix = tone === "neutral" ? "" : ` lms-badge-${tone}`;
  return <span className={`lms-badge${suffix}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: CourseStatus }) {
  const { t } = useI18n();
  const tone = status === "completed" ? "done" : status === "in_progress" ? "live" : "neutral";
  return <Badge tone={tone}>{t(statusKey(status))}</Badge>;
}

export function StatCard({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="lms-stat">
      <div className="lms-stat-value">{value}</div>
      <span className="lms-stat-label">{label}</span>
    </div>
  );
}

/* ---- headings -------------------------------------------------------- */

export function PageHead({ title, lead }: { title: string; lead?: string }) {
  return (
    <header className="lms-head">
      <h1 className="lms-h1">{title}</h1>
      {lead && <p className="lms-lead">{lead}</p>}
    </header>
  );
}

export function SectionHead({
  title, href, linkLabel,
}: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="lms-sec-head">
      <h2 className="lms-h2">{title}</h2>
      {href && linkLabel && (
        <Link className="lms-sec-link" href={href}>{linkLabel}</Link>
      )}
    </div>
  );
}

/* ---- course card ------------------------------------------------------ */

export function CourseCard({ course }: { course: Course }) {
  const { t, tx } = useI18n();
  const progress = courseProgress(course);
  const status = courseStatus(course);
  const next = nextLesson(course);

  // Where "Continue" goes, and what it is called, both follow the status:
  // a finished course is reviewed, an untouched one is started.
  const target = next
    ? `/talim/kurslar/${course.slug}/${next.slug}`
    : `/talim/kurslar/${course.slug}`;
  const actionKey: MessageKey =
    status === "completed" ? "lms.course.review"
      : status === "not_started" ? "lms.course.start"
        : "lms.course.continue";

  return (
    <article className="lms-course">
      <div className="lms-course-top">
        <Cover tone={course.tone} emblem={course.emblem} />
        <div style={{ minWidth: 0 }}>
          <h3 className="lms-course-title">
            <Link href={`/talim/kurslar/${course.slug}`}>{tx(course.title)}</Link>
          </h3>
          <p className="lms-course-by">{tx(course.instructor)}</p>
        </div>
      </div>

      <Bar percent={progress.percent} done={status === "completed"} />

      <div className="lms-course-meta">
        <span>
          {progress.done} / {progress.total} {t("lms.course.lessons")}
        </span>
        <strong style={{ color: "var(--ink)" }}>{progress.percent}%</strong>
      </div>

      <div className="lms-course-foot">
        <StatusBadge status={status} />
        <Link
          className="lms-btn lms-btn-quiet lms-btn-sm"
          href={target}
          style={{ marginLeft: "auto" }}
        >
          {t(actionKey)}
        </Link>
      </div>
    </article>
  );
}

/* ---- events ------------------------------------------------------------ */

/** The date block on an event row: a day number over a three-letter month.
 *  Derived from the catalogue's month names so it reads in all three
 *  languages without a second list to maintain. */
export function EventDate({ date }: { date: string }) {
  const { t } = useI18n();
  const parsed = new Date(`${date}T00:00:00`);
  const month = t(monthKey(parsed.getMonth() + 1));
  return (
    <div className="lms-event-date">
      <span className="lms-event-day">{parsed.getDate()}</span>
      <span className="lms-event-mon">{month.slice(0, 3)}</span>
    </div>
  );
}

export function EventRow({ event, courseTitle }: { event: CalendarEvent; courseTitle: string }) {
  const { t } = useI18n();
  const done = event.status === "completed";
  return (
    <div className={`lms-event ${done ? "lms-event-done" : ""}`}>
      <EventDate date={event.date} />
      <div className="lms-event-body">
        <div className="lms-event-title">{t(eventKindKey(event.kind))}</div>
        <div className="lms-event-meta">
          {courseTitle}
          {event.time ? ` · ${event.time}` : ""}
        </div>
      </div>
      <Badge tone={done ? "done" : event.status === "due_soon" ? "warn" : "neutral"}>
        {t(eventStatusKey(event.status))}
      </Badge>
    </div>
  );
}

/* ---- states ------------------------------------------------------------ */

export function EmptyState({
  title, hint, action, mark = "✦",
}: { title: string; hint?: string; action?: ReactNode; mark?: string }) {
  return (
    <div className="lms-empty">
      <span className="lms-empty-mark" aria-hidden="true">{mark}</span>
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      mark="⚠"
      title={t("lms.err.title")}
      hint={t("lms.err.hint")}
      action={
        onRetry && (
          <button type="button" className="lms-btn lms-btn-quiet" onClick={onRetry}>
            {t("lms.err.retry")}
          </button>
        )
      }
    />
  );
}

export function Skeleton({ height, radius }: { height: number; radius?: number }) {
  return (
    <div
      className="lms-skel"
      style={{ height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/** The loading shape of a card list. Matching the real height stops the page
 *  jumping when the content lands. */
export function SkeletonCards({ rows = 3, height = 148 }: { rows?: number; height?: number }) {
  return (
    <div className="lms-courses" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} height={height} radius={18} />
      ))}
    </div>
  );
}

export function SkeletonBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: "grid", gap: 12 }} aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} height={64} radius={12} />
      ))}
    </div>
  );
}
