"use client";

/**
 * The nine screens of the Analytics dashboard. Each loads its own figures from
 * its own endpoint, so one slow or failing screen never blanks the others, and
 * each says in words what it can and cannot tell you — including since when.
 */

import { useEffect, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { fill } from "@/components/jobs/format";
import {
  portal,
  type AnalyticsFilters,
  type AnalyticsScope,
  type ProgramStatSort,
  type ResultsSeries,
} from "@/services/portal";
import { Loading } from "@/components/ui";
import { BarList, ChartCard, ColumnChart, SeriesTable, TableBox } from "@/components/results/Charts";
import { bucketLabel, formatCount, formatPercent, hasPoints } from "@/components/results/model";
import { regionKey } from "@/utils/format";
import { dateText, timeText } from "@/components/events/format";
import {
  Body,
  CohortGrid,
  Failure,
  Fig,
  Figs,
  LiveLine,
  RateFig,
  RatioFig,
  Since,
  Stages,
  useLoaded,
  useName,
} from "./Parts";

export type SectionKey =
  | "overview"
  | "traffic"
  | "accounts"
  | "engagement"
  | "funnel"
  | "programs"
  | "features"
  | "activity"
  | "errors";

export interface SectionProps {
  filters: AnalyticsFilters;
  filterKey: string;
  onScope: (scope: AnalyticsScope | null) => void;
}

function useScope(scope: AnalyticsScope | null | undefined, onScope: SectionProps["onScope"]) {
  useEffect(() => onScope(scope ?? null), [scope, onScope]);
}

/** A column chart with its table twin, titled by the question it answers. */
function SeriesCard({
  series,
  scope,
  title,
  wide,
}: {
  series: ResultsSeries | undefined;
  scope: AnalyticsScope;
  title: string;
  wide?: boolean;
}) {
  const { t } = useI18n();
  if (!series) return null;
  const bucket = scope.period.bucket;
  return (
    <ChartCard
      title={title}
      wide={wide}
      note={t(`res.bucket.${bucket}` as MessageKey)}
      table={hasPoints(series) && <SeriesTable series={series} bucket={bucket} label={title} />}
    >
      <ColumnChart series={series} bucket={bucket} />
    </ChartCard>
  );
}

function PathTable({ rows, label }: { rows: { path: string; views: number; visitors: number }[]; label: string }) {
  const { t, locale } = useI18n();
  if (rows.length === 0) return <p className="rs-empty">{t("res.list.empty")}</p>;
  return (
    <TableBox label={label}>
      <table className="rs-table an-paths">
        <thead>
          <tr>
            <th scope="col">{t("an.col.page")}</th>
            <th scope="col" className="rs-num">{t("an.m.views")}</th>
            <th scope="col" className="rs-num">{t("an.m.visitors")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.path}>
              <th scope="row">
                <code>{row.path}</code>
              </th>
              <td className="rs-num">{formatCount(row.views, locale)}</td>
              <td className="rs-num">{formatCount(row.visitors, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableBox>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function OverviewSection({ filters, filterKey, onScope }: SectionProps) {
  const { t } = useI18n();
  const state = useLoaded(() => portal.analytics.overview(filters), `overview:${filterKey}`);
  useScope(state.data?.scope, onScope);
  return (
    <Body state={state}>
      {(data) => {
        const [visitors, engaged] = data.series;
        return (
          <>
            <LiveLine live={data.live} />
            <h3 className="an-h">{t("an.h.today")}</h3>
            <Figs figures={data.today} />
            <h3 className="an-h">{t("an.h.period")}</h3>
            <Figs
              figures={data.period}
              keys={["visitors", "views", "sessions", "registrations", "engaged", "accounts_total"]}
            />
            <h3 className="an-h">{t("an.h.active")}</h3>
            <p className="rs-lead-note">{t("an.active.note")}</p>
            <Figs figures={data.active} />
            <div className="rs-grid rs-grid-2">
              <SeriesCard series={visitors} scope={data.scope} title={t("an.q.visitors")} />
              <SeriesCard series={engaged} scope={data.scope} title={t("an.q.engaged")} />
            </div>
          </>
        );
      }}
    </Body>
  );
}

// ---------------------------------------------------------------------------
// Traffic
// ---------------------------------------------------------------------------

export function TrafficSection({ filters, filterKey, onScope }: SectionProps) {
  const { t } = useI18n();
  const state = useLoaded(() => portal.analytics.traffic(filters), `traffic:${filterKey}`);
  useScope(state.data?.scope, onScope);
  return (
    <Body state={state}>
      {(data) => {
        const series = Object.fromEntries(data.series.map((s) => [s.key, s]));
        const grouped = (title: string, groups: typeof data.devices, since: string | null | undefined, nameOf: (k: string) => string) => (
          <ChartCard title={title} note={<Since since={since} never={since === null && groups.length === 0} />}>
            <BarList groups={groups} label={title} empty={t("res.list.empty")} name={nameOf} />
          </ChartCard>
        );
        return (
          <>
            <p className="rs-lead-note">{t("an.traffic.note")}</p>
            <Figs figures={data.figures} />
            <div className="rs-tiles rs-tiles-rates">
              <RatioFig ratio={data.ratios.find((r) => r.key === "views_per_session")} />
            </div>
            <div className="rs-grid rs-grid-2">
              <SeriesCard series={series.visitors} scope={data.scope} title={t("an.q.visitors")} />
              <SeriesCard series={series.views} scope={data.scope} title={t("an.q.views")} />
              <SeriesCard series={series.sessions} scope={data.scope} title={t("an.q.sessions")} />
              <SeriesCard series={series.new_visitors} scope={data.scope} title={t("an.q.newVisitors")} />
            </div>
            <div className="rs-grid">
              <ChartCard title={t("an.q.pages")}>
                <PathTable rows={data.pages} label={t("an.q.pages")} />
              </ChartCard>
              <ChartCard title={t("an.q.landing")} note={<Since since={data.collected.sessions} />}>
                <PathTable rows={data.landing} label={t("an.q.landing")} />
              </ChartCard>
              <ChartCard title={t("an.q.exits")} note={<Since since={data.collected.sessions} />}>
                <PathTable rows={data.exits} label={t("an.q.exits")} />
              </ChartCard>
            </div>
            <div className="rs-grid">
              {grouped(t("an.q.referrers"), data.referrers, data.collected.referrers, (k) => k)}
              {grouped(t("an.q.devices"), data.devices, data.collected.devices, (k) =>
                k in { mobile: 1, tablet: 1, desktop: 1, bot: 1 } ? t(`an.device.${k}` as MessageKey) : k,
              )}
              {grouped(t("an.q.browsers"), data.browsers, data.collected.devices, (k) => k)}
              {grouped(t("an.q.systems"), data.systems, data.collected.devices, (k) => k)}
              {grouped(t("an.q.locales"), data.locales, undefined, (k) => k.toUpperCase())}
            </div>
            <p className="rs-privacy">{t("an.traffic.privacy")}</p>
          </>
        );
      }}
    </Body>
  );
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export function AccountsSection({ filters, filterKey, onScope }: SectionProps) {
  const { t } = useI18n();
  const state = useLoaded(() => portal.analytics.accounts(filters), `accounts:${filterKey}`);
  useScope(state.data?.scope, onScope);
  return (
    <Body state={state}>
      {(data) => (
        <>
          <p className="rs-lead-note">{t("an.accounts.note")}</p>
          <Figs figures={data.figures} />
          <div className="rs-tiles rs-tiles-rates">
            {data.rates.map((rate) => (
              <RateFig key={rate.key} rate={rate} />
            ))}
          </div>
          <div className="rs-grid rs-grid-2">
            <SeriesCard series={data.series[0]} scope={data.scope} title={t("res.q.registrations")} wide />
            <ChartCard title={t("an.q.registrationFunnel")} note={t("an.funnel.sinceNote")}>
              <Stages stages={data.registration} label={t("an.q.registrationFunnel")} />
            </ChartCard>
            <ChartCard title={t("an.q.byProvider")}>
              <BarList
                groups={data.by_provider}
                label={t("an.q.byProvider")}
                empty={t("res.list.empty")}
                name={(k) => t(`an.provider.${k}` as MessageKey)}
              />
            </ChartCard>
            <ChartCard title={t("an.q.byStatus")}>
              <BarList
                groups={data.by_status}
                ordinal
                label={t("an.q.byStatus")}
                empty={t("res.list.empty")}
                name={(k) => t(`an.status.${k}` as MessageKey)}
              />
            </ChartCard>
            <ChartCard title={t("an.q.byLanguage")}>
              <BarList
                groups={data.by_language}
                label={t("an.q.byLanguage")}
                empty={t("res.list.empty")}
                name={(k) => k.toUpperCase()}
              />
            </ChartCard>
          </div>
        </>
      )}
    </Body>
  );
}

// ---------------------------------------------------------------------------
// Engagement
// ---------------------------------------------------------------------------

export function EngagementSection({ filters, filterKey, onScope }: SectionProps) {
  const { t, locale } = useI18n();
  const state = useLoaded(() => portal.analytics.engagement(filters), `engagement:${filterKey}`);
  useScope(state.data?.scope, onScope);
  return (
    <Body state={state}>
      {(data) => {
        const series = Object.fromEntries(data.series.map((s) => [s.key, s]));
        return (
          <>
            <p className="rs-lead-note">{t("an.active.note")}</p>
            <h3 className="an-h">{t("an.h.engaged")}</h3>
            <Figs figures={data.active} keys={["engaged_1d", "engaged_7d", "engaged_30d", "engaged_users"]} />
            <h3 className="an-h">{t("an.h.visited")}</h3>
            <Figs figures={data.active} keys={["visited_1d", "visited_7d", "visited_30d", "visited_users"]} />
            <div className="rs-tiles">
              <Fig figure={data.returning} />
            </div>
            <div className="rs-grid rs-grid-2">
              <SeriesCard series={series.engaged_users} scope={data.scope} title={t("an.q.engaged")} />
              <SeriesCard series={series.visited_users} scope={data.scope} title={t("an.q.visited")} />
            </div>
            <ChartCard
              title={t("an.q.retention")}
              wide
              note={
                data.visits_since
                  ? fill(t("an.retention.note"), {
                      date: bucketLabel(data.visits_since, "day", locale).long,
                    })
                  : t("an.retention.noteNoVisits")
              }
            >
              <CohortGrid cohorts={data.cohorts} />
            </ChartCard>
          </>
        );
      }}
    </Body>
  );
}

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------

export function FunnelSection({ filters, filterKey, onScope }: SectionProps) {
  const { t } = useI18n();
  const state = useLoaded(() => portal.analytics.funnel(filters), `funnel:${filterKey}`);
  useScope(state.data?.scope, onScope);
  return (
    <Body state={state}>
      {(data) => (
        <>
          <p className="rs-lead-note">{t("an.funnel.note")}</p>
          <div className="rs-grid">
            <ChartCard title={t("an.q.acquisition")} note={t("an.funnel.acquisitionNote")}>
              <Stages stages={data.acquisition} label={t("an.q.acquisition")} />
            </ChartCard>
            <ChartCard title={t("an.q.diagnostic")} note={t("an.funnel.diagnosticNote")}>
              <Stages stages={data.diagnostic} label={t("an.q.diagnostic")} />
            </ChartCard>
          </div>
          <ChartCard title={t("an.q.journey")} wide note={t("an.funnel.journeyNote")}>
            <Stages stages={data.journey} label={t("an.q.journey")} />
          </ChartCard>
        </>
      )}
    </Body>
  );
}

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;
const COLUMNS: { key: ProgramStatSort | "in_progress"; label: MessageKey; sortable: boolean }[] = [
  { key: "views", label: "an.prog.views", sortable: true },
  { key: "enrolled", label: "an.prog.enrolled", sortable: true },
  { key: "started", label: "an.prog.started", sortable: true },
  { key: "in_progress", label: "an.prog.inProgress", sortable: false },
  { key: "completed", label: "an.prog.completed", sortable: true },
  { key: "completion", label: "an.prog.completion", sortable: true },
  { key: "stalled", label: "an.prog.stalled", sortable: true },
];

export function ProgramsSection({ filters, filterKey, onScope }: SectionProps) {
  const { t, tx, locale, apiLocale } = useI18n();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ProgramStatSort>("enrolled");
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
    () => portal.analytics.programs(filters, { search, sort, order, page, size: PAGE_SIZE, lang: apiLocale }),
    `programs:${filterKey}:${search}:${sort}:${order}:${page}:${apiLocale}`,
  );
  useScope(state.data?.scope, onScope);

  function sortBy(key: ProgramStatSort) {
    if (key === sort) setOrder(order === "desc" ? "asc" : "desc");
    else {
      setSort(key);
      setOrder(key === "title" ? "asc" : "desc");
    }
    setPage(1);
  }
  function sortButton(column: ProgramStatSort, label: string) {
    const on = sort === column;
    return (
      <button type="button" className={on ? "rs-sort is-on" : "rs-sort"} onClick={() => sortBy(column)}>
        {label}
        <span aria-hidden="true" className="rs-sort-mark">{on ? (order === "desc" ? "↓" : "↑") : "↕"}</span>
      </button>
    );
  }
  const ariaSort = (column: string) =>
    sort === column ? (order === "desc" ? "descending" : "ascending") : undefined;

  const data = state.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <section className="rs-card rs-card-wide rs-programmes" aria-labelledby="an-programs-title">
      <div className="rs-card-head">
        <h3 className="rs-q" id="an-programs-title">{t("an.q.programs")}</h3>
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
        state.error ? <Failure error={state.error} retry={state.retry} /> : <Loading rows={2} />
      ) : data.total === 0 ? (
        <p className="rs-empty">{search ? t("res.prog.empty") : t("res.prog.none")}</p>
      ) : (
        <div className={state.loading ? "rs-body is-stale" : "rs-body"} aria-busy={state.loading}>
          <TableBox label={t("an.q.programs")}>
            <table className="rs-table rs-prog-table">
              <thead>
                <tr>
                  <th scope="col" aria-sort={ariaSort("title")}>{sortButton("title", t("res.prog.col.title"))}</th>
                  {COLUMNS.map((column) => (
                    <th key={column.key} scope="col" className="rs-num" aria-sort={column.sortable ? ariaSort(column.key) : undefined}>
                      {column.sortable ? sortButton(column.key as ProgramStatSort, t(column.label)) : t(column.label)}
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
                    <td className="rs-num">
                      {row.views === null ? <span className="rs-muted">—</span> : (
                        <>
                          {formatCount(row.views, locale)}
                          <span className="rs-cell-note">{fill(t("an.prog.viewers"), { n: formatCount(row.viewers ?? 0, locale) })}</span>
                        </>
                      )}
                    </td>
                    <td className="rs-num">{formatCount(row.enrolled, locale)}</td>
                    <td className="rs-num">{formatCount(row.started, locale)}</td>
                    <td className="rs-num">{formatCount(row.in_progress_now, locale)}</td>
                    <td className="rs-num">{formatCount(row.completed, locale)}</td>
                    <td className="rs-num">
                      {row.completion.value === null ? <span className="rs-muted">{t("res.noData")}</span> : (
                        <>
                          {formatPercent(row.completion.value, locale)}
                          <span className="rs-cell-note">
                            {fill(t("res.ofN"), { n: formatCount(row.completion.numerator, locale), d: formatCount(row.completion.denominator, locale) })}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="rs-num">{formatCount(row.stalled, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>
          <div className="rs-pager">
            <span className="rs-muted">{fill(t("res.prog.total"), { n: formatCount(data.total, locale) })}</span>
            <div className="rs-pager-nav">
              <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("res.prog.prev")}</button>
              <span aria-live="polite">{fill(t("res.prog.page"), { page, pages })}</span>
              <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t("res.prog.next")}</button>
            </div>
          </div>
        </div>
      )}
      <p className="rs-note">
        {t("an.prog.note")} <Since since={data?.views_since} never={data !== null && data.views_since === null} />
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

export function FeaturesSection({ filters, filterKey, onScope }: SectionProps) {
  const { t } = useI18n();
  const name = useName();
  const state = useLoaded(() => portal.analytics.features(filters), `features:${filterKey}`);
  useScope(state.data?.scope, onScope);
  return (
    <Body state={state}>
      {(data) => (
        <>
          <p className="rs-lead-note">{t("an.features.note")}</p>
          <Figs figures={data.figures} />
          <div className="rs-grid rs-grid-2">
            <SeriesCard series={data.series[0]} scope={data.scope} title={t("an.q.aiRequests")} />
            <ChartCard title={t("an.q.aiByFeature")}>
              <BarList
                groups={data.ai_by_feature}
                label={t("an.q.aiByFeature")}
                empty={t("res.list.empty")}
                name={(k) => name("an.ev", `ai_${k}`, k)}
              />
            </ChartCard>
          </div>
        </>
      )}
    </Body>
  );
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

const TIMELINE = [
  "registration_completed",
  "onboarding_completed",
  "development_test_completed",
  "program_enrolled",
  "lesson_completed",
  "program_completed",
  "plan_generated",
  "plan_accepted",
  "cv_updated",
  "ai_assistant_used",
] as const;

export function ActivitySection({ filters, filterKey, onScope }: SectionProps) {
  const { t, tx, locale } = useI18n();
  const name = useName();
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [filterKey, kind]);
  const state = useLoaded(
    () => portal.analytics.activity(filters, { page, size: 30, name: kind || undefined }),
    `activity:${filterKey}:${kind}:${page}`,
  );
  useScope(state.data?.scope, onScope);
  const data = state.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;
  return (
    <section className="rs-card rs-card-wide" aria-labelledby="an-activity-title">
      <div className="rs-card-head">
        <h3 className="rs-q" id="an-activity-title">{t("an.q.activity")}</h3>
        <label className="rs-field">
          <span className="sr-only">{t("an.activity.kind")}</span>
          <select className="input" value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="">{t("an.activity.all")}</option>
            {TIMELINE.map((key) => (
              <option key={key} value={key}>{name("an.ev", key)}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="rs-lead-note">
        {t("an.activity.note")} <Since since={data?.since} never={data !== null && data.since === null} />
      </p>
      {data === null ? (
        state.error ? <Failure error={state.error} retry={state.retry} /> : <Loading rows={3} />
      ) : data.items.length === 0 ? (
        <p className="rs-empty">{t("an.activity.empty")}</p>
      ) : (
        <div className={state.loading ? "rs-body is-stale" : "rs-body"} aria-busy={state.loading}>
          <ol className="an-timeline">
            {data.items.map((item) => (
              <li key={item.id} className="an-event">
                <time dateTime={item.occurred_at} className="an-event-when">
                  {dateText(item.occurred_at, locale)} · {timeText(item.occurred_at, locale)}
                </time>
                <span className="an-event-body">
                  <span className="an-event-name">{name("an.ev", item.name)}</span>
                  {item.title_i18n && <span className="an-event-title">{tx(item.title_i18n)}</span>}
                  {"section" in item.properties && (
                    <span className="an-event-title">{name("an.ev", `ai_${String(item.properties.section)}`, String(item.properties.section))}</span>
                  )}
                </span>
                <span className="an-event-meta">
                  {item.actor && <span className="an-actor" title={t("an.activity.actorHint")}>{item.actor}</span>}
                  {item.region && <span>{t(regionKey(item.region))}</span>}
                </span>
              </li>
            ))}
          </ol>
          <div className="rs-pager">
            <span className="rs-muted">{fill(t("an.activity.total"), { n: formatCount(data.total, locale) })}</span>
            <div className="rs-pager-nav">
              <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("res.prog.prev")}</button>
              <span aria-live="polite">{fill(t("res.prog.page"), { page, pages })}</span>
              <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t("res.prog.next")}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export function ErrorsSection({ filters, filterKey, onScope }: SectionProps) {
  const { t } = useI18n();
  const state = useLoaded(() => portal.analytics.errors(filters), `errors:${filterKey}`);
  useScope(state.data?.scope, onScope);
  return (
    <Body state={state}>
      {(data) => {
        const series = Object.fromEntries(data.series.map((s) => [s.key, s]));
        return (
          <>
            <p className="rs-lead-note">
              {t("an.errors.note")} <Since since={data.since} never={data.since === null} />
            </p>
            <Figs figures={data.figures} />
            <div className="rs-grid rs-grid-2">
              <SeriesCard series={series.api_errors} scope={data.scope} title={t("an.q.apiErrors")} />
              <SeriesCard series={series.client_errors} scope={data.scope} title={t("an.q.clientErrors")} />
              <ChartCard title={t("an.q.byRoute")}>
                <BarList groups={data.by_route} label={t("an.q.byRoute")} empty={t("an.errors.none")} name={(k) => k} />
              </ChartCard>
              <ChartCard title={t("an.q.byStatus")}>
                <BarList groups={data.by_status} label={t("an.q.byStatus")} empty={t("an.errors.none")} name={(k) => k} />
              </ChartCard>
            </div>
          </>
        );
      }}
    </Body>
  );
}
