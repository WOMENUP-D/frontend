"use client";

/**
 * The calendar of her commitments.
 *
 * A real month grid, because the question this screen answers is spatial: not
 * "what is next" — the dashboard already says that — but "how much room is
 * there between the exam and the deadline". A list cannot show a gap; a grid
 * shows nothing but gaps.
 *
 * The decision worth defending: an empty period still draws the grid. Six
 * fixed rows, every month, so paging does not make the page grow and shrink
 * under the cursor, and "nothing is due" is said *under* a drawn month rather
 * than by replacing it with an empty state. A blank week is information, and
 * collapsing it to one line of text throws that information away. List view is
 * the exception — there is no shape to draw there, so it gets the empty state.
 *
 * Today is a client fact. Reading `new Date()` during render would have the
 * server and the browser disagree about which square is circled, so the anchor
 * date is resolved after mount and the screen is a skeleton until it is known.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import {
  events,
  findCourse,
  type CalendarEvent,
  type EventKind,
} from "@/content/learning";
import { useMockData } from "@/components/learning/useMockData";
import { StudyYearView } from "@/components/learning/StudyYear";
import { WeekGrid } from "@/components/learning/WeekGrid";
import {
  EmptyState,
  ErrorState,
  EventRow,
  PageHead,
  Skeleton,
  eventKindKey,
  monthKey,
} from "@/components/learning/ui";

type View = "month" | "week" | "list" | "year";

const VIEWS: { id: View; label: MessageKey }[] = [
  { id: "month", label: "lms.cal.month" },
  { id: "week", label: "lms.cal.week" },
  { id: "list", label: "lms.cal.list" },
  { id: "year", label: "lms.cal.year" },
];

/** Kind → the stripe that carries it. `assignment` is the unmodified pip. */
const PIP: Record<EventKind, string> = {
  assignment: "",
  exam: "lms-pip-exam",
  deadline: "lms-pip-deadline",
  class: "lms-pip-class",
};

/** The same four colours as tokens, for the legend swatches. Kept beside PIP
 *  so a stripe and its key can never drift apart. */
const SWATCH: Record<EventKind, string> = {
  assignment: "var(--gold-soft)",
  exam: "var(--danger)",
  deadline: "var(--warning)",
  class: "var(--success)",
};

const LEGEND: EventKind[] = ["class", "assignment", "exam", "deadline"];

/* ---- dates ----------------------------------------------------------- */

const pad = (value: number) => String(value).padStart(2, "0");

const dayStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, count: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);

const addMonths = (date: Date, count: number) =>
  new Date(date.getFullYear(), date.getMonth() + count, 1);

/** Local ISO. `toISOString` would shift the day back an hour in UTC+5 and
 *  quietly file a midnight deadline under the day before. */
const iso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Weeks start on Monday here; `getDay()` starts them on Sunday. */
const monday = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));

const monthPrefix = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

/**
 * Seven column headers, Monday first.
 *
 * All seven come from the catalogue. Deriving the four the activity strip never
 * needed from `Intl` instead put an English "TUE" between an Uzbek "DU" and
 * "CHO" — one row in two languages — because Intl has no Uzbek short weekdays
 * to give. Four keys are cheaper than a header nobody can read.
 */
const WEEKDAY_KEYS: MessageKey[] = [
  "wd.mon", "wd.tue", "wd.wed", "wd.thu", "wd.fri", "wd.sat", "wd.sun",
];

function useWeekdays(): string[] {
  const { t } = useI18n();
  return useMemo(() => WEEKDAY_KEYS.map((key) => t(key)), [t]);
}

/* ---- the screen -------------------------------------------------------- */

export default function CalendarPage() {
  const { t, tx } = useI18n();
  const weekdays = useWeekdays();

  const [view, setView] = useState<View>("month");
  const [today, setToday] = useState<Date | null>(null);
  const [anchor, setAnchor] = useState<Date | null>(null);

  useEffect(() => {
    const now = dayStart(new Date());
    setToday(now);
    setAnchor(now);
  }, []);

  const { data, loading, error, retry } = useMockData(() => events);

  /** Day → what falls on it, sorted by time so a 12:00 exam sits above a
   *  19:00 class rather than wherever the dataset happened to put it. */
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of data ?? []) {
      const bucket = map.get(event.date);
      if (bucket) bucket.push(event);
      else map.set(event.date, [event]);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
    }
    return map;
  }, [data]);

  /** The squares to draw: one week, or as many whole weeks as this month
   *  actually touches — five or six. A fixed six-row grid keeps its height
   *  steady between months, but it buys that by drawing a whole greyed-out
   *  week belonging to the next month, which reads as a row of dead days. */
  const days = useMemo(() => {
    if (!anchor) return [];
    if (view === "week") {
      const start = monday(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = monday(first);
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const span = Math.round((monday(last).getTime() - start.getTime()) / 86_400_000) + 7;
    return Array.from({ length: span }, (_, i) => addDays(start, i));
  }, [anchor, view]);

  /** Everything inside the period the heading names — which is what the empty
   *  message answers for, and what the list view unrolls. */
  const periodEvents = useMemo(() => {
    if (!anchor || !data) return [];
    let inPeriod: CalendarEvent[];
    if (view === "week") {
      const from = iso(monday(anchor));
      const to = iso(addDays(monday(anchor), 6));
      inPeriod = data.filter((event) => event.date >= from && event.date <= to);
    } else {
      const prefix = monthPrefix(anchor);
      inPeriod = data.filter((event) => event.date.startsWith(prefix));
    }
    return [...inPeriod].sort((a, b) =>
      a.date === b.date
        ? (a.time ?? "").localeCompare(b.time ?? "")
        : a.date.localeCompare(b.date),
    );
  }, [anchor, data, view]);

  const heading = useMemo(() => {
    if (!anchor) return "";
    if (view !== "week") {
      return `${t(monthKey(anchor.getMonth() + 1))} ${anchor.getFullYear()}`;
    }
    const from = monday(anchor);
    const to = addDays(from, 6);
    return from.getMonth() === to.getMonth()
      ? `${from.getDate()}–${to.getDate()} ${t(monthKey(from.getMonth() + 1))} ${to.getFullYear()}`
      : `${from.getDate()} ${t(monthKey(from.getMonth() + 1))} – ` +
        `${to.getDate()} ${t(monthKey(to.getMonth() + 1))} ${to.getFullYear()}`;
  }, [anchor, view, t]);

  function step(direction: -1 | 1) {
    setAnchor((current) => {
      if (!current) return current;
      return view === "week"
        ? addDays(current, direction * 7)
        : addMonths(current, direction);
    });
  }

  if (error) {
    return (
      <>
        <Head />
        <ErrorState onRetry={retry} />
      </>
    );
  }

  // The skeleton stands in for two different unknowns — the data and the
  // client's own clock — and neither may be guessed at during render.
  if (loading || !data || !anchor || !today) {
    return (
      <>
        <Head />
        <div style={{ marginBottom: 16 }}>
          <Skeleton height={34} radius={10} />
        </div>
        <Skeleton height={560} radius={12} />
      </>
    );
  }

  const grid = view === "month";
  const todayKey = iso(today);

  return (
    <>
      <Head />

      <div className="lms-cal-head">
        {/* Announced politely: paging with the keyboard otherwise changes the
            whole grid without saying what it changed to. */}
        <h2 className="lms-cal-month" aria-live="polite">
          {view === "year" ? t("lms.cal.yearHeading") : heading}
        </h2>

        {/* The year view is anchored to today by construction, so there is
            nothing to page to and no "jump to today" to offer. */}
        {view !== "year" && (
          <>
          <button
            type="button"
            className="lms-icon-btn"
            aria-label={t("lms.cal.prev")}
            title={t("lms.cal.prev")}
            onClick={() => step(-1)}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            className="lms-icon-btn"
            aria-label={t("lms.cal.today")}
            title={t("lms.cal.today")}
            onClick={() => setAnchor(today)}
          >
            <span aria-hidden="true">◉</span>
          </button>
          <button
            type="button"
            className="lms-icon-btn"
            aria-label={t("lms.cal.next")}
            title={t("lms.cal.next")}
            onClick={() => step(1)}
          >
            <span aria-hidden="true">›</span>
          </button>
          </>
        )}

        <div
          className="lms-seg"
          role="group"
          aria-label={t("lms.cal.title")}
          style={{ marginLeft: "auto" }}
        >
          {VIEWS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={view === option.id}
              onClick={() => setView(option.id)}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
      </div>

      {view === "year" ? (
        <StudyYearView anchor={today} />
      ) : view === "week" ? (
        <WeekGrid days={days} byDate={byDate} today={today} />
      ) : grid ? (
        <section aria-label={t("lms.cal.title")}>
          <div className="lms-month">
            {weekdays.map((label, index) => (
              <div className="lms-month-wd" key={`wd-${index}`}>{label}</div>
            ))}

            {days.map((day) => {
              const key = iso(day);
              const outside = day.getMonth() !== anchor.getMonth();
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className={[
                    "lms-day",
                    outside ? "lms-day-out" : "",
                    isToday ? "lms-day-today" : "",
                  ].join(" ").trim()}
                  aria-current={isToday ? "date" : undefined}
                >
                  <span className="lms-day-n">{day.getDate()}</span>
                  {(byDate.get(key) ?? []).map((event) => (
                    <Pip key={event.id} event={event} withTime={false} />
                  ))}
                </div>
              );
            })}
          </div>

          <div className="lms-legend">
            {LEGEND.map((kind) => (
              <span key={kind} className={`lms-legend-${kind}`}>
                <i aria-hidden="true" />
                {t(eventKindKey(kind))}
              </span>
            ))}
          </div>

          {periodEvents.length === 0 && (
            <p className="lms-lead" style={{ marginTop: 14 }}>{t("lms.cal.empty")}</p>
          )}
        </section>
      ) : periodEvents.length ? (
        <section className="lms-card lms-card-pad" aria-label={t("lms.cal.title")}>
          <div className="lms-events">
            {periodEvents.map((event) => {
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
        </section>
      ) : (
        <EmptyState
          mark="▦"
          title={t("lms.cal.empty")}
          hint={t("lms.upcoming.emptyHint")}
          action={
            <button
              type="button"
              className="lms-btn lms-btn-quiet"
              onClick={() => setAnchor(today)}
            >
              {t("lms.cal.today")}
            </button>
          }
        />
      )}
    </>
  );
}

/* ---- pieces ------------------------------------------------------------ */

function Head() {
  const { t } = useI18n();
  return <PageHead title={t("lms.cal.title")} lead={t("lms.cal.lead")} />;
}

/** A square is small, so the visible text is the event's own name and the full
 *  sentence — kind, time, course — goes to the accessible name and the tooltip.
 *  It links to the course, which is the only place the work actually is. */
function Pip({ event, withTime }: { event: CalendarEvent; withTime: boolean }) {
  const { t, tx } = useI18n();
  const course = findCourse(event.courseSlug);
  const label = [
    t(eventKindKey(event.kind)),
    tx(event.title),
    event.time,
    course ? tx(course.title) : "",
  ].filter(Boolean).join(" · ");

  return (
    <Link
      className={[
        "lms-pip",
        PIP[event.kind],
        event.status === "completed" ? "lms-pip-done" : "",
      ].join(" ").trim()}
      href={`/talim/kurslar/${event.courseSlug}`}
      title={label}
      aria-label={label}
    >
      {withTime && event.time ? `${event.time} ` : ""}
      {tx(event.title)}
    </Link>
  );
}
