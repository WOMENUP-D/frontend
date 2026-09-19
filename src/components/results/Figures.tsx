"use client";

/**
 * A figure and what it counts.
 *
 * Four states, never confused: a count ("0" is a count — nothing happened),
 * a rate with the two numbers it is made of, "No data" when a rate has no
 * denominator, and "Not recorded" when the platform keeps no such record.
 * Every tile carries its definition, one tap away.
 */

import type { ReactNode } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { fill } from "@/components/jobs/format";
import type { ResultsRate } from "@/services/portal";
import { formatCount, formatPercent } from "./model";

function Definition({ metric }: { metric: string }) {
  const { t } = useI18n();
  return (
    <details className="rs-def">
      <summary>{t("res.how")}</summary>
      <p>{t(`res.def.${metric}` as MessageKey)}</p>
    </details>
  );
}

/** A count. `null` means the platform does not record it. */
export function Tile({
  metric,
  value,
  note,
  label,
}: {
  metric: string;
  value: number | null | undefined;
  note?: ReactNode;
  /** Instead of the metric's own name, when a section needs another. */
  label?: string;
}) {
  const { t, locale } = useI18n();
  return (
    <div className="rs-tile">
      {value === null || value === undefined ? (
        <span className="rs-tile-value is-none">{t("res.notRecorded")}</span>
      ) : (
        <span className="rs-tile-value">{formatCount(value, locale)}</span>
      )}
      <span className="rs-tile-label">{label ?? t(`res.m.${metric}` as MessageKey)}</span>
      {note && <span className="rs-tile-note">{note}</span>}
      <Definition metric={metric} />
    </div>
  );
}

/** A share, always with "n of d" beneath it; "No data" over a denominator of 0. */
export function RateTile({ rate }: { rate: ResultsRate | undefined }) {
  const { t, locale } = useI18n();
  if (!rate) return null;
  const share = rate.value === null ? 0 : Math.min(100, rate.value);
  return (
    <div className="rs-tile rs-tile-rate">
      {rate.value === null ? (
        <span className="rs-tile-value is-none">{t("res.noData")}</span>
      ) : (
        <span className="rs-tile-value">{formatPercent(rate.value, locale)}</span>
      )}
      <span className="rs-tile-label">{t(`res.m.${rate.key}` as MessageKey)}</span>
      <span className="rs-meter" aria-hidden="true">
        <span style={{ width: `${share}%` }} />
      </span>
      <span className="rs-tile-note">
        {rate.value === null
          ? t("res.noDataHint")
          : fill(t("res.ofN"), { n: formatCount(rate.numerator, locale), d: formatCount(rate.denominator, locale) })}
      </span>
      <Definition metric={rate.key} />
    </div>
  );
}

/** The one number a section leads with. */
export function Hero({ metric, value, children }: { metric: string; value: number; children?: ReactNode }) {
  const { t, locale } = useI18n();
  return (
    <div className="rs-hero">
      <span className="rs-hero-value">{formatCount(value, locale)}</span>
      <div className="rs-hero-text">
        <span className="rs-hero-label">{t(`res.m.${metric}` as MessageKey)}</span>
        {children}
        <Definition metric={metric} />
      </div>
    </div>
  );
}
