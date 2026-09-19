/**
 * How a listing reads — pure functions, no React.
 *
 * The server decides every fact: whether a listing is open, whether she may
 * apply, what her application's status is. What is decided here is only the
 * wording, so the same fact always reads the same way on the card, on the
 * listing page and in the tracker. Kept free of React so it can be tested.
 */

import type { MessageKey } from "@/i18n/messages";
import type {
  ApplicationRecord,
  ApplicationStatus,
  Eligibility,
  OpportunityCard,
} from "@/services/portal";

/** `{name}` placeholders, the convention the whole message catalogue uses. */
export function fill(text: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (out, [name, value]) => out.split(`{${name}}`).join(String(value)),
    text,
  );
}

const DAY = 86_400_000;

/** The deadline line, as a key and its numbers. `now` is passed in so the
 *  wording can be tested without a clock. */
export function deadlineLine(
  item: Pick<OpportunityCard, "deadline" | "is_open">,
  now: number = Date.now(),
): { key: MessageKey; values: Record<string, number> } {
  if (!item.is_open) return { key: "job.isClosed", values: {} };
  if (!item.deadline) return { key: "job.noDeadline", values: {} };
  const left = Math.ceil((new Date(item.deadline).getTime() - now) / DAY);
  if (left <= 1) return { key: "job.lastDay", values: {} };
  return { key: "job.daysLeft", values: { n: left } };
}

export const statusKey = (status: ApplicationStatus) => `job.st.${status}` as MessageKey;

/** Why she cannot apply, in a sentence — or null when she can. */
export function ineligibleReason(
  eligibility: Eligibility | null,
): { key: MessageKey; values: Record<string, number> } | null {
  if (!eligibility || eligibility.may_apply || !eligibility.reason) return null;
  return {
    key: `job.why.${eligibility.reason}` as MessageKey,
    values: {
      ...(eligibility.age_min !== null ? { min: eligibility.age_min } : {}),
      ...(eligibility.age_max !== null ? { max: eligibility.age_max } : {}),
    },
  };
}

/** Where an application stands on the three-step track: sent, under review,
 *  decided. A withdrawn one is off the track; the tracker says so in words. */
export type TrackStep = "sent" | "review" | "decision";
export const TRACK: readonly TrackStep[] = ["sent", "review", "decision"];

export function trackPosition(status: ApplicationStatus): number {
  switch (status) {
    case "submitted":
      return 0;
    case "in_review":
      return 1;
    case "accepted":
    case "rejected":
      return 2;
    default:
      return -1;
  }
}

/** The date an application reached a status, from its own history. */
export function reachedAt(application: ApplicationRecord, status: ApplicationStatus): string | null {
  const entry = [...application.status_history].reverse().find((item) => item.status === status);
  return entry?.at ?? null;
}

/** A partner's reward field, read the way the old catalogue read it: a salary
 *  range, an amount, a stipend, or the first text value it carries. The
 *  currency is a unit, not a value: `{volume, currency}` states no reward. */
export function rewardText(
  value: Record<string, unknown>,
  money: (amount: number) => string,
): string | null {
  if (typeof value.salary_from === "number") {
    const to = typeof value.salary_to === "number" ? ` – ${money(value.salary_to)}` : "";
    return `${money(value.salary_from)}${to}`;
  }
  if (typeof value.amount === "number") return money(value.amount);
  if (typeof value.stipend === "number") return money(value.stipend);
  const first = Object.entries(value).find(
    ([key, entry]) => key !== "currency" && typeof entry === "string" && entry.trim(),
  );
  return first ? String(first[1]) : null;
}

/** How many filters are on, for the "Filters (n)" button. */
export function activeFilters(filters: {
  type?: string | null;
  region?: string | null;
  skill?: string | null;
  closed?: boolean;
}): number {
  return [filters.type, filters.region, filters.skill, filters.closed].filter(Boolean).length;
}
