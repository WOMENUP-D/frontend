"use client";

/**
 * The six sections of the Results dashboard. Each loads its own figures from
 * its own endpoint, so one slow or failing section never blanks the others,
 * and each says in words what it can and cannot tell you.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { messages } from "@/i18n/messages";
import { ApiError } from "@/services/api";
import {
  portal,
  type ProgrammeSort,
  type ResultsFilters,
  type ResultsScope,
} from "@/services/portal";
import { Loading } from "@/components/ui";
import { fill } from "@/components/jobs/format";
import {
  dimensionKey,
  evidenceKindKey,
  proficiencyKey,
  regionKey,
  sourceKey,
  typeKey,
} from "@/utils/format";
import { BarList, ChartCard, ColumnChart, SeriesTable, SplitBars, SplitTable, TableBox } from "./Charts";
import { Hero, RateTile, Tile } from "./Figures";
import { bucketLabel, formatCount, formatDecimal, formatPercent, hasPoints, metricOf, rateOf } from "./model";

export type SectionKey = "overview" | "learning" | "skills" | "score" | "career" | "events";

interface Loaded<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  retry: () => void;
}

/**
 * Loads a section's figures whenever the filters change. While new figures
 * load, the old ones stay on screen, dimmed; if loading fails they go, so a
 * figure is never shown under a period it was not counted for.
 */
function useLoaded<T>(load: () => Promise<T>, key: string): Loaded<T> {
  const [state, setState] = useState<{ data: T | null; error: unknown; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const [attempt, setAttempt] = useState(0);
  const loader = useRef(load);
  loader.current = load;

  useEffect(() => {
    let live = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    loader
      .current()
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: null, error, loading: false }));
    return () => {
      live = false;
    };
  }, [key, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

function reasonOf(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const detail = error.detail as { reason?: string } | undefined;
  return detail && typeof detail === "object" && detail.reason ? detail.reason : null;
}

function Failure({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useI18n();
  const reason = reasonOf(error);
  const text =
    reason === "no_region_scope" ? t("res.noScope")
    : reason === "period_reversed" ? t("res.reversed")
    : error instanceof ApiError && error.status === 403 ? t("res.forbidden")
    : t("res.loadError");
  const fixable = !reason && !(error instanceof ApiError && error.status === 403);
  return (
    <div className="rs-failure" role="alert">
      <p>{text}</p>
      {fixable && (
        <button type="button" className="btn btn-outline btn-sm" onClick={retry}>
          {t("lms.err.retry")}
        </button>
      )}
    </div>
  );
}

function Body<T extends { scope: ResultsScope }>({
  state,
  onScope,
  children,
}: {
  state: Loaded<T>;
  onScope: (scope: ResultsScope | null) => void;
  children: (data: T) => ReactNode;
}) {
  const scope = state.data?.scope ?? null;
  useEffect(() => onScope(scope), [scope, onScope]);

  if (state.data === null) {
    if (state.error) return <Failure error={state.error} retry={state.retry} />;
    return <Loading rows={3} />;
  }
  return (
    <div className={state.loading ? "rs-body is-stale" : "rs-body"} aria-busy={state.loading}>
      {children(state.data)}
    </div>
  );
}

/** A label from the catalogue when there is one, the raw key when there is not. */
function useLabel() {
  const { t } = useI18n();
  return (key: string, fallback?: string): string =>
    key in messages ? t(key as MessageKey) : (fallback ?? key.replace(/_/g, " "));
}

const dash = (key: string) => key.replace("-", "–");

interface SectionProps {
  filters: ResultsFilters;
  filterKey: string;
  onScope: (scope: ResultsScope | null) => void;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function OverviewSection({ filters, filterKey, onScope }: SectionProps) {
  const { t, locale } = useI18n();
  const state = useLoaded(() => portal.results.overview(filters), `overview:${filterKey}`);
  return (
    <Body state={state} onScope={onScope}>
      {(data) => {
        const m = (key: string) => metricOf(data.metrics, key);
        return (
          <>
            <Hero metric="participants" value={data.participants} />
            <div className="rs-tiles">
              <Tile metric="new_registrations" value={m("new_registrations")} />
              <Tile
                metric="active_in_period"
                value={m("active_in_period")}
                note={
                  data.activity_since
                    ? fill(t("res.activitySince"), {
                        date: bucketLabel(data.activity_since, "day", locale).long,
                      })
                    : t("res.activityNever")
                }
              />
              <Tile metric="onboarded" value={m("onboarded")} />
              <Tile metric="diagnosed" value={m("diagnosed")} />
              <Tile metric="learners_started" value={m("learners_started")} />
              <Tile metric="course_completions" value={m("course_completions")} />
              <Tile metric="certificates" value={m("certificates")} />
              <Tile metric="applications" value={m("applications")} />
              <Tile metric="event_registrations" value={m("event_registrations")} />
              <Tile metric="outcomes_recorded" value={m("outcomes_recorded")} />
            </div>
            <div className="rs-grid rs-grid-2">
              <ChartCard
                title={t("res.q.registrations")}
                wide
                note={t(`res.bucket.${data.scope.period.bucket}` as MessageKey)}
                table={
                  hasPoints(data.registrations) && (
                    <SeriesTable
                      series={data.registrations}
                      bucket={data.scope.period.bucket}
                      label={t("res.q.registrations")}
                    />
                  )
                }
              >
                <ColumnChart series={data.registrations} bucket={data.scope.period.bucket} />
              </ChartCard>
              <ChartCard title={t("res.q.regions")} note={t("res.regions.note")}>
                <BarList
                  groups={data.regions}
                  label={t("res.q.regions")}
                  name={(key) => (key === "unknown" ? t("res.unknown") : t(regionKey(key)))}
                />
              </ChartCard>
              <ChartCard title={t("res.q.ages")} note={t("res.ages.note")}>
                <BarList
                  groups={data.ages}
                  ordinal
                  label={t("res.q.ages")}
                  name={(key) => (key === "unknown" ? t("res.unknown") : dash(key))}
                />
              </ChartCard>
            </div>
            <p className="rs-privacy">{t("res.privacy")}</p>
          </>
        );
      }}
    </Body>
  );
}

// ---------------------------------------------------------------------------
// Learning
// ---------------------------------------------------------------------------

export function LearningSection({ filters, filterKey, onScope }: SectionProps) {
  const { t } = useI18n();
  const state = useLoaded(() => portal.results.learning(filters), `learning:${filterKey}`);
  return (
    <>
      <Body state={state} onScope={onScope}>
        {(data) => {
          const m = (key: string) => metricOf(data.metrics, key);
          const bucket = data.scope.period.bucket;
          const [started, completed] = data.series;
          return (
            <>
              <div className="rs-tiles rs-tiles-rates">
                <RateTile rate={rateOf(data.rates, "course_completion_rate")} />
                <RateTile rate={rateOf(data.rates, "path_completion_rate")} />
                <RateTile rate={rateOf(data.rates, "task_pass_rate")} />
              </div>
              <div className="rs-tiles">
                {[
                  "enrollments_started",
                  "learners_started",
                  "in_progress_now",
                  "course_completions",
                  "certificates",
                  "paths_started",
                  "paths_completed",
                  "tasks_submitted",
                  "tasks_evaluated",
                  "tasks_passed",
                ].map((key) => (
                  <Tile key={key} metric={key} value={m(key)} />
                ))}
              </div>
              <div className="rs-grid">
                {started && (
                  <ChartCard
                    title={t("res.q.started")}
                    note={t(`res.bucket.${bucket}` as MessageKey)}
                    table={hasPoints(started) && <SeriesTable series={started} bucket={bucket} label={t("res.q.started")} />}
                  >
                    <ColumnChart series={started} bucket={bucket} />
                  </ChartCard>
                )}
                {completed && (
                  <ChartCard
                    title={t("res.q.completed")}
                    note={t(`res.bucket.${bucket}` as MessageKey)}
                    table={hasPoints(completed) && <SeriesTable series={completed} bucket={bucket} label={t("res.q.completed")} />}
                  >
                    <ColumnChart series={completed} bucket={bucket} />
                  </ChartCard>
                )}
                <ChartCard title={t("res.q.evaluations")}>
                  <BarList
                    groups={data.evaluations}
                    ordinal
                    label={t("res.q.evaluations")}
                    empty={t("res.list.empty")}
                    name={(key) => t(`res.eval.${key}` as MessageKey)}
                  />
                </ChartCard>
              </div>
            </>
          );
        }}
      </Body>
      <Programmes filters={filters} filterKey={filterKey} />
    </>
  );
}

const PAGE_SIZE = 10;

const COLUMNS: { key: ProgrammeSort | "in_progress" | "tasks"; label: MessageKey; sortable: boolean }[] = [
  { key: "enrolled", label: "res.prog.col.enrolled", sortable: true },
  { key: "in_progress", label: "res.prog.col.inProgress", sortable: false },
  { key: "completed", label: "res.prog.col.completed", sortable: true },
  { key: "completion", label: "res.prog.col.completion", sortable: true },
  { key: "certificates", label: "res.prog.col.certificates", sortable: true },
  { key: "tasks", label: "res.prog.col.tasks", sortable: false },
];

/** Every programme with the period's figures — sorted, searched and paged by
 *  the server, which is the only place the enrollments are. */
function Programmes({ filters, filterKey }: { filters: ResultsFilters; filterKey: string }) {
  const { t, tx, locale, apiLocale } = useI18n();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ProgrammeSort>("enrolled");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => setPage(1), [filterKey]);

  const state = useLoaded(
    () => portal.results.programmes(filters, { search, sort, order, page, size: PAGE_SIZE, lang: apiLocale }),
    `programmes:${filterKey}:${search}:${sort}:${order}:${page}:${apiLocale}`,
  );

  function sortBy(key: ProgrammeSort) {
    if (key === sort) setOrder(order === "desc" ? "asc" : "desc");
    else {
      setSort(key);
      setOrder(key === "title" ? "asc" : "desc");
    }
    setPage(1);
  }

  // A render function, not a component: a component declared here would be a
  // new type on every render, and the button would lose focus when clicked.
  function sortButton(column: ProgrammeSort, label: string) {
    const on = sort === column;
    return (
      <button type="button" className={on ? "rs-sort is-on" : "rs-sort"} onClick={() => sortBy(column)}>
        {label}
        <span aria-hidden="true" className="rs-sort-mark">
          {on ? (order === "desc" ? "↓" : "↑") : "↕"}
        </span>
      </button>
    );
  }

  const ariaSort = (column: string) =>
    sort === column ? (order === "desc" ? "descending" : "ascending") : undefined;

  const data = state.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <section className="rs-card rs-card-wide rs-programmes" aria-labelledby="rs-programmes-title">
      <div className="rs-card-head">
        <h3 className="rs-q" id="rs-programmes-title">
          {t("res.q.programmes")}
        </h3>
        <label className="rs-search">
          <span className="sr-only">{t("res.prog.search")}</span>
          <input
            type="search"
            className="input"
            placeholder={t("res.prog.search")}
            value={query}
            maxLength={80}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {data === null ? (
        state.error ? (
          <Failure error={state.error} retry={state.retry} />
        ) : (
          <Loading rows={2} />
        )
      ) : data.total === 0 ? (
        <p className="rs-empty">{search ? t("res.prog.empty") : t("res.prog.none")}</p>
      ) : (
        <div className={state.loading ? "rs-body is-stale" : "rs-body"} aria-busy={state.loading}>
          <TableBox label={t("res.q.programmes")}>
            <table className="rs-table rs-prog-table">
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSort("title")}>
                    {sortButton("title", t("res.prog.col.title"))}
                  </th>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className="rs-num"
                      aria-sort={column.sortable ? ariaSort(column.key) : undefined}
                    >
                      {column.sortable ? (
                        sortButton(column.key as ProgrammeSort, t(column.label))
                      ) : (
                        t(column.label)
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">
                      <span className="rs-prog-title">{tx(row.title_i18n) || row.slug}</span>
                      {!row.is_published && <span className="rs-tag">{t("res.prog.draft")}</span>}
                    </th>
                    <td className="rs-num">{formatCount(row.enrolled, locale)}</td>
                    <td className="rs-num">{formatCount(row.in_progress, locale)}</td>
                    <td className="rs-num">{formatCount(row.completed, locale)}</td>
                    <td className="rs-num">
                      {row.completion.value === null ? (
                        <span className="rs-muted">{t("res.noData")}</span>
                      ) : (
                        <>
                          {formatPercent(row.completion.value, locale)}
                          <span className="rs-cell-note">
                            {fill(t("res.ofN"), {
                              n: formatCount(row.completion.numerator, locale),
                              d: formatCount(row.completion.denominator, locale),
                            })}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="rs-num">{formatCount(row.certificates, locale)}</td>
                    <td className="rs-num">{formatCount(row.tasks_submitted, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>
          <div className="rs-pager">
            <span className="rs-muted">{fill(t("res.prog.total"), { n: formatCount(data.total, locale) })}</span>
            <div className="rs-pager-nav">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t("res.prog.prev")}
              </button>
              <span aria-live="polite">{fill(t("res.prog.page"), { page, pages })}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
              >
                {t("res.prog.next")}
              </button>
            </div>
          </div>
        </div>
      )}
      <p className="rs-note">{t("res.prog.note")}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

const TIERS = ["self_reported", "learned", "assessed", "verified"] as const;

export function SkillsSection({ filters, filterKey, onScope }: SectionProps) {
  const { t, tx } = useI18n();
  const state = useLoaded(() => portal.results.skills(filters), `skills:${filterKey}`);
  const status = (key: string) => (key === "none" ? t("res.st.none") : t(`res.st.${key}` as MessageKey));
  return (
    <Body state={state} onScope={onScope}>
      {(data) => {
        const evidence = Object.fromEntries(data.evidence.map((group) => [group.key, group.value ?? 0]));
        return (
          <>
            <p className="rs-lead-note">{t("res.skills.note")}</p>
            <div className="rs-tiles rs-tiers">
              {TIERS.map((tier) => (
                <Tile
                  key={tier}
                  metric="evidence"
                  label={t(`res.st.${tier}` as MessageKey)}
                  value={evidence[tier] ?? 0}
                  note={t(`res.st.hint.${tier}` as MessageKey)}
                />
              ))}
            </div>
            <ChartCard title={t("res.q.topSkills")} wide note={t("res.topNote")}>
              <div className="rs-top3">
                {(["learned", "assessed", "verified"] as const).map((tier) => {
                  const rows = data.top[tier] ?? [];
                  return (
                    <div key={tier} className="rs-top">
                      <h4 className="rs-top-title">{t(`res.st.${tier}` as MessageKey)}</h4>
                      <BarList
                        groups={rows.map((row) => ({
                          key: row.skill.slug ?? row.skill.label,
                          value: row.value,
                          suppressed: false,
                        }))}
                        label={t(`res.st.${tier}` as MessageKey)}
                        empty={t("res.topEmpty")}
                        name={(key) => {
                          const row = rows.find((item) => (item.skill.slug ?? item.skill.label) === key);
                          return row ? tx(row.skill.name_i18n) || row.skill.label : key;
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </ChartCard>
            <div className="rs-grid">
              <ChartCard title={t("res.q.evidenceKinds")}>
                <BarList
                  groups={data.evidence_kinds}
                  label={t("res.q.evidenceKinds")}
                  empty={t("res.list.empty")}
                  name={(key) => (key === "self_reported" ? t("res.st.self_reported") : t(evidenceKindKey(key)))}
                />
              </ChartCard>
              <ChartCard title={t("res.q.held")} note={t("res.held.note")}>
                <BarList
                  groups={data.statuses}
                  ordinal
                  label={t("res.q.held")}
                  empty={t("res.list.empty")}
                  name={status}
                />
                {data.levels.length > 0 && (
                  <>
                    <h4 className="rs-top-title rs-sub">{t("res.q.levels")}</h4>
                    <BarList
                      groups={data.levels}
                      label={t("res.q.levels")}
                      name={(key) => (key === "unknown" ? t("res.unknown") : t(proficiencyKey(key)))}
                    />
                  </>
                )}
              </ChartCard>
            </div>
          </>
        );
      }}
    </Body>
  );
}

// ---------------------------------------------------------------------------
// Development Score
// ---------------------------------------------------------------------------

export function ScoreSection({ filters, onScope }: SectionProps) {
  const { t, locale } = useI18n();
  // A score is today's reading: only the region can change it.
  const state = useLoaded(() => portal.results.score(filters), `score:${filters.region ?? ""}`);
  return (
    <Body state={state} onScope={onScope}>
      {(data) => (
        <>
          <div className="rs-tiles rs-tiles-rates">
            <Tile metric="score_people" value={data.people} note={fill(t("res.score.sample"), { n: data.people })} />
            <div className="rs-tile">
              {data.average === null ? (
                <span className="rs-tile-value is-none">{t("res.noData")}</span>
              ) : (
                <span className="rs-tile-value">{formatDecimal(data.average, locale)}</span>
              )}
              <span className="rs-tile-label">{t("res.score.average")}</span>
              {data.average === null && <span className="rs-tile-note">{t("res.score.tooFew")}</span>}
              <details className="rs-def">
                <summary>{t("res.how")}</summary>
                <p>{t("res.score.averageDef")}</p>
              </details>
            </div>
          </div>
          {data.people > 0 && data.small_sample && (
            <p className="rs-caution" role="note">
              {fill(t("res.score.small"), { n: data.people })}
            </p>
          )}
          {data.distribution.length === 0 ? (
            <p className="rs-empty">{t("res.score.tooFew")}</p>
          ) : (
            <div className="rs-grid rs-grid-2">
              <ChartCard title={t("res.q.scoreDist")}>
                <BarList groups={data.distribution} ordinal label={t("res.q.scoreDist")} name={dash} />
              </ChartCard>
              <ChartCard
                title={t("res.q.dimensions")}
                note={t("res.score.verdict")}
                table={<SplitTable rows={data.dimensions} name={(key) => t(dimensionKey(key))} />}
              >
                <SplitBars rows={data.dimensions} name={(key) => t(dimensionKey(key))} />
              </ChartCard>
            </div>
          )}
          <p className="rs-privacy">{t("res.privacy")}</p>
        </>
      )}
    </Body>
  );
}

// ---------------------------------------------------------------------------
// Career & opportunities
// ---------------------------------------------------------------------------

export function CareerSection({ filters, filterKey, onScope }: SectionProps) {
  const { t } = useI18n();
  const label = useLabel();
  const state = useLoaded(() => portal.results.opportunities(filters), `career:${filterKey}`);
  return (
    <Body state={state} onScope={onScope}>
      {(data) => {
        const m = (key: string) => metricOf(data.metrics, key);
        return (
          <>
            <div className="rs-tiles">
              <Tile metric="applications" value={m("applications")} />
              <RateTile rate={rateOf(data.rates, "application_accepted_rate")} />
              <Tile metric="saved_listings" value={m("saved_listings")} />
              <Tile metric="invitations_sent" value={m("invitations_sent")} />
              <Tile metric="invitations_accepted" value={m("invitations_accepted")} />
            </div>
            <ChartCard title={t("res.q.outcomes")} wide note={t("res.outcomes.note")}>
              <div className="rs-outcomes">
                <Tile metric="outcomes_recorded" value={m("outcomes_recorded")} />
                <BarList
                  groups={data.outcomes}
                  label={t("res.q.outcomes")}
                  empty={t("res.outcomes.empty")}
                  name={(key) => label(`port.outcome.${key}`, key)}
                />
              </div>
            </ChartCard>
            <div className="rs-grid">
              <ChartCard title={t("res.q.appsByType")}>
                <BarList
                  groups={data.applications_by_type}
                  label={t("res.q.appsByType")}
                  empty={t("res.list.empty")}
                  name={(key) => t(typeKey(key))}
                />
              </ChartCard>
              <ChartCard title={t("res.q.appsByStatus")}>
                <BarList
                  groups={data.applications_by_status}
                  ordinal
                  label={t("res.q.appsByStatus")}
                  empty={t("res.list.empty")}
                  name={(key) => label(`job.st.${key}`, key)}
                />
              </ChartCard>
              <ChartCard title={t("res.q.appsBySource")}>
                <BarList
                  groups={data.applications_by_source}
                  label={t("res.q.appsBySource")}
                  empty={t("res.list.empty")}
                  name={(key) => t(sourceKey(key))}
                />
              </ChartCard>
              <ChartCard title={t("res.q.saved")}>
                <BarList
                  groups={data.saved_by_type}
                  label={t("res.q.saved")}
                  empty={t("res.list.empty")}
                  name={(key) => t(typeKey(key))}
                />
              </ChartCard>
              <ChartCard title={t("res.q.open")} note={t("res.open.note")}>
                <BarList
                  groups={data.open_by_type}
                  label={t("res.q.open")}
                  empty={t("res.list.empty")}
                  name={(key) => t(typeKey(key))}
                />
              </ChartCard>
            </div>
          </>
        );
      }}
    </Body>
  );
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function EventsSection({ filters, filterKey, onScope }: SectionProps) {
  const { t, tx } = useI18n();
  const state = useLoaded(() => portal.results.events(filters), `events:${filterKey}`);
  return (
    <Body state={state} onScope={onScope}>
      {(data) => {
        const m = (key: string) => metricOf(data.metrics, key);
        const bucket = data.scope.period.bucket;
        const series = data.series[0];
        const titles = new Map(data.top.map((item) => [item.id ?? "", tx(item.title_i18n) || t("res.untitled")]));
        return (
          <>
            <div className="rs-tiles">
              {["events_added", "events_held", "events_upcoming", "event_registrations", "event_reminders", "events_saved"].map(
                (key) => (
                  <Tile key={key} metric={key} value={m(key)} />
                ),
              )}
              <Tile metric="attendance" value={m("attendance")} note={t("res.attendanceNote")} />
            </div>
            <div className="rs-grid rs-grid-2">
              {series && (
                <ChartCard
                  title={t("res.q.eventsTrend")}
                  wide
                  note={t(`res.bucket.${bucket}` as MessageKey)}
                  table={hasPoints(series) && <SeriesTable series={series} bucket={bucket} label={t("res.q.eventsTrend")} />}
                >
                  <ColumnChart series={series} bucket={bucket} />
                </ChartCard>
              )}
              <ChartCard title={t("res.q.eventTypes")}>
                <BarList
                  groups={data.by_type}
                  label={t("res.q.eventTypes")}
                  empty={t("res.list.empty")}
                  name={(key) => t(typeKey(key))}
                />
              </ChartCard>
              <ChartCard title={t("res.q.eventFormat")}>
                <BarList
                  groups={data.by_format}
                  label={t("res.q.eventFormat")}
                  empty={t("res.list.empty")}
                  name={(key) => (key === "unknown" ? t("res.unknown") : t(`ev.format.${key}` as MessageKey))}
                />
              </ChartCard>
              <ChartCard title={t("res.q.topEvents")} wide>
                <BarList
                  groups={data.top.map((item) => ({ key: item.id ?? "", value: item.value, suppressed: false }))}
                  label={t("res.q.topEvents")}
                  empty={t("res.list.empty")}
                  name={(key) => titles.get(key) ?? key}
                  href={(key) => (key ? `/tadbirlar/${key}` : null)}
                />
              </ChartCard>
            </div>
          </>
        );
      }}
    </Body>
  );
}
