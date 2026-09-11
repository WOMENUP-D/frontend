"use client";

/**
 * The week as an hour grid.
 *
 * The month view answers "what is due this month"; a week has to answer
 * something the month cannot — *when*, and how much room is left between two
 * things. Seven columns of stacked pips cannot say that: a 09:30 class and a
 * 21:00 deadline sit the same distance apart as two things an hour apart.
 * Placing each block against an hour rail is the whole point of the view.
 *
 * Two decisions worth keeping:
 *
 * **The day runs 08:00 to 22:00, not midnight to midnight.** Twenty-four rows
 * put every real event in the middle third and gave eight hours of empty grid
 * to sleep. Anything outside the window is pinned to its edge rather than
 * dropped, so nothing can go missing off the top.
 *
 * **"Now" is a line across the whole week, with the dot on today.** The line
 * says what time it is; the dot says which column that time belongs to. On a
 * week that is not this week there is no dot and no line — the marker would
 * be claiming something false about a week you are only visiting.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n";
import { eventMinutes, findCourse, type CalendarEvent } from "@/content/learning";
import { eventKindKey } from "@/components/learning/ui";

/** The window the grid draws, in hours. */
const START = 8;
const END = 22;
const ROW = 46;

const WEEKDAY_KEYS = ["wd.mon", "wd.tue", "wd.wed", "wd.thu", "wd.fri", "wd.sat", "wd.sun"] as const;

function iso(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** "09:30" → 9.5. An event with no time is an all-day marker and sits at the
 *  top of its column rather than being dropped. */
function hourOf(event: CalendarEvent): number {
  if (!event.time) return START;
  const [h, m] = event.time.split(":").map(Number);
  return h + (Number.isFinite(m) ? m / 60 : 0);
}

function clock(value: number): string {
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function WeekGrid({
  days,
  byDate,
  today,
}: {
  days: Date[];
  byDate: Map<string, CalendarEvent[]>;
  today: Date;
}) {
  const { t, tx } = useI18n();

  const [selected, setSelected] = useState<string | null>(null);

  // The clock is a client fact and must not be read during render, or the
  // server and the browser disagree about where the line sits.
  const [nowHour, setNowHour] = useState<number | null>(null);
  useEffect(() => {
    const read = () => {
      const now = new Date();
      setNowHour(now.getHours() + now.getMinutes() / 60);
    };
    read();
    const timer = window.setInterval(read, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const hours: number[] = [];
  for (let h = START; h < END; h += 1) hours.push(h);

  const todayKey = iso(today);
  const todayColumn = days.findIndex((day) => iso(day) === todayKey);
  const showNow = todayColumn >= 0 && nowHour !== null && nowHour >= START && nowHour <= END;

  const all = days.flatMap((day) => byDate.get(iso(day)) ?? []);
  const active = all.find((event) => event.id === selected) ?? null;
  const activeCourse = active ? findCourse(active.courseSlug) : undefined;

  return (
    <section className="lms-wk" aria-label={t("lms.cal.week")}>
      <div className="lms-card lms-wk-card">
        <div className="lms-wk-head">
          <span />
          {days.map((day, index) => {
            const here = iso(day) === todayKey;
            return (
              <span key={iso(day)} className={here ? "lms-wk-day is-today" : "lms-wk-day"}>
                <b>{day.getDate()}</b>
                <i>{t(WEEKDAY_KEYS[index])}</i>
              </span>
            );
          })}
        </div>

        <div className="lms-wk-body">
          <div className="lms-wk-rail" aria-hidden="true">
            {hours.map((h) => (
              <span key={h} style={{ height: ROW }}>
                <i>{clock(h)}</i>
              </span>
            ))}
          </div>

          {days.map((day) => {
            const key = iso(day);
            const here = key === todayKey;
            const items = byDate.get(key) ?? [];
            return (
              <div key={key} className={here ? "lms-wk-col is-today" : "lms-wk-col"}>
                {hours.map((h) => (
                  <span key={h} className="lms-wk-slot" style={{ height: ROW }} />
                ))}

                {items.map((event) => {
                  // Clamped into the window rather than dropped: an 06:00
                  // start belongs at the top edge, not nowhere.
                  const from = Math.max(START, Math.min(hourOf(event), END - 0.5));
                  const span = Math.max(0.5, Math.min(eventMinutes(event) / 60, END - from));
                  const course = findCourse(event.courseSlug);
                  const label = [
                    t(eventKindKey(event.kind)),
                    tx(event.title),
                    event.time,
                    course ? tx(course.title) : "",
                  ].filter(Boolean).join(" · ");

                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={[
                        "lms-wk-ev",
                        `lms-wk-${event.kind}`,
                        event.status === "completed" ? "is-done" : "",
                        event.id === selected ? "is-picked" : "",
                      ].join(" ").trim()}
                      style={{ top: (from - START) * ROW, height: span * ROW - 4 }}
                      onClick={() => setSelected(event.id)}
                      aria-pressed={event.id === selected}
                      title={label}
                    >
                      <b>{tx(event.title)}</b>
                      {event.time && <i>{event.time}</i>}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {showNow && nowHour !== null && (
            <div
              className="lms-wk-now"
              style={{ top: (nowHour - START) * ROW }}
              aria-hidden="true"
            >
              <span className="lms-wk-now-time">{clock(nowHour)}</span>
              <span className="lms-wk-now-line" />
              <span
                className="lms-wk-now-dot"
                style={{ left: `calc(var(--wk-rail) + (100% - var(--wk-rail)) * ${(todayColumn + 0.5) / 7} - 4px)` }}
              />
            </div>
          )}
        </div>
      </div>

      {active && (
        <div className="lms-card lms-card-pad lms-wk-detail">
          <span className={`lms-wk-tag lms-wk-${active.kind}`}>{t(eventKindKey(active.kind))}</span>
          <span className="lms-wk-detail-what">
            <b>{tx(active.title)}</b>
            <i>{activeCourse ? tx(activeCourse.title) : ""}</i>
          </span>
          <span className="lms-wk-detail-when">
            {active.time ? `${active.time}–${clock(hourOf(active) + eventMinutes(active) / 60)}` : t("lms.cal.allDay")}
          </span>
          <Link className="lms-btn lms-btn-quiet" href={`/talim/kurslar/${active.courseSlug}`}>
            {t("lms.cal.open")}
          </Link>
        </div>
      )}
    </section>
  );
}
