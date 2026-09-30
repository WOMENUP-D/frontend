/**
 * How a business listing reads — pure functions, no React.
 *
 * The server decides every fact: which listings are shown to her, why, and
 * whether she may apply. What is decided here is only the wording, so that a
 * reason reads the same on every card and can be tested without a browser.
 */

import type { MessageKey } from "@/i18n/messages";
import type { Eligibility, MatchReason } from "@/services/portal";

/** The kinds a business listing can be. Anything else has no plain meaning here. */
export const BUSINESS_KINDS = [
  "grant",
  "investment",
  "mentorship",
  "marketplace",
  "competition",
  "consultation",
  "training",
] as const;

/** "Money for your business idea that you don't pay back" — or null for a
 *  kind that is not a business kind (a vacancy explains itself). */
export function kindMeaningKey(type: string): MessageKey | null {
  return (BUSINESS_KINDS as readonly string[]).includes(type)
    ? (`biz.kind.${type}` as MessageKey)
    : null;
}

/** Where she stands, in three words: may apply, should check, may not. */
export type ApplyState = "can" | "check" | "cannot" | "closed";

export function applyState(
  eligibility: Eligibility | null,
  isOpen: boolean,
): ApplyState {
  if (!isOpen) return "closed";
  if (!eligibility) return "check";
  if (!eligibility.may_apply) return "cannot";
  return eligibility.status === "eligible" ? "can" : "check";
}

export const APPLY_STATE_KEY: Record<ApplyState, MessageKey> = {
  can: "biz.canApply",
  check: "biz.checkRules",
  cannot: "biz.cannotApply",
  closed: "biz.state.closed",
};

/**
 * One reason, as a message key and its values. `name` resolves a localized
 * record (a skill's or a direction's name) — passed in so this stays pure.
 * Returns null for a reason this page does not word.
 */
export function reasonLine(
  reason: MatchReason,
  name: (value: Record<string, string>) => string,
): { key: MessageKey; values: Record<string, string | number> } | null {
  switch (reason.kind) {
    case "skill":
      return reason.skill
        ? { key: "biz.reason.skill", values: { skill: name(reason.skill.name_i18n) || reason.skill.label } }
        : null;
    case "interest":
      return reason.skill
        ? { key: "biz.reason.interest", values: { skill: name(reason.skill.name_i18n) || reason.skill.label } }
        : null;
    case "career":
      return { key: "biz.reason.career", values: { career: name(reason.career_title_i18n) } };
    case "own_business":
      return { key: "biz.reason.own_business", values: {} };
    case "score":
      return reason.score === null ? null : { key: "biz.reason.score", values: { score: reason.score } };
    case "region":
      return { key: "biz.reason.region", values: {} };
    default:
      return null;
  }
}

/** Reasons in the order they are most persuasive: what she runs, what she
 *  chose, what she can do, what she scored, and where she lives last. */
const ORDER: MatchReason["kind"][] = ["own_business", "career", "skill", "interest", "score", "region"];

export function orderedReasons(reasons: MatchReason[]): MatchReason[] {
  return [...reasons].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

/** What would help when nothing fits — only the things she has not done. */
export function missingSignals(signals: {
  career?: boolean;
  interests?: boolean;
  score?: boolean;
}): ("career" | "profile" | "score")[] {
  const out: ("career" | "profile" | "score")[] = [];
  if (!signals.career) out.push("career");
  if (!signals.interests) out.push("profile");
  if (!signals.score) out.push("score");
  return out;
}

/**
 * The terms a listing records beside its sum, in plain words: what an
 * investment costs her (a share, a rate), a market's commission, how many
 * mentoring sessions, whether it is free. Only fields the listing carries —
 * nothing is inferred from the kind.
 */
export function rewardTerms(
  reward: Record<string, unknown>,
  money: (amount: number) => string,
): { key: MessageKey; values: Record<string, string | number> }[] {
  const num = (key: string) => (typeof reward[key] === "number" ? (reward[key] as number) : null);
  const out: { key: MessageKey; values: Record<string, string | number> }[] = [];
  const equity = num("equity_percent");
  if (equity !== null) out.push({ key: "biz.term.equity", values: { n: equity } });
  const rate = num("rate_percent");
  if (rate !== null) out.push({ key: "biz.term.rate", values: { n: rate } });
  const commission = num("commission_percent");
  if (commission !== null) {
    out.push(
      commission === 0
        ? { key: "biz.term.noCommission", values: {} }
        : { key: "biz.term.commission", values: { n: commission } },
    );
  }
  if (reward.first_month_free === true) out.push({ key: "biz.term.firstMonthFree", values: {} });
  const sessions = num("sessions");
  if (sessions !== null) out.push({ key: "biz.term.sessions", values: { n: sessions } });
  const price = num("price");
  if (price !== null) {
    out.push(
      price === 0
        ? { key: "biz.term.free", values: {} }
        : { key: "biz.term.price", values: { price: money(price) } },
    );
  }
  if (reward.repayable === true) out.push({ key: "biz.term.repayable", values: {} });
  return out;
}
