"use client";

/**
 * A month of real events: a grid with a mark on every day something happens,
 * and — under it — the events of the day she chooses.
 *
 * The grid is a real grid: arrow keys move a day, Home/End to the week's
 * edges, Page Up/Down a month, Enter chooses. A day with events says how many
 * in words, not only with a dot. Six rows, always, so paging a month never
 * makes the page jump. The month shown and the day chosen are the page's own
 * state; the events come from the server for the visible month only.
 *
 * It is only ever drawn over real events: the page shows its empty state
 * instead of an empty grid when there are none at all.
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "@/i18n";
import type { EventCard as Event } from "@/services/portal";
import { fill } from "@/components/jobs/format";
import { Icon } from "@/components/ds";
import { EventCard } from "./EventCard";
import { daysOf, dayKey, longDate, monthGrid, monthTitle, weekdayNames } from "./format";

export function Calendar({
  year,
  month,
  items,
  loading,
  onMonth,
}: {
  year: number;
  /** 0-based. */
  month: number;
  items: Event[];
  loading: boolean;
  onMonth: (year: number, month: number) => void;
}) {
  const { t, locale } = useI18n();
  const [today, setToday] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const cells = useRef<Map<string, HTMLButtonElement>>(new Map());
  const moved = useRef(false);
  /** A day the keyboard moved to in another month, kept across the change. */
  const carried = useRef<string | null>(null);

  // Today is read in the browser, after mount, so the server and the page
  // never disagree about which square is circled.
  useEffect(() => setToday(dayKey(new Date())), []);

  const grid = useMemo(() => monthGrid(year, month), [year, month]);
  const byDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const item of items) {
      for (const day of daysOf(item)) {
        map.set(day, [...(map.get(day) ?? []), item]);
      }
    }
    return map;
  }, [items]);

  // A new month chooses its first day with events, so the list under the
  // grid is never empty when the month is not.
  const firstWithEvents = grid.find((day) => day.inMonth && byDay.has(day.key))?.key ?? null;
  useEffect(() => {
    if (carried.current) {
      moved.current = true;
      setFocus(carried.current);
      carried.current = null;
      return;
    }
    setChosen(firstWithEvents);
    setFocus(firstWithEvents ?? grid.find((day) => day.inMonth)?.key ?? null);
  }, [firstWithEvents, grid]);

  useEffect(() => {
    if (moved.current && focus) cells.current.get(focus)?.focus();
    moved.current = false;
  }, [focus]);

  function shift(days: number) {
    if (!focus) return;
    const next = new Date(Date.parse(`${focus}T00:00:00Z`) + days * 86_400_000);
    const key = next.toISOString().slice(0, 10);
    moved.current = true;
    if (next.getUTCMonth() !== month || next.getUTCFullYear() !== year) {
      carried.current = key;
      onMonth(next.getUTCFullYear(), next.getUTCMonth());
      return;
    }
    setFocus(key);
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>) {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in steps) {
      event.preventDefault();
      shift(steps[event.key]);
    } else if ((event.key === "Home" || event.key === "End") && focus) {
      event.preventDefault();
      const weekday = (new Date(`${focus}T00:00:00Z`).getUTCDay() + 6) % 7;
      shift(event.key === "Home" ? -weekday : 6 - weekday);
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const delta = event.key === "PageUp" ? -1 : 1;
      const target = new Date(Date.UTC(year, month + delta, 1));
      onMonth(target.getUTCFullYear(), target.getUTCMonth());
    }
  }

  const step = (delta: number) => {
    const target = new Date(Date.UTC(year, month + delta, 1));
    onMonth(target.getUTCFullYear(), target.getUTCMonth());
  };

  const weeks = Array.from({ length: 6 }, (_, row) => grid.slice(row * 7, row * 7 + 7));
  const dayItems = chosen ? byDay.get(chosen) ?? [] : [];
  const monthHas = grid.some((day) => day.inMonth && byDay.has(day.key));
  const title = monthTitle(year, month, locale);

  return (
    <div className="ev-cal">
      <div className="ev-cal-head">
        <button type="button" className="ev-cal-nav" onClick={() => step(-1)} aria-label={t("ev.cal.prev")}>
          <Icon name="chevronLeft" />
        </button>
        <h2 className="ev-cal-title" aria-live="polite">
          {title}
        </h2>
        <button type="button" className="ev-cal-nav" onClick={() => step(1)} aria-label={t("ev.cal.next")}>
          <Icon name="chevronRight" />
        </button>
      </div>

      <table className="ev-cal-grid" role="grid" aria-label={title} aria-busy={loading}>
        <thead>
          <tr>
            {weekdayNames(locale).map((name) => (
              <th key={name} scope="col" abbr={name}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, row) => (
            <tr key={row}>
              {week.map((day) => {
                const count = byDay.get(day.key)?.length ?? 0;
                const label =
                  longDate(`${day.key}T12:00:00Z`, locale, "UTC") +
                  (count === 1
                    ? `, ${t("ev.countOne")}`
                    : count
                      ? `, ${fill(t("ev.cal.events"), { n: count })}`
                      : "");
                return (
                  <td key={day.key} role="gridcell" aria-selected={chosen === day.key}>
                    <button
                      type="button"
                      ref={(node) => {
                        if (node) cells.current.set(day.key, node);
                        else cells.current.delete(day.key);
                      }}
                      className={[
                        "ev-day",
                        day.inMonth ? "" : "is-out",
                        count ? "has-events" : "",
                        chosen === day.key ? "is-chosen" : "",
                        today === day.key ? "is-today" : "",
                      ].join(" ")}
                      tabIndex={focus === day.key ? 0 : -1}
                      aria-label={label}
                      aria-current={today === day.key ? "date" : undefined}
                      onClick={() => {
                        setChosen(day.key);
                        setFocus(day.key);
                      }}
                      onKeyDown={onKey}
                    >
                      <span className="ev-day-n">{day.day}</span>
                      {count > 0 && (
                        <span className="ev-day-marks" aria-hidden="true">
                          {Array.from({ length: Math.min(count, 3) }, (_, index) => (
                            <span key={index} />
                          ))}
                        </span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ev-cal-hint">{t("ev.cal.hint")}</p>

      <section className="ev-cal-day" aria-live="polite" aria-labelledby="ev-cal-day-h">
        <h3 id="ev-cal-day-h" className="ev-cal-day-title">
          {chosen ? longDate(`${chosen}T12:00:00Z`, locale, "UTC") : title}
        </h3>
        {!monthHas && !loading ? (
          <p className="ev-muted">{t("ev.cal.monthNone")}</p>
        ) : dayItems.length === 0 ? (
          <p className="ev-muted">{t("ev.cal.none")}</p>
        ) : (
          <ul className="ev-list">
            {dayItems.map((item) => (
              <li key={item.id}>
                <EventCard item={item} headingLevel={3} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
