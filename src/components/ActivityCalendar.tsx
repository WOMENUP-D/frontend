"use client";

/**
 * The activity calendar, with a points total and a streak.
 *
 * A year of squares makes steady effort visible in a way a progress bar cannot:
 * a plan at 40% says nothing about whether she worked on it this week. Every
 * square is a real act — a step finished, a programme started, an application
 * sent — so the picture cannot be padded.
 *
 * The blossom is deliberately closed when the streak is zero: a mark that
 * shames someone on her first day is the opposite of the point. It opens the
 * day she starts, which is also the day the site's own branch is about.
 */

import { useEffect, useMemo, useState } from "react";
import { portal, type ActivitySummary } from "@/services/portal";
import { Blossom } from "@/components/Blossom";
import { useI18n, type MessageKey } from "@/i18n";

/** The rows the grid labels — the same three GitHub labels. Row 0 is Monday. */
const WEEKDAY_LABELS: Record<number, MessageKey> = { 1: "wd.mon", 3: "wd.wed", 5: "wd.fri" };

/** The strip above the grid. Abbreviated from the catalogue's own month name
 *  rather than by the browser, for the same reason the tooltip is: a reduced
 *  ICU build renders Uzbek months as "M06". Three letters is a month everywhere
 *  the portal speaks — "авг", "avg", "Aug". */
function monthLabel(month: string): string {
  return month.slice(0, 3);
}


export function ActivityCalendar() {
  const { t } = useI18n();
  const [data, setData] = useState<ActivitySummary | null>(null);
  /* The hovered square's label and where to hang it. Position is measured from
     the grid rather than the page, so the tip travels with the calendar when
     the page scrolls. */
  const [hover, setHover] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    portal.activity().then(setData).catch(() => setData(null));
  }, []);

  /** Group the flat day list into calendar weeks, padded so every column is a
   *  full week and the rows line up with weekdays. */
  const weeks = useMemo(() => {
    if (!data) return [];
    const out: (ActivitySummary["days"][number] | null)[][] = [];
    let week: (ActivitySummary["days"][number] | null)[] = [];

    const first = new Date(data.days[0].date);
    // getDay(): 0 = Sunday. The grid starts on Monday.
    const lead = (first.getDay() + 6) % 7;
    for (let i = 0; i < lead; i += 1) week.push(null);

    for (const day of data.days) {
      week.push(day);
      if (week.length === 7) {
        out.push(week);
        week = [];
      }
    }
    if (week.length) {
      while (week.length < 7) week.push(null);
      out.push(week);
    }
    return out;
  }, [data]);

  if (!data) return null;

  const dayTitle = (day: { date: string; count: number }) => {
    /* Spelled out — "3 августа 2026" rather than "03.08.2026". The point of the
       square is to answer "when was I last at this", and a numeric date makes
       the reader do the decoding. */
    /* Formatted here rather than by the browser. `toLocaleDateString` was
       giving "June 22, 2026" under a Russian heading, and some browser builds
       ship a reduced ICU table that renders Uzbek as "2026 M06 22" — which is
       the primary locale of this portal. The month names are in the catalogue,
       so this reads the same everywhere. */
    const at = new Date(day.date);
    const month = t(`mon.${at.getMonth() + 1}` as MessageKey);
    const when = `${at.getDate()} ${month} ${at.getFullYear()}`;
    const what =
      day.count === 0
        ? t("act.noneDay")
        : day.count === 1
          ? t("act.oneDay")
          : t("act.manyDay").replace("{n}", String(day.count));
    return `${when} — ${what}`;
  };

  /** Anchored to the square's centre, sitting just above it. */
  function show(cell: HTMLElement, day: { date: string; count: number }) {
    const grid = cell.closest(".cal-grid") as HTMLElement | null;
    if (!grid) return;
    const box = cell.getBoundingClientRect();
    const frame = grid.getBoundingClientRect();
    setHover({
      text: dayTitle(day),
      x: box.left - frame.left + box.width / 2,
      y: box.top - frame.top,
    });
  }

  return (
    <div className="card stack" style={{ gap: 16 }}>
      <div className="cal-head">
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">{t("act.title")}</span>
          <span className="small muted">
            {t("act.actions")
              .replace("{n}", String(data.total_actions))
              .replace("{year}", String(new Date(data.from_date).getFullYear()))}
          </span>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <span className="stat-pill" title={t("act.points")}>
            <span className="stat-ico stat-ico-gem" aria-hidden="true" />
            <strong>{data.points}</strong>
          </span>
          <span
            className={data.current_streak > 0 ? "stat-pill stat-pill-hot" : "stat-pill"}
            title={t("act.best").replace("{n}", String(data.best_streak))}
          >
            <Blossom alive={data.current_streak > 0} />
            <strong>{data.current_streak}</strong>
          </span>
        </div>
      </div>

      {data.total_actions === 0 ? (
        <p className="muted small">{t("act.empty")}</p>
      ) : (
        <>
          <div className="cal-scroll">
            <div className="cal-grid-wrap">
              <div className="cal-weekdays" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6].map((row) => (
                  <span key={row}>
                    {WEEKDAY_LABELS[row] ? t(WEEKDAY_LABELS[row]) : ""}
                  </span>
                ))}
              </div>

              <div className="cal-body">
                <div className="cal-months" aria-hidden="true">
                  {(() => {
                    // Label a column only when its month differs from the last
                    // one labelled. Keying off "day of month <= 7" alone put two
                    // labels on adjacent columns and they overlapped.
                    let labelled = -1;
                    return weeks.map((week, index) => {
                      const first = week.find(Boolean);
                      if (!first) return <span key={index} />;
                      const month = new Date(first.date).getMonth();
                      const show = month !== labelled;
                      if (show) labelled = month;
                      return (
                        <span key={index}>
                          {show ? monthLabel(t(`mon.${new Date(first.date).getMonth() + 1}` as MessageKey)) : ""}
                        </span>
                      );
                    });
                  })()}
                </div>

                <div
                  className="cal-grid"
                  role="img"
                  aria-label={t("act.title")}
                  onMouseLeave={() => setHover(null)}
                >
                  {weeks.map((week, index) => (
                    <div key={index} className="cal-week">
                      {week.map((day, row) =>
                        day ? (
                          <span
                            key={day.date}
                            className={`cal-day cal-l${day.level}`}
                            tabIndex={0}
                            /* The native tooltip stays as the fallback: it is
                               what a screen reader and a touch device get. */
                            title={dayTitle(day)}
                            onMouseEnter={(event) => show(event.currentTarget, day)}
                            onFocus={(event) => show(event.currentTarget, day)}
                            onBlur={() => setHover(null)}
                          />
                        ) : (
                          <span key={`pad-${index}-${row}`} className="cal-day cal-pad" />
                        ),
                      )}
                    </div>
                  ))}

                  {hover && (
                    <span
                      className="cal-tip"
                      style={{ left: hover.x, top: hover.y }}
                      aria-hidden="true"
                    >
                      {hover.text}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="cal-legend">
            <span className="faint">{t("act.streakHint")}</span>
            <span className="row" style={{ gap: 5 }}>
              <span className="faint">{t("act.less")}</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <span key={level} className={`cal-day cal-l${level}`} />
              ))}
              <span className="faint">{t("act.more")}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
