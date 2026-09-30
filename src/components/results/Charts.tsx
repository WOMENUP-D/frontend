"use client";

/**
 * The Results dashboard's charts. Each one answers a question, and the
 * question is its title.
 *
 * One series, one colour: the berry accent, validated for contrast on both
 * surfaces (see `.rs` in globals.css). Ordered bands use one hue light to
 * dark. Nothing is ever only a colour or only a tooltip: bar lists are tables
 * with their numbers written out, and a time chart has a table view, a
 * written summary and arrow-key reading.
 */

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { fill } from "@/components/jobs/format";
import type { DimensionReading, ResultsBucket, ResultsGroup, ResultsSeries } from "@/services/portal";
import { axisTicks, bucketLabel, formatCount, formatDecimal, largest, ordered, seriesSummary } from "./model";

/** A card whose title is the question the chart inside it answers. */
export function ChartCard({
  title,
  note,
  table,
  wide = false,
  children,
}: {
  title: string;
  note?: ReactNode;
  /** The same figures as a table; adds a "show as table" switch. */
  table?: ReactNode | false;
  wide?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const id = useId();
  const [asTable, setAsTable] = useState(false);
  return (
    <figure className={wide ? "rs-card rs-card-wide" : "rs-card"} aria-labelledby={id}>
      <figcaption className="rs-card-head">
        <h3 className="rs-q" id={id}>
          {title}
        </h3>
        {table && (
          <button
            type="button"
            className="rs-switch"
            aria-pressed={asTable}
            onClick={() => setAsTable((value) => !value)}
          >
            {asTable ? t("res.showChart") : t("res.showTable")}
          </button>
        )}
      </figcaption>
      {asTable ? table : children}
      {note && <div className="rs-note">{note}</div>}
    </figure>
  );
}

/** "12" or, for a group too small to show, "<5" with its words for a screen reader. */
export function GroupValue({ group }: { group: { value: number | null; suppressed?: boolean } }) {
  const { t, locale } = useI18n();
  if (group.suppressed || group.value === null) {
    return (
      <span className="rs-hidden-n" title={t("res.suppressed")}>
        <span aria-hidden="true">&lt;5</span>
        <span className="sr-only">{t("res.suppressed")}</span>
      </span>
    );
  }
  return <>{formatCount(group.value, locale)}</>;
}

// ---------------------------------------------------------------------------
// Counts over time
// ---------------------------------------------------------------------------

function useBucketText(bucket: ResultsBucket) {
  const { t, locale } = useI18n();
  return (day: string) => {
    const label = bucketLabel(day, bucket, locale);
    return {
      short: label.short,
      long: bucket === "week" ? fill(t("res.weekOf"), { date: label.long }) : label.long,
    };
  };
}

/** A table box that scrolls sideways on a phone — so it takes focus, and a
 *  keyboard can scroll it too. */
export function TableBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="table-scroll rs-table-box" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

/** The series as a table: the chart's accessible twin. */
export function SeriesTable({
  series,
  bucket,
  label,
}: {
  series: ResultsSeries;
  bucket: ResultsBucket;
  /** The chart's question, which names the table too. */
  label: string;
}) {
  const { t, locale } = useI18n();
  const text = useBucketText(bucket);
  return (
    <TableBox label={label}>
      <table className="rs-table">
        <thead>
          <tr>
            <th scope="col">{t("res.col.period")}</th>
            <th scope="col" className="rs-num">
              {t("res.col.count")}
            </th>
          </tr>
        </thead>
        <tbody>
          {series.points.map((point) => (
            <tr key={point.bucket}>
              <th scope="row">{text(point.bucket).long}</th>
              <td className="rs-num">{formatCount(point.value, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableBox>
  );
}

/**
 * Columns, one per day, week or month. The whole column slot is the hit
 * target, not the painted bar; the plot takes focus and the arrow keys walk
 * it, announcing each period as they go.
 */
export function ColumnChart({ series, bucket }: { series: ResultsSeries; bucket: ResultsBucket }) {
  const { t, locale } = useI18n();
  const text = useBucketText(bucket);
  const [active, setActive] = useState<number | null>(null);
  const hintId = useId();
  const points = series.points;
  const { total, peak } = seriesSummary(points);

  if (points.length === 0) return <p className="rs-empty">{t("res.chart.none")}</p>;
  if (total === 0) return <p className="rs-empty">{t("res.chart.zero")}</p>;

  const ticks = axisTicks(largest(points));
  const top = ticks[ticks.length - 1] || 1;
  const n = points.length;
  const summary = fill(t("res.chart.summary"), {
    total: formatCount(total, locale),
    peak: formatCount(peak?.value ?? 0, locale),
    when: peak ? text(peak.bucket).long : "",
  });
  const marks = n <= 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1];
  // Few wide columns: each label sits under its own column. Many narrow ones:
  // the end labels hold the plot's edges so they cannot spill out of the card.
  const pinEnds = n > 12;

  function pick(clientX: number, box: DOMRect) {
    const index = Math.floor(((clientX - box.left) / box.width) * n);
    setActive(Math.min(n - 1, Math.max(0, index)));
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const current = active ?? n - 1;
    const next =
      event.key === "ArrowRight" ? Math.min(n - 1, current + 1)
      : event.key === "ArrowLeft" ? Math.max(0, current - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? n - 1
      : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  }

  const tipAlign = active === null ? "" : active < n * 0.2 ? " is-start" : active > n * 0.8 ? " is-end" : "";

  return (
    <div className="rs-col">
      <p className="rs-summary">{summary}</p>
      <div className="rs-col-frame">
        <div className="rs-col-y" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} style={{ bottom: `${(tick / top) * 100}%` }}>
              {formatCount(tick, locale)}
            </span>
          ))}
        </div>
        <div
          className="rs-col-plot"
          role="group"
          tabIndex={0}
          aria-label={summary}
          aria-describedby={hintId}
          onPointerMove={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((value) => value ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKey}
        >
          {ticks.map((tick) => (
            <span key={tick} className="rs-gridline" style={{ bottom: `${(tick / top) * 100}%` }} aria-hidden="true" />
          ))}
          <div className="rs-col-bars" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-hidden="true">
            {points.map((point, index) => (
              <span key={point.bucket} className={index === active ? "rs-slot is-on" : "rs-slot"}>
                {point.value > 0 && <span className="rs-bar" style={{ height: `${(point.value / top) * 100}%` }} />}
              </span>
            ))}
          </div>
          {active !== null && (
            <div className={`rs-tip${tipAlign}`} style={{ left: `${((active + 0.5) / n) * 100}%` }} aria-hidden="true">
              <strong>{formatCount(points[active].value, locale)}</strong>
              <span>{text(points[active].bucket).long}</span>
            </div>
          )}
        </div>
        <div className="rs-col-x" aria-hidden="true">
          {[...new Set(marks)].map((index) => {
            const pinned = pinEnds && (index === 0 || index === n - 1);
            return (
            <span
              key={index}
              className={pinned ? (index === 0 ? "is-start" : "is-end") : ""}
              style={pinned ? undefined : { left: `${((index + 0.5) / n) * 100}%` }}
            >
              {text(points[index].bucket).short}
            </span>
            );
          })}
        </div>
      </div>
      <p id={hintId} className="sr-only">
        {t("res.chart.keys")}
      </p>
      <p className="sr-only" aria-live="polite">
        {active !== null ? `${text(points[active].bucket).long}: ${formatCount(points[active].value, locale)}` : ""}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

/**
 * Groups as horizontal bars, written as a table: the label, the bar, the
 * number. A hidden group shows "<5" and no bar — a bar would give its size
 * away. "Unknown" is grey and last: it is not a place or an age.
 */
export function BarList({
  groups,
  name,
  label,
  ordinal = false,
  empty,
  href,
}: {
  groups: ResultsGroup[];
  name: (key: string) => string;
  label: string;
  /** Keep the order given (age bands, score bands). */
  ordinal?: boolean;
  /** Said instead of the list when no group has anything in it. */
  empty?: string;
  href?: (key: string) => string | null;
}) {
  const { t } = useI18n();
  const rows = ordered(groups, ordinal);
  const max = largest(rows);
  if (empty && rows.every((group) => !group.suppressed && !group.value)) {
    return <p className="rs-empty">{empty}</p>;
  }
  return (
    <table className="rs-bl" aria-label={label}>
      <thead className="sr-only">
        <tr>
          <th scope="col">{t("res.col.group")}</th>
          <th scope="col">{t("res.col.count")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((group) => {
          const link = href?.(group.key) ?? null;
          return (
            <tr key={group.key} className={group.key === "unknown" ? "is-unknown" : undefined}>
              <th scope="row">{link ? <a href={link}>{name(group.key)}</a> : name(group.key)}</th>
              <td>
                {/* The flex box sits inside the cell: a cell that is itself a
                    flex box stops being a table cell to VoiceOver. */}
                <div className="rs-bl-cell">
                  <span className="rs-bl-track" aria-hidden="true">
                    {!group.suppressed && (group.value ?? 0) > 0 && (
                      <span className="rs-bl-fill" style={{ width: `${((group.value ?? 0) / (max || 1)) * 100}%` }} />
                    )}
                  </span>
                  <span className="rs-bl-n">
                    <GroupValue group={group} />
                  </span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Score bands per dimension
// ---------------------------------------------------------------------------

const SPLIT = ["focus", "developing", "strong"] as const;

/**
 * Each dimension's people below 40, 40-69 and 70+, as one bar split in three
 * shades of one hue. A row with a hidden band draws no bar: the other two
 * would give the hidden one away.
 */
export function SplitBars({ rows, name }: { rows: DimensionReading[]; name: (key: string) => string }) {
  const { t, locale } = useI18n();
  const words = { focus: t("res.score.focus"), developing: t("res.score.developing"), strong: t("res.score.strong") };
  return (
    <div className="rs-split">
      <ul className="rs-legend" aria-hidden="true">
        {SPLIT.map((band, index) => (
          <li key={band}>
            <span className={`rs-swatch rs-o${index + 1}`} />
            {words[band]}
          </li>
        ))}
      </ul>
      <ul className="rs-split-rows">
        {rows.map((row) => {
          const known = SPLIT.every((band) => row[band] !== null);
          const sum = SPLIT.reduce((total, band) => total + (row[band] ?? 0), 0);
          return (
            <li key={row.dimension}>
              <div className="rs-split-head">
                <span className="rs-split-name">{name(row.dimension)}</span>
                <span className="rs-split-avg">
                  {row.average === null
                    ? t("res.noData")
                    : fill(t("res.score.avgShort"), { n: formatDecimal(row.average, locale) })}
                </span>
              </div>
              {known && sum > 0 ? (
                <span className="rs-split-bar" aria-hidden="true">
                  {SPLIT.map((band, index) =>
                    (row[band] ?? 0) > 0 ? (
                      <span
                        key={band}
                        className={`rs-o${index + 1}`}
                        style={{ flexGrow: row[band] ?? 0 }}
                        title={`${words[band]}: ${formatCount(row[band] ?? 0, locale)}`}
                      />
                    ) : null,
                  )}
                </span>
              ) : (
                <span className="rs-split-hidden">{t("res.score.hiddenRow")}</span>
              )}
              <span className="sr-only">
                {SPLIT.map((band) => `${words[band]}: ${row[band] === null ? t("res.suppressed") : row[band]}`).join("; ")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The dimensions as a table — every number, hidden ones as "<5". */
export function SplitTable({ rows, name }: { rows: DimensionReading[]; name: (key: string) => string }) {
  const { t, locale } = useI18n();
  return (
    <TableBox label={t("res.q.dimensions")}>
      <table className="rs-table">
        <thead>
          <tr>
            <th scope="col">{t("res.s.score")}</th>
            <th scope="col" className="rs-num">{t("res.score.people")}</th>
            <th scope="col" className="rs-num">{t("res.score.focus")}</th>
            <th scope="col" className="rs-num">{t("res.score.developing")}</th>
            <th scope="col" className="rs-num">{t("res.score.strong")}</th>
            <th scope="col" className="rs-num">{t("res.score.average")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dimension}>
              <th scope="row">{name(row.dimension)}</th>
              <td className="rs-num">{row.people}</td>
              {SPLIT.map((band) => (
                <td key={band} className="rs-num">
                  <GroupValue group={{ value: row[band] }} />
                </td>
              ))}
              <td className="rs-num">{row.average === null ? t("res.noData") : formatDecimal(row.average, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableBox>
  );
}
