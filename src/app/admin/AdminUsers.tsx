"use client";

/**
 * The participant roster: one row per woman, how much she uses the portal and
 * where she stands.
 *
 * Individual-level, so stricter than the dashboards. The server decides what
 * a caller may see: an administrator gets a name and a masked address, every
 * other role a pseudonymous tag; a coordinator gets her region and no picker.
 * Opening a card and exporting the table are audited on the server as access
 * to personal data, and the screen says so.
 */

import { useEffect, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { fill } from "@/components/jobs/format";
import { portal, type Roster, type RosterQuery, type RosterRow, type RosterSort } from "@/services/portal";
import { Loading } from "@/components/ui";
import { TableBox } from "@/components/results/Charts";
import { bucketLabel, formatCount, formatDecimal } from "@/components/results/model";
import { dateText } from "@/components/events/format";
import { Failure, useLoaded } from "@/components/analytics/Parts";
import { REGIONS, regionKey } from "@/utils/format";
import { AdminUserCard } from "./AdminUserCard";

const PAGE = 25;
const STATUSES = ["active", "pending", "suspended", "deleted"] as const;

const COLUMNS: { key: RosterSort | "sessions" | "diagnostics" | "ai" | "applications" | "cv" | "status"; label: MessageKey; sortable: boolean }[] = [
  { key: "status", label: "ap.colStatus", sortable: false },
  { key: "joined", label: "ros.col.joined", sortable: true },
  { key: "last_active", label: "ros.col.lastActive", sortable: true },
  { key: "active_days", label: "ros.col.activeDays", sortable: true },
  { key: "views", label: "ros.col.views", sortable: true },
  { key: "score", label: "ros.col.score", sortable: true },
  { key: "diagnostics", label: "ros.col.diagnostics", sortable: false },
  { key: "courses", label: "ros.col.courses", sortable: true },
  { key: "ai", label: "ros.col.ai", sortable: false },
  { key: "applications", label: "ros.col.applications", sortable: false },
  { key: "cv", label: "ros.col.cv", sortable: false },
];

export function AdminUsers({ canPickRegion }: { canPickRegion: boolean }) {
  const { t, locale } = useI18n();
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<RosterSort>("last_active");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => setPage(1), [region, status]);

  const params: RosterQuery = { region, status, search, sort, order, page, size: PAGE };
  const state = useLoaded(
    () => portal.roster(params),
    `roster:${region}:${status}:${search}:${sort}:${order}:${page}`,
  );
  const data: Roster | null = state.data;
  const identifiers = data?.scope.identifiers ?? false;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  function sortBy(key: RosterSort) {
    if (key === sort) setOrder(order === "desc" ? "asc" : "desc");
    else {
      setSort(key);
      setOrder(key === "name" ? "asc" : "desc");
    }
    setPage(1);
  }
  function sortButton(column: RosterSort, label: string) {
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

  async function download() {
    setExporting(true);
    setExportFailed(false);
    try {
      const csv = await portal.rosterExport({ region, status, search });
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `womanup-users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  }

  const when = (value: string | null) => (value ? dateText(value, locale) : "—");
  const who = (row: RosterRow) => (
    <span className="ros-who">
      {row.name ? <span className="ros-name">{row.name}</span> : <span className="an-actor">{row.tag}</span>}
      {row.email && <span className="ros-email">{row.email}</span>}
      {row.name && <span className="an-actor ros-tag">{row.tag}</span>}
    </span>
  );

  return (
    <div className="rs ros">
      <p className="rs-lead-note">
        {t(identifiers ? "ros.leadAdmin" : "ros.leadStaff")}{" "}
        {data?.scope.views_since && (
          <span className="an-since">
            {fill(t("ros.viewsSince"), { date: bucketLabel(data.scope.views_since, "day", locale).long })}
          </span>
        )}
      </p>

      <div className="rs-filters">
        {identifiers && (
          <label className="rs-field ros-search">
            <span>{t("ros.search")}</span>
            <input
              type="search"
              className="input"
              value={query}
              maxLength={80}
              placeholder={t("ros.searchHint")}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        )}
        {canPickRegion ? (
          <label className="rs-field">
            <span>{t("ap.colRegion")}</span>
            <select className="input" value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="">{t("ap.allRegions")}</option>
              {REGIONS.map((value) => (
                <option key={value} value={value}>{t(regionKey(value))}</option>
              ))}
            </select>
          </label>
        ) : (
          data?.scope.region && (
            <p className="rs-locked">
              <strong>{fill(t("res.regionLocked"), { region: t(regionKey(data.scope.region)) })}</strong>
              <span>{t("res.regionLockedHint")}</span>
            </p>
          )
        )}
        <label className="rs-field">
          <span>{t("ap.colStatus")}</span>
          <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{t("ros.status.all")}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>{t(`an.status.${value}` as MessageKey)}</option>
            ))}
          </select>
        </label>
        {identifiers && (
          <button type="button" className="btn btn-outline btn-sm ros-export" onClick={download} disabled={exporting}>
            {exporting ? t("res.exporting") : t("ros.export")}
          </button>
        )}
      </div>
      {exportFailed && <p className="rs-failure" role="alert">{t("res.exportError")}</p>}

      {data === null ? (
        state.error ? <Failure error={state.error} retry={state.retry} /> : <Loading rows={4} />
      ) : data.total === 0 ? (
        <p className="rs-empty">{t("ros.none")}</p>
      ) : (
        <div className={state.loading ? "rs-body is-stale" : "rs-body"} aria-busy={state.loading}>
          <TableBox label={t("ap.tabUsers")}>
            <table className="rs-table ros-table">
              <thead>
                <tr>
                  <th scope="col" aria-sort={identifiers ? ariaSort("name") : undefined}>
                    {identifiers ? sortButton("name", t("ros.col.who")) : t("ros.col.who")}
                  </th>
                  <th scope="col">{t("ap.colRegion")}</th>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={column.key === "status" ? undefined : "rs-num"}
                      aria-sort={column.sortable ? ariaSort(column.key) : undefined}
                    >
                      {column.sortable ? sortButton(column.key as RosterSort, t(column.label)) : t(column.label)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr
                    key={row.id}
                    className={open === row.id ? "ros-row is-open" : "ros-row"}
                    onClick={() => setOpen(open === row.id ? null : row.id)}
                  >
                    <th scope="row">
                      <button type="button" className="ros-open" aria-expanded={open === row.id}>
                        {who(row)}
                      </button>
                    </th>
                    <td>{row.region ? t(regionKey(row.region)) : "—"}</td>
                    <td>
                      <span className={row.status === "active" ? "badge badge-green" : "badge badge-grey"}>
                        {t(`an.status.${row.status}` as MessageKey)}
                      </span>
                    </td>
                    <td className="rs-num faint">{when(row.joined_at)}</td>
                    <td className="rs-num faint">{row.last_active_at ? when(row.last_active_at) : t("ap.never")}</td>
                    <td className="rs-num">{formatCount(row.active_days, locale)}</td>
                    <td className="rs-num">
                      {formatCount(row.views, locale)}
                      <span className="rs-cell-note">{fill(t("ros.sessions"), { n: formatCount(row.sessions, locale) })}</span>
                    </td>
                    <td className="rs-num">
                      {row.score === null ? (
                        <span className="rs-muted">—</span>
                      ) : (
                        <>
                          <strong>{formatDecimal(row.score, locale)}</strong>
                          <span className="rs-meter ros-meter" aria-hidden="true">
                            <span style={{ width: `${Math.min(100, row.score)}%` }} />
                          </span>
                        </>
                      )}
                    </td>
                    <td className="rs-num">
                      {formatCount(row.diagnostics, locale)}
                      {row.last_diagnostic_at && <span className="rs-cell-note">{when(row.last_diagnostic_at)}</span>}
                    </td>
                    <td className="rs-num">
                      {formatCount(row.courses_completed, locale)}
                      <span className="rs-cell-note">{fill(t("ros.ofEnrolled"), { n: formatCount(row.courses_enrolled, locale) })}</span>
                    </td>
                    <td className="rs-num">{formatCount(row.ai_requests, locale)}</td>
                    <td className="rs-num">{formatCount(row.applications, locale)}</td>
                    <td className="rs-num">{formatCount(row.cv_entries, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>

          {open && <AdminUserCard userId={open} onClose={() => setOpen(null)} />}

          <div className="rs-pager">
            <span className="rs-muted">{fill(t("ros.total"), { n: formatCount(data.total, locale) })}</span>
            <div className="rs-pager-nav">
              <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("res.prog.prev")}</button>
              <span aria-live="polite">{fill(t("res.prog.page"), { page, pages })}</span>
              <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t("res.prog.next")}</button>
            </div>
          </div>
        </div>
      )}
      <p className="rs-privacy">{t("ros.privacy")}</p>
    </div>
  );
}
