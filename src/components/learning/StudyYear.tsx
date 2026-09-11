"use client";

/**
 * A year of study as one picture.
 *
 * The month grid beside it answers "what is coming"; this answers "have I kept
 * at it" — a question no list can answer, because the shape of a habit is the
 * gaps in it. Fifty-two weeks are columns, the seven weekdays are rows, and the
 * shade of a square is how much was done that day.
 *
 * Three things it will not do:
 *
 * **It does not draw the future.** The window ends on today, and the last
 * column stops there. An empty square means "nothing was studied"; a day that
 * has not happened yet means nothing at all, and giving them the same square
 * would tell the reader they had missed days they have not reached.
 *
 * **It does not page.** There is no previous year to step back to — the window
 * rolls with the calendar, so the graph is always anchored to now and the
 * pager on the page above is hidden for this view.
 *
 * **It does not shade by hue.** The five bands are one colour stepped in
 * lightness, because the scale is a quantity: a reader has to be able to rank
 * two squares at a glance, and five different hues cannot be ranked at all.
 */

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { monthKey } from "@/components/learning/ui";
import { COLUMNS, LEVEL_TONES, studyYear, type StudyDay } from "@/content/study-log";

const WEEKDAY_KEYS = ["wd.mon", "wd.tue", "wd.wed", "wd.thu", "wd.fri", "wd.sat", "wd.sun"] as const;

export function StudyYearView({ anchor }: { anchor: Date }) {
  const { t, tx } = useI18n();

  // Rebuilt only when the day turns over, not on every selection: the whole
  // year is generated here and the graph must not flicker under a click.
  const year = useMemo(() => studyYear(anchor), [anchor]);

  const [picked, setPicked] = useState<string | null>(null);
  const selected: StudyDay =
    (picked && year.columns.flat().find((day) => day && day.key === picked)) || year.today;

  const isToday = selected.key === year.today.key;

  /* Built from the catalogue's own month names rather than
     `toLocaleDateString`. Intl has no Uzbek month list in every runtime and
     falls back to "M09", which is what the date read as before. */
  const dateLabel = `${selected.date.getDate()} ${t(monthKey(selected.date.getMonth() + 1))} ${selected.date.getFullYear()}`;

  return (
    <section className="lms-year" aria-label={t("lms.cal.year")}>
      <div className="lms-card lms-card-pad">
        {/* The three figures the graph is a picture of. Tabular so the eye can
            compare them down the row rather than reading each one. */}
        <div className="lms-year-stats">
          <div>
            <b>{year.totals.lessons}</b>
            <span>{t("lms.year.lessons")}</span>
          </div>
          <div>
            <b>{year.totals.bestStreak}</b>
            <span>{t("lms.year.best")}</span>
          </div>
          <div>
            <b className="lms-year-now">{year.totals.currentStreak}</b>
            <span>{t("lms.year.current")}</span>
          </div>
        </div>

        <div className="lms-year-scroll">
          <div className="lms-year-grid-wrap">
            {/* Month ruler. A label sits over the column its month begins in,
                so the year reads left to right through the months. */}
            <div className="lms-year-months" aria-hidden="true">
              {year.monthAt.map((label, index) => (
                <span key={`m-${index}`}>{label}</span>
              ))}
            </div>

            <div className="lms-year-body">
              {/* Every other weekday, the way a dense grid can carry labels at
                  all — seven would collide at this row height. */}
              <div className="lms-year-days" aria-hidden="true">
                {WEEKDAY_KEYS.map((key, index) => (
                  <span key={key}>{index % 2 === 0 ? t(key) : ""}</span>
                ))}
              </div>

              <div className="lms-year-grid">
                {year.columns.map((column, columnIndex) => (
                  <div className="lms-year-col" key={`c-${columnIndex}`}>
                    {column.map((day, rowIndex) =>
                      day ? (
                        <button
                          key={day.key}
                          type="button"
                          className={[
                            "lms-year-cell",
                            day.key === selected.key ? "is-picked" : "",
                            day.key === year.today.key ? "is-today" : "",
                          ].join(" ").trim()}
                          style={{ background: LEVEL_TONES[day.level] }}
                          onClick={() => setPicked(day.key)}
                          aria-pressed={day.key === selected.key}
                          title={`${day.key} — ${day.level} ${t("lms.year.lessonsShort")}`}
                        />
                      ) : (
                        // Future days keep their slot so the rows stay aligned,
                        // but nothing is drawn in them.
                        <span className="lms-year-cell lms-year-gap" key={`g-${columnIndex}-${rowIndex}`} />
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="lms-year-foot">
              <span className="lms-year-note">{t("lms.year.how")}</span>
              <span className="lms-year-scale">
                {t("lms.year.less")}
                <i aria-hidden="true">
                  {LEVEL_TONES.map((tone) => (
                    <b key={tone} style={{ background: tone }} />
                  ))}
                </i>
                {t("lms.year.more")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* What that square held. Opens on today, so the panel is never empty
          at rest and the last cell is the one explained first. */}
      <div className="lms-card lms-card-pad lms-year-day">
        <div className="lms-year-day-head">
          <h3>{dateLabel}</h3>
          <span className={isToday ? "lms-year-today-tag" : "lms-year-day-meta"}>
            {isToday ? t("lms.year.today") : ""}
          </span>
          <span className="lms-year-day-meta">
            {selected.level > 0
              ? `${selected.level} ${t("lms.year.lessonsShort")} · ${selected.minutes} ${t("lms.year.min")}`
              : t("lms.year.nothing")}
          </span>
        </div>

        {selected.entries.length > 0 ? (
          <ul className="lms-year-entries">
            {selected.entries.map((entry, index) => (
              <li key={`${selected.key}-${index}`}>
                <span className="lms-year-time">{entry.time}</span>
                <span className="lms-year-what">
                  <b>{tx(entry.title)}</b>
                  <i style={{ color: entry.tone }}>{tx(entry.course)}</i>
                </span>
                <span className="lms-year-mins">{entry.minutes} {t("lms.year.min")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="lms-lead lms-year-empty">{t("lms.year.emptyHint")}</p>
        )}
      </div>
    </section>
  );
}

export { COLUMNS };
