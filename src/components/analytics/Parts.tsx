"use client";

/**
 * The pieces the Analytics screens are built from, on top of the Results
 * dashboard's charts: a figure that says since when it has been recorded, a
 * live line for who is here now, a funnel read as stages, and a retention
 * grid read as cohorts.
 *
 * The same four states as Results, never confused: a count ("0" means nothing
 * happened), a rate with the two numbers it is made of, "No data" when a rate
 * has no denominator, and "Not recorded" when the platform keeps no such record
 * — or did not keep it yet, in which case the figure says since when it does.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { messages } from "@/i18n/messages";
import { fill } from "@/components/jobs/format";
import { ApiError } from "@/services/api";
import type { Cohort, Figure, LiveNow, Ratio, ResultsRate, Stage } from "@/services/portal";
import { Loading } from "@/components/ui";
import { bucketLabel, formatCount, formatPercent } from "@/components/results/model";
import { timeText } from "@/components/events/format";

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export interface Loaded<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  retry: () => void;
}

/** Loads whenever the key changes; stale figures stay dimmed until the new
 *  ones arrive, and go when loading fails. */
export function useLoaded<T>(load: () => Promise<T>, key: string): Loaded<T> {
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

export function Failure({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useI18n();
  const reason = reasonOf(error);
  const forbidden = error instanceof ApiError && error.status === 403;
  const text =
    reason === "period_reversed" ? t("res.reversed")
    : reason === "period_too_long" ? t("an.tooLong")
    : forbidden ? t("an.forbidden")
    : t("res.loadError");
  return (
    <div className="rs-failure" role="alert">
      <p>{text}</p>
      {!reason && !forbidden && (
        <button type="button" className="btn btn-outline btn-sm" onClick={retry}>
          {t("lms.err.retry")}
        </button>
      )}
    </div>
  );
}

export function Body<T>({
  state,
  children,
}: {
  state: Loaded<T>;
  children: (data: T) => ReactNode;
}) {
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

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

/** The label of a figure, stage or event by key — the raw key, spaced, when
 *  the catalogue has none, so a new server key never blanks a tile. */
export function useName() {
  const { t } = useI18n();
  return (prefix: "an.m" | "an.ev" | "an.def", key: string, fallback?: string): string => {
    const full = `${prefix}.${key}`;
    return full in messages ? t(full as MessageKey) : (fallback ?? key.replace(/_/g, " "));
  };
}

function Definition({ metric }: { metric: string }) {
  const { t } = useI18n();
  const name = useName();
  const text = name("an.def", metric, "");
  if (!text) return null;
  return (
    <details className="rs-def">
      <summary>{t("res.how")}</summary>
      <p>{text}</p>
    </details>
  );
}

/** "collected since 2 Oct 2026" — or, with no date, that it was never recorded. */
export function Since({ since, never }: { since: string | null | undefined; never?: boolean }) {
  const { t, locale } = useI18n();
  if (never) return <span className="an-since">{t("an.neverRecorded")}</span>;
  if (!since) return null;
  return (
    <span className="an-since">
      {fill(t("an.since"), { date: bucketLabel(since, "day", locale).long })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Figures
// ---------------------------------------------------------------------------

export function Fig({ figure, label }: { figure: Figure | undefined; label?: string }) {
  const { t, locale } = useI18n();
  const name = useName();
  if (!figure) return null;
  const never = figure.value === null;
  return (
    <div className={`rs-tile an-tile is-${figure.kind}`}>
      {never ? (
        <span className="rs-tile-value is-none">{t("res.notRecorded")}</span>
      ) : (
        <span className="rs-tile-value">{formatCount(figure.value as number, locale)}</span>
      )}
      <span className="rs-tile-label">{label ?? name("an.m", figure.key)}</span>
      {figure.kind === "now" && <span className="rs-tile-note">{t("an.kind.now")}</span>}
      {figure.kind === "live" && <span className="rs-tile-note">{t("an.kind.live")}</span>}
      {(figure.since || never) && (
        <span className="rs-tile-note">
          <Since since={figure.since} never={never && !figure.since} />
        </span>
      )}
      <Definition metric={figure.key} />
    </div>
  );
}

export function Figs({ figures, keys }: { figures: Figure[]; keys?: string[] }) {
  const chosen = keys ? keys.map((key) => figures.find((f) => f.key === key)) : figures;
  return (
    <div className="rs-tiles">
      {chosen.map((figure, index) => (figure ? <Fig key={figure.key} figure={figure} /> : <span key={index} />))}
    </div>
  );
}

export function RateFig({ rate }: { rate: ResultsRate | undefined }) {
  const { t, locale } = useI18n();
  const name = useName();
  if (!rate) return null;
  const share = rate.value === null ? 0 : Math.min(100, rate.value);
  return (
    <div className="rs-tile rs-tile-rate">
      {rate.value === null ? (
        <span className="rs-tile-value is-none">{t("res.noData")}</span>
      ) : (
        <span className="rs-tile-value">{formatPercent(rate.value, locale)}</span>
      )}
      <span className="rs-tile-label">{name("an.m", rate.key)}</span>
      <span className="rs-meter" aria-hidden="true">
        <span style={{ width: `${share}%` }} />
      </span>
      <span className="rs-tile-note">
        {rate.value === null
          ? t("res.noDataHint")
          : fill(t("res.ofN"), {
              n: formatCount(rate.numerator, locale),
              d: formatCount(rate.denominator, locale),
            })}
      </span>
      <Definition metric={rate.key} />
    </div>
  );
}

export function RatioFig({ ratio }: { ratio: Ratio | undefined }) {
  const { t, locale } = useI18n();
  const name = useName();
  if (!ratio) return null;
  return (
    <div className="rs-tile">
      {ratio.value === null ? (
        <span className="rs-tile-value is-none">{t("res.noData")}</span>
      ) : (
        <span className="rs-tile-value">
          {new Intl.NumberFormat(locale === "uz-Cyrl" ? "uz" : locale, { maximumFractionDigits: 1 }).format(ratio.value)}
        </span>
      )}
      <span className="rs-tile-label">{name("an.m", ratio.key)}</span>
      <span className="rs-tile-note">
        {fill(t("an.ratioOf"), {
          n: formatCount(ratio.numerator, locale),
          d: formatCount(ratio.denominator, locale),
        })}
      </span>
      <Definition metric={ratio.key} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live
// ---------------------------------------------------------------------------

/** Who is here now. The one line on the dashboard that is live rather than
 *  counted — and it says so, with the moment it was read. */
export function LiveLine({ live }: { live: LiveNow }) {
  const { t, locale } = useI18n();
  return (
    <div className="an-live" role="status">
      <span className="an-live-dot" aria-hidden="true" />
      <span className="an-live-n">{formatCount(live.online_now, locale)}</span>
      <span className="an-live-text">
        <strong>{t("an.live.online")}</strong>
        <span>
          {fill(t("an.live.detail"), {
            n: formatCount(live.online_signed_in, locale),
            min: String(live.window_minutes),
            time: timeText(live.as_of, locale),
          })}
        </span>
      </span>
      <Definition metric="online_now" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------

/**
 * Stages read top to bottom. Each bar is the stage's share of the first; the
 * figures beside it say the count and the share of the stage before. A stage
 * the platform never recorded shows no bar and says so, and the chain skips
 * over it rather than pretending it was zero.
 */
export function Stages({ stages, label }: { stages: Stage[]; label: string }) {
  const { t, locale } = useI18n();
  const name = useName();
  return (
    <ol className="an-funnel" aria-label={label}>
      {stages.map((stage, index) => {
        const never = stage.value === null;
        const width = index === 0 ? 100 : stage.of_first ?? 0;
        return (
          <li key={stage.key} className={never ? "an-stage is-none" : "an-stage"}>
            <div className="an-stage-head">
              <span className="an-stage-name">{name("an.m", stage.key)}</span>
              <span className="an-stage-n">
                {never ? t("res.notRecorded") : formatCount(stage.value as number, locale)}
              </span>
            </div>
            <span className="an-stage-bar" aria-hidden="true">
              {!never && <span style={{ width: `${Math.max(width, stage.value ? 1 : 0)}%` }} />}
            </span>
            <div className="an-stage-foot">
              {!never && index > 0 && stage.of_previous !== null && (
                <span>{fill(t("an.ofPrevious"), { p: formatPercent(stage.of_previous, locale) })}</span>
              )}
              {!never && index > 0 && stage.of_first !== null && (
                <span>{fill(t("an.ofFirst"), { p: formatPercent(stage.of_first, locale) })}</span>
              )}
              <Since since={stage.since} never={never && !stage.since} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------------

function shade(share: number | null): string {
  if (share === null) return "";
  if (share >= 60) return " an-c4";
  if (share >= 40) return " an-c3";
  if (share >= 20) return " an-c2";
  if (share > 0) return " an-c1";
  return "";
}

/**
 * Registration-week cohorts across the weeks after. Every cell carries its
 * percentage as text; the shade only helps the eye find the pattern. A week
 * that has not ended yet is drawn open, so a half-week never reads as a drop.
 */
export function CohortGrid({ cohorts }: { cohorts: Cohort[] }) {
  const { t, locale } = useI18n();
  if (cohorts.length === 0) return <p className="rs-empty">{t("an.cohorts.empty")}</p>;
  const weeks = Math.max(...cohorts.map((c) => c.cells.length));
  return (
    <div className="table-scroll rs-table-box" role="region" aria-label={t("an.q.retention")} tabIndex={0}>
      <table className="rs-table an-cohorts">
        <thead>
          <tr>
            <th scope="col">{t("an.cohorts.week")}</th>
            <th scope="col" className="rs-num">{t("an.cohorts.size")}</th>
            {Array.from({ length: weeks }, (_, week) => (
              <th key={week} scope="col" className="rs-num">
                {fill(t("an.cohorts.after"), { n: String(week) })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort.starts}>
              <th scope="row">{bucketLabel(cohort.starts, "day", locale).long}</th>
              <td className="rs-num">{formatCount(cohort.size, locale)}</td>
              {Array.from({ length: weeks }, (_, week) => {
                const cell = cohort.cells[week];
                if (!cell) return <td key={week} className="an-cell is-void" />;
                return (
                  <td
                    key={week}
                    className={`an-cell${shade(cell.share)}${cell.complete ? "" : " is-open"}`}
                    title={`${formatCount(cell.value, locale)} / ${formatCount(cohort.size, locale)}`}
                  >
                    {cell.share === null ? "—" : formatPercent(cell.share, locale)}
                    {!cell.complete && <span className="sr-only"> {t("an.cohorts.open")}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
