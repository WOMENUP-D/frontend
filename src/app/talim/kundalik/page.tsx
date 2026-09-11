"use client";

/**
 * The study diary.
 *
 * Three screens in this section already report on the work: the year graph
 * says how consistently she studied, the calendar says when, the goals say how
 * far. None of them says what it was like — and that is the part she will have
 * forgotten by the time it would have been useful.
 *
 * So this screen is written, not measured. Two decisions follow from that:
 *
 * **What went badly is shown as plainly as what went well.** A log of good
 * days is not a record anyone recognises as their own, and the "hard" line is
 * the one that makes the entry worth re-reading months later. It gets its own
 * marked block rather than being tucked under the good news.
 *
 * **Entries are grouped by month and read newest first.** A diary is opened at
 * the last page. The month heading is what makes a year of it skimmable, and
 * it carries the month's own totals so the reader can see the shape of a month
 * before reading a word of it.
 */

import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { diary, type DiaryEntry } from "@/content/diary";
import { useMockData } from "@/components/learning/useMockData";
import {
  EmptyState,
  ErrorState,
  PageHead,
  Skeleton,
  monthKey,
} from "@/components/learning/ui";

interface MonthGroup {
  key: string;
  month: number;
  year: number;
  entries: DiaryEntry[];
  minutes: number;
}

export default function DiaryPage() {
  const { t, tx } = useI18n();
  const { data, loading, error, retry } = useMockData(() => diary);

  // Grouped in one pass rather than filtered per month: a diary that runs for
  // a year would otherwise walk the whole list once for every heading.
  const months = useMemo<MonthGroup[]>(() => {
    if (!data) return [];
    const out: MonthGroup[] = [];
    for (const entry of data) {
      const date = new Date(`${entry.date}T00:00:00`);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const last = out[out.length - 1];
      if (last && last.key === key) {
        last.entries.push(entry);
        last.minutes += entry.minutes;
      } else {
        out.push({
          key,
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          entries: [entry],
          minutes: entry.minutes,
        });
      }
    }
    return out;
  }, [data]);

  if (error) {
    return (
      <>
        <Head />
        <ErrorState onRetry={retry} />
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        <Head />
        <Skeleton height={120} radius={12} />
      </>
    );
  }

  if (data.length === 0) {
    return (
      <>
        <Head />
        <EmptyState mark="✎" title={t("lms.diary.empty")} hint={t("lms.diary.emptyHint")} />
      </>
    );
  }

  return (
    <>
      <Head />

      <div className="lms-diary">
        {months.map((group) => (
          <section key={group.key} className="lms-diary-month">
            <div className="lms-diary-mhead">
              <h2>{t(monthKey(group.month))} {group.year}</h2>
              <span>
                {group.entries.length} {t("lms.diary.entries")} · {group.minutes} {t("lms.year.min")}
              </span>
            </div>

            <ol className="lms-diary-list">
              {group.entries.map((entry) => {
                const date = new Date(`${entry.date}T00:00:00`);
                return (
                  <li key={entry.date} className="lms-diary-item">
                    {/* The date is the anchor in the margin, the way a paper
                        diary is read — scanned down the edge, not through. */}
                    <div className="lms-diary-when">
                      <b>{date.getDate()}</b>
                      <i>{t(monthKey(date.getMonth() + 1)).slice(0, 3)}</i>
                    </div>

                    <div className="lms-diary-body">
                      <div className="lms-diary-top">
                        <span className="lms-diary-lesson">{tx(entry.lesson)}</span>
                        <span className="lms-diary-course" style={{ color: entry.tone }}>
                          {tx(entry.course)}
                        </span>
                        <span className="lms-diary-mins">{entry.minutes} {t("lms.year.min")}</span>
                      </div>

                      <p className="lms-diary-gained">{tx(entry.gained)}</p>

                      {entry.hard && (
                        <p className="lms-diary-hard">
                          <span>{t("lms.diary.hard")}</span>
                          {tx(entry.hard)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}

function Head() {
  const { t } = useI18n();
  return <PageHead title={t("lms.nav.diary")} lead={t("lms.diary.lead")} />;
}
