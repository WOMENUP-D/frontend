"use client";

/**
 * One woman's card: her figures, her dimension scores, her courses and her
 * recent steps. Opening it is access to personal data — the server writes an
 * audit row for every view, and the card says so.
 */

import { useI18n, type MessageKey } from "@/i18n";
import { messages } from "@/i18n/messages";
import { fill } from "@/components/jobs/format";
import { portal } from "@/services/portal";
import { DimensionRow, Loading } from "@/components/ui";
import { dateText, timeText } from "@/components/events/format";
import { formatCount, formatDecimal } from "@/components/results/model";
import { Failure, useLoaded } from "@/components/analytics/Parts";
import { regionKey } from "@/utils/format";

export function AdminUserCard({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { t, tx, locale } = useI18n();
  const state = useLoaded(() => portal.rosterCard(userId), `card:${userId}`);
  const label = (key: string) => (key in messages ? t(key as MessageKey) : key.replace(/_/g, " "));

  return (
    <section className="rs-card rs-card-wide ros-card" aria-live="polite">
      {state.data === null ? (
        state.error ? <Failure error={state.error} retry={state.retry} /> : <Loading rows={2} />
      ) : (
        (() => {
          const { row, dimensions, courses, events } = state.data;
          return (
            <>
              <div className="rs-card-head">
                <div className="ros-card-head">
                  <h3 className="rs-q">
                    {row.name ?? <span className="an-actor">{row.tag}</span>}
                    {row.name && <span className="an-actor ros-tag">{row.tag}</span>}
                  </h3>
                  <p className="rs-scope ros-card-meta">
                    {row.email && <span>{row.email}</span>}
                    <span>{row.region ? t(regionKey(row.region)) : t("res.unknown")}</span>
                    <span>{fill(t("ros.card.joined"), { date: dateText(row.joined_at, locale) })}</span>
                    <span>
                      {row.last_active_at
                        ? fill(t("ros.card.lastActive"), { date: dateText(row.last_active_at, locale) })
                        : t("ap.never")}
                    </span>
                  </p>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{t("ros.close")}</button>
              </div>

              <div className="rs-grid">
                <div className="ros-block">
                  <h4 className="ros-h4">
                    {t("ros.card.score")}
                    {row.score !== null && <strong className="ros-score">{formatDecimal(row.score, locale)}</strong>}
                  </h4>
                  {dimensions.length === 0 ? (
                    <p className="rs-empty">{t("ros.card.noScore")}</p>
                  ) : (
                    <div className="stack" style={{ gap: 10 }}>
                      {dimensions.map((d) => (
                        <DimensionRow key={d.dimension} dimension={d.dimension} current={d.current} baseline={d.baseline} target={d.target} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="ros-block">
                  <h4 className="ros-h4">{t("ros.card.courses")}</h4>
                  {courses.length === 0 ? (
                    <p className="rs-empty">{t("ros.card.noCourses")}</p>
                  ) : (
                    <ul className="ros-list">
                      {courses.map((course) => (
                        <li key={course.program_id}>
                          <span className="ros-list-title">{tx(course.title_i18n) || course.slug}</span>
                          <span className="ros-list-meta">
                            {label(`ros.enrol.${course.status}`)} · {course.progress_percent}%
                            {course.completed_at && ` · ${dateText(course.completed_at, locale)}`}
                            {course.certificate && ` · ${t("ros.card.certificate")}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="ros-block">
                  <h4 className="ros-h4">{t("ros.card.events")}</h4>
                  {events.length === 0 ? (
                    <p className="rs-empty">{t("ros.card.noEvents")}</p>
                  ) : (
                    <ul className="ros-list">
                      {events.map((event, index) => (
                        <li key={`${event.occurred_at}-${index}`}>
                          <span className="ros-list-title">
                            {label(`an.ev.${event.name}`)}
                            {event.title_i18n && <span className="ros-list-sub"> {tx(event.title_i18n)}</span>}
                          </span>
                          <span className="ros-list-meta">
                            {dateText(event.occurred_at, locale)} · {timeText(event.occurred_at, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <p className="rs-note">
                {fill(t("ros.card.figures"), {
                  views: formatCount(row.views, locale),
                  days: formatCount(row.active_days, locale),
                  ai: formatCount(row.ai_requests, locale),
                  apps: formatCount(row.applications, locale),
                })}{" "}
                {t("ros.card.audited")}
              </p>
            </>
          );
        })()
      )}
    </section>
  );
}
