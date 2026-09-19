/**
 * The Results dashboard's arithmetic and wording — pure functions, no React.
 *
 * The server does every count; this file only decides what the browser asks
 * for (a period, in Tashkent days) and how an answer is read (axis ticks,
 * the order of a list, a date under a bar). Nothing here computes a figure
 * from records: the browser never sees a record.
 */

import type { ResultsBucket, ResultsGroup, ResultsMetric, ResultsRate } from "@/services/portal";
import { dateText, dayKey, intlLocale, leaf, monthTitle } from "@/components/events/format";

/** The platform's day. A period is whole days here, whatever the browser's zone. */
export const TZ = "Asia/Tashkent";

export type Preset = "today" | "7" | "30" | "90" | "year" | "all" | "custom";
export const PRESETS: readonly Preset[] = ["today", "7", "30", "90", "year", "all", "custom"];

export interface Period {
  date_from?: string;
  date_to?: string;
}

/** Today in Tashkent, "2026-09-18". */
export function todayIn(now: Date = new Date()): string {
  return dayKey(now, TZ);
}

/** A calendar day moved by whole days; months and years roll over. */
export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The days a preset covers, both ends included: "7 days" is today and the six
 * before it. "All time" sends no dates at all, and a custom period sends only
 * the ends that were filled in.
 */
export function periodOf(preset: Preset, today: string, custom: Period = {}): Period {
  switch (preset) {
    case "today":
      return { date_from: today, date_to: today };
    case "7":
    case "30":
    case "90":
      return { date_from: shiftDay(today, 1 - Number(preset)), date_to: today };
    case "year":
      return { date_from: `${today.slice(0, 4)}-01-01`, date_to: today };
    case "all":
      return {};
    case "custom":
      return {
        ...(custom.date_from ? { date_from: custom.date_from } : {}),
        ...(custom.date_to ? { date_to: custom.date_to } : {}),
      };
  }
}

export function isReversed(period: Period): boolean {
  return Boolean(period.date_from && period.date_to && period.date_from > period.date_to);
}

/**
 * Clean, whole-number ticks from 0 to at least `max`, four or five of them —
 * counts are never fractional, so neither is an axis.
 */
export function axisTicks(max: number): number[] {
  if (max <= 0) return [0];
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(
    1,
    Math.ceil([1, 2, 2.5, 5, 10].map((s) => s * magnitude).find((s) => s >= rough) ?? rough),
  );
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let tick = 0; tick <= top; tick += step) ticks.push(tick);
  return ticks;
}

/** A metric by key; `undefined` when the response has no such metric. */
export function metricOf(metrics: ResultsMetric[], key: string): number | null | undefined {
  return metrics.find((metric) => metric.key === key)?.value;
}

export function rateOf(rates: ResultsRate[], key: string): ResultsRate | undefined {
  return rates.find((rate) => rate.key === key);
}

export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

/** A score: always one decimal, in her locale's own separator ("52,1" in Russian). */
export function formatDecimal(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

/** True when a series has anything to draw or tabulate. */
export function hasPoints(series: { points: { value: number }[] } | undefined): boolean {
  return Boolean(series && series.points.some((point) => point.value > 0));
}

/** "54.8%" — one decimal at most, and none when it is whole. */
export function formatPercent(value: number, locale: string): string {
  return `${new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 1 }).format(value)}%`;
}

/**
 * The order a list of groups is read in. An ordinal list (age bands, score
 * bands) keeps its own order. Any other is largest first, then the groups
 * too small to show, then the empty ones. "Unknown" always comes last: it is
 * not a place or an age, and ranking it among them would say it is.
 */
export function ordered(groups: ResultsGroup[], ordinal = false, unknown = "unknown"): ResultsGroup[] {
  const known = groups.filter((group) => group.key !== unknown);
  const tail = groups.filter((group) => group.key === unknown);
  if (ordinal) return [...known, ...tail];
  const rank = (group: ResultsGroup) => (group.suppressed ? -1 : (group.value ?? 0) === 0 ? -2 : group.value ?? 0);
  return [...[...known].sort((a, b) => rank(b) - rank(a)), ...tail];
}

/** The largest shown value in a list — suppressed groups have none. */
export function largest(groups: { value: number | null }[]): number {
  return Math.max(0, ...groups.map((group) => group.value ?? 0));
}

export function seriesSummary(points: { bucket: string; value: number }[]) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const peak = points.reduce<{ bucket: string; value: number } | null>(
    (best, point) => (point.value > (best?.value ?? 0) ? point : best),
    null,
  );
  return { total, peak };
}

/**
 * How a bucket reads: short under the axis, long in the tooltip and the
 * table. A week is named by its Monday; the caller wraps it in "week of".
 */
export function bucketLabel(bucket: string, kind: ResultsBucket, locale: string): { short: string; long: string } {
  const noon = `${bucket}T12:00:00Z`;
  const parts = leaf(noon, locale, "UTC");
  const year = bucket.slice(0, 4);
  if (kind === "month") {
    return {
      short: `${parts.month} ${year}`,
      long: monthTitle(Number(year), Number(bucket.slice(5, 7)) - 1, locale),
    };
  }
  return { short: `${parts.day} ${parts.month}`, long: `${dateText(noon, locale, "UTC")} ${year}` };
}
