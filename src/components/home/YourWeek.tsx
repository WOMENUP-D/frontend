"use client";

/**
 * Her week in one glance: the lesson she left off at — the one thing set large
 * — and at most three small tiles beside it: the next event, the next
 * practical task, the next opportunity. Each is a record from `/ai/week`, or
 * absent. Four things, never twenty; a slot with nothing real in it is left
 * out rather than filled.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { portal, type WeekRead } from "@/services/portal";
import { fill } from "@/components/jobs/format";
import { typeKey } from "@/utils/format";
import { CTA, Icon, Section } from "@/components/ds";
import { DateLeaf } from "@/components/events/EventCard";
import { dateText, whenLine } from "@/components/events/format";

export function YourWeek() {
  const { t, tx, locale } = useI18n();
  const [week, setWeek] = useState<WeekRead | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    portal.week().then(setWeek).catch(() => setFailed(true));
  }, []);

  // A failure here costs her one convenience, not the cabinet: the row simply
  // is not drawn, and every record it would name is one click away elsewhere.
  if (failed || !week) return null;

  const { lesson, event, task, opportunity } = week;
  const tiles = [event, task, opportunity].filter(Boolean).length;

  return (
    <Section title={t("week.title")} lead={t("week.lead")} className="wk">
      {lesson && (
        <div className="wk-continue">
          <p className="wk-kicker">
            <Icon name="book" />
            {t("week.continue")}
          </p>
          <p className="wk-continue-title">{tx(lesson.program_title_i18n)}</p>
          {Object.keys(lesson.lesson_title_i18n).length > 0 && (
            <p className="wk-continue-lesson">
              {t("week.lesson")}: {tx(lesson.lesson_title_i18n)}
            </p>
          )}
          <div className="wk-progress" aria-hidden="true">
            <span style={{ width: `${lesson.progress}%` }} />
          </div>
          <p className="wk-meta">{fill(t("week.progress"), { n: lesson.progress })}</p>
          <CTA href={`/talim/kurslar/${lesson.program_slug}`} icon="book">
            {t("week.go")}
          </CTA>
        </div>
      )}

      {tiles > 0 && (
        <ul className="wk-tiles">
          {event && (
            <li>
              <Link href={`/tadbirlar/${event.id}`} className="wk-tile">
                <DateLeaf iso={event.starts_at} />
                <span className="wk-tile-text">
                  <span className="wk-label">
                    {t("week.event")}
                    <span className="wk-why">
                      {t(week.event_why === "yours" ? "week.event.yours" : "week.event.suggested")}
                    </span>
                  </span>
                  <span className="wk-tile-title">{tx(event.title_i18n)}</span>
                  <span className="wk-meta">{whenLine(event.starts_at, event.ends_at, locale)}</span>
                </span>
              </Link>
            </li>
          )}
          {task && (
            <li>
              <Link href={`/talim/amaliyot/${task.slug}`} className="wk-tile">
                <span className="wk-tile-icon" aria-hidden="true">
                  <Icon name="task" />
                </span>
                <span className="wk-tile-text">
                  <span className="wk-label">
                    {t("week.task")}
                    {task.status === "needs_improvement" && (
                      <span className="wk-why">{t("week.task.fix")}</span>
                    )}
                  </span>
                  <span className="wk-tile-title">{tx(task.title_i18n)}</span>
                  {task.estimated_minutes && (
                    <span className="wk-meta">
                      {fill(t("week.task.minutes"), { n: task.estimated_minutes })}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          )}
          {opportunity && (
            <li>
              <Link href={`/imkoniyatlar/${opportunity.id}`} className="wk-tile">
                <span className="wk-tile-icon" aria-hidden="true">
                  <Icon name="briefcase" />
                </span>
                <span className="wk-tile-text">
                  <span className="wk-label">
                    {t(typeKey(opportunity.type))}
                    <span className="wk-why">
                      {t(opportunity.why === "saved" ? "week.opp.saved" : "week.opp.suggested")}
                    </span>
                  </span>
                  <span className="wk-tile-title">{tx(opportunity.title_i18n)}</span>
                  {opportunity.deadline && (
                    <span className="wk-meta">
                      {fill(t("week.deadline"), { date: dateText(opportunity.deadline, locale) })}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          )}
        </ul>
      )}

      {!lesson && tiles === 0 && (
        <div className="wk-empty">
          <p>{t("week.empty")}</p>
          <CTA href="/dasturlar" variant="secondary" icon="book">
            {t("week.emptyCta")}
          </CTA>
        </div>
      )}
    </Section>
  );
}
