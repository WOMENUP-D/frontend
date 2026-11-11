/** Display helpers. Label maps live in the i18n catalogue, not here. */

import type { MessageKey } from "@/i18n";
import { currencyUnit, formatAmount } from "@/components/vacancies/format";

export const dimensionKey = (v: string) => `dim.${v}` as MessageKey;
export const categoryKey = (v: string) => `cat.${v}` as MessageKey;
export const formatKey = (v: string) => `fmt.${v}` as MessageKey;
export const sourceKey = (v: string) => `src.${v}` as MessageKey;
export const typeKey = (v: string) => `typ.${v}` as MessageKey;
export const regionKey = (v: string) => `reg.${v}` as MessageKey;

/** The fourteen regions, in the order the region pickers list them. */
export const REGIONS = [
  "tashkent_city", "tashkent_region", "andijan", "bukhara", "fergana",
  "jizzakh", "karakalpakstan", "kashkadarya", "khorezm", "namangan",
  "navoi", "samarkand", "sirdarya", "surkhandarya",
] as const;
export const kpiKey = (v: string) => `kpi.${v}` as MessageKey;

/** How well a skill is backed: stated, learned, assessed, verified. */
export const skillStatusKey = (v: string) => `skill.status.${v}` as MessageKey;
/** What backs it: a course, a certificate, a mentor. */
export const evidenceKindKey = (v: string) => `skill.ev.${v}` as MessageKey;
/** Skill level shares the learning section's vocabulary — one set of words
 *  covers a course and the skill it teaches. */
export const proficiencyKey = (v: string) => `lms.level.${v}` as MessageKey;

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

/** "12 000 000 söm" — thousands separated by spaces in every language, never
 *  scientific notation, and the unit from the dictionary (`money.uzs`) so it
 *  follows the alphabet: söm / сўм / сум / UZS. */
export function money(amount: number, currency = "UZS", locale = "uz"): string {
  return `${formatAmount(amount)} ${currencyUnit(currency, locale)}`;
}

/** A range with the unit written once: "4 500 000 – 7 000 000 söm". */
export function moneyRange(from: number, to: number | null, currency = "UZS", locale = "uz"): string {
  if (to === null || to === undefined) return money(from, currency, locale);
  return `${formatAmount(from)} – ${money(to, currency, locale)}`;
}

export function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

/** Which plural form of a key family a count takes — see `@/i18n/core`. */
export { pluralKey } from "@/i18n/core";
