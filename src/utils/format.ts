/** Display helpers. Label maps live in the i18n catalogue, not here. */

import type { MessageKey } from "@/i18n";

export const dimensionKey = (v: string) => `dim.${v}` as MessageKey;
export const categoryKey = (v: string) => `cat.${v}` as MessageKey;
export const formatKey = (v: string) => `fmt.${v}` as MessageKey;
export const sourceKey = (v: string) => `src.${v}` as MessageKey;
export const typeKey = (v: string) => `typ.${v}` as MessageKey;
export const regionKey = (v: string) => `reg.${v}` as MessageKey;
export const kpiKey = (v: string) => `kpi.${v}` as MessageKey;

/** The interest values the onboarding stores are Uzbek phrases rather than
 *  slugs, so they need a lookup rather than a prefix. Without it they reach the
 *  screen raw — "kasb egallash" printed into a Russian interface. */
const INTEREST_KEYS: Record<string, MessageKey> = {
  "kasb egallash": "dir.work.t",
  tadbirkorlik: "dir.biz.t",
  "sogʻliq": "dir.health.t",
  "farzand tarbiyasi": "dir.family.t",
  "raqamli koʻnikmalar": "dir.digital.t",
  liderlik: "dir.lead.t",
};

/** Returns null for anything she typed herself, which must be shown as typed. */
export const interestKey = (v: string): MessageKey | null => INTEREST_KEYS[v] ?? null;

export function formatScore(value: number): string {
  return value.toFixed(1);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** "12 000 000 so'm" — thousands separated, never scientific notation. */
export function money(amount: number, currency = "UZS", locale = "uz"): string {
  const formatted = new Intl.NumberFormat("uz-UZ").format(amount);
  if (currency !== "UZS") return `${formatted} ${currency}`;
  const unit = locale === "ru" ? "сум" : locale === "en" ? "UZS" : "so'm";
  return `${formatted} ${unit}`;
}

export function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export const newsCategoryKey = (v: string) => `news.cat.${v}` as MessageKey;

/** A subject on the news-preferences screen, and the label on a "For you"
 *  chip explaining why a post is there. */
export const newsTopicKey = (v: string) => `news.topic.${v}` as MessageKey;

/** "3 kun oldin" for anything recent, a calendar date once it is not.
 *
 *  A feed is read for what is new, so the first days have to be legible at a
 *  glance; an article from March is better served by its date than by "168
 *  days ago". Falls back to the date when the locale has no relative
 *  formatter. */
export function timeAgo(iso: string | null, locale: string): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  // uz-Cyrl is a script, not a BCP-47 locale Intl knows how to format.
  const tag = locale === "uz-Cyrl" ? "uz" : locale;
  const days = Math.round((then.getTime() - Date.now()) / 86_400_000);

  if (Math.abs(days) < 30) {
    try {
      return new Intl.RelativeTimeFormat(tag, { numeric: "auto" }).format(days, "day");
    } catch {
      /* fall through to the absolute date */
    }
  }
  try {
    return then.toLocaleDateString(tag, { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return then.toISOString().slice(0, 10);
  }
}

/**
 * Picks the right noun form for a count.
 *
 * Russian needs three: one результат, two-four результата, five результатов —
 * and the rule is not "last digit", because 11 to 14 take the many-form
 * whatever they end in. Uzbek inflects the verb rather than the noun after a
 * numeral, so one form covers every count; English needs two.
 *
 * Kept here rather than in the dictionary because it is arithmetic, not
 * translation: the three Russian words live in `messages.ts` like everything
 * else, and this only decides which of them is asked for.
 */
export function pluralKey(base: string, count: number, locale: string): string {
  if (locale === "ru") {
    const mod100 = Math.abs(count) % 100;
    const mod10 = mod100 % 10;
    if (mod100 >= 11 && mod100 <= 14) return `${base}.many`;
    if (mod10 === 1) return `${base}.one`;
    if (mod10 >= 2 && mod10 <= 4) return `${base}.few`;
    return `${base}.many`;
  }
  // uz, uz-Cyrl and en all resolve on a simple one/other split; the Uzbek
  // entries carry the same word in both, which is correct for the language.
  return count === 1 ? `${base}.one` : `${base}.many`;
}
