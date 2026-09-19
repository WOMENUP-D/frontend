/**
 * The organisation workspace's form logic — pure functions, no React.
 *
 * A listing is edited as a flat draft of strings (what the inputs hold) and
 * turned into the API's shape here, so the rules — which kinds carry pay and
 * which an amount, how a date becomes a closing time, which errors mean what —
 * are in one place and tested without a browser. The server validates all of
 * it again; this only keeps the form honest about what it will send.
 */

import type { MessageKey } from "@/i18n/messages";
import type { ListingIn, OrgListing } from "@/services/portal";

/** Kinds an organisation can publish, work first, events last. */
export const LISTING_TYPES = [
  "vacancy",
  "internship",
  "grant",
  "investment",
  "mentorship",
  "marketplace",
  "competition",
  "training",
  "consultation",
  "workshop",
  "seminar",
  "conference",
  "forum",
  "networking",
] as const;

/** Kinds that are only ever events — they need a start. */
export const EVENT_ONLY: readonly string[] = ["workshop", "seminar", "conference", "forum", "networking"];
/** Kinds that become an event when given a start. */
export const EVENT_KINDS: readonly string[] = [...EVENT_ONLY, "competition", "training", "consultation"];

/** Kinds that pay a wage, and kinds that give a sum. The rest offer neither. */
export const PAY_KINDS: readonly string[] = ["vacancy", "internship"];
export const AMOUNT_KINDS: readonly string[] = ["grant", "investment", "competition"];

export interface ListingDraft {
  type: string;
  titleUz: string;
  titleRu: string;
  titleEn: string;
  description: string;
  region: string;
  skills: string;
  salaryFrom: string;
  salaryTo: string;
  amount: string;
  ageMin: string;
  ageMax: string;
  /** yyyy-mm-dd, as a date input holds it. */
  deadline: string;
  /** yyyy-mm-ddThh:mm, as a datetime-local input holds it. */
  startsAt: string;
  endsAt: string;
  format: "" | "online" | "offline";
  venue: string;
}

export function emptyDraft(): ListingDraft {
  return {
    type: "vacancy",
    titleUz: "",
    titleRu: "",
    titleEn: "",
    description: "",
    region: "",
    skills: "",
    salaryFrom: "",
    salaryTo: "",
    amount: "",
    ageMin: "",
    ageMax: "",
    deadline: "",
    startsAt: "",
    endsAt: "",
    format: "",
    venue: "",
  };
}

const text = (value: number | undefined) => (value === undefined ? "" : String(value));

/** A local yyyy-mm-ddThh:mm for an instant, as a datetime-local input takes it. */
export function localDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${localDate(iso)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A local yyyy-mm-dd for an instant, so the date input shows her own day. */
export function localDate(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function draftFrom(listing: OrgListing): ListingDraft {
  return {
    type: listing.type,
    titleUz: listing.title_i18n.uz ?? "",
    titleRu: listing.title_i18n.ru ?? "",
    titleEn: listing.title_i18n.en ?? "",
    description: listing.description_i18n.uz ?? "",
    region: listing.region ?? "",
    skills: listing.skills.map((skill) => skill.label).join(", "),
    salaryFrom: text(listing.reward.salary_from),
    salaryTo: text(listing.reward.salary_to),
    amount: text(listing.reward.amount),
    ageMin: text(listing.eligibility.age_min),
    ageMax: text(listing.eligibility.age_max),
    deadline: listing.deadline ? localDate(listing.deadline) : "",
    startsAt: listing.starts_at ? localDateTime(listing.starts_at) : "",
    endsAt: listing.ends_at ? localDateTime(listing.ends_at) : "",
    format: listing.format ?? "",
    venue: listing.venue ?? "",
  };
}

/** A whole, non-negative number typed into a field — or nothing. */
export function wholeNumber(value: string): number | undefined {
  const cleaned = value.replace(/[\s,']/g, "");
  if (!/^\d+$/.test(cleaned)) return undefined;
  return Number(cleaned);
}

export function skillList(value: string): string[] {
  return [...new Set(value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean))];
}

/**
 * The API payload for a draft. `base` is the listing being edited: languages
 * the form does not show (a Russian description, say) are kept as they were.
 */
export function toPayload(draft: ListingDraft, base?: OrgListing | null): ListingIn {
  const titles: Record<string, string> = {};
  if (draft.titleUz.trim()) titles.uz = draft.titleUz.trim();
  if (draft.titleRu.trim()) titles.ru = draft.titleRu.trim();
  if (draft.titleEn.trim()) titles.en = draft.titleEn.trim();

  const description: Record<string, string> = { ...(base?.description_i18n ?? {}) };
  if (draft.description.trim()) description.uz = draft.description.trim();
  else delete description.uz;

  const reward: ListingIn["reward"] = {};
  if (PAY_KINDS.includes(draft.type)) {
    const from = wholeNumber(draft.salaryFrom);
    const to = wholeNumber(draft.salaryTo);
    if (from !== undefined) reward.salary_from = from;
    if (to !== undefined) reward.salary_to = to;
  }
  if (AMOUNT_KINDS.includes(draft.type)) {
    const amount = wholeNumber(draft.amount);
    if (amount !== undefined) reward.amount = amount;
  }

  const eligibility: ListingIn["eligibility"] = {};
  const min = wholeNumber(draft.ageMin);
  const max = wholeNumber(draft.ageMax);
  if (min !== undefined) eligibility.age_min = min;
  if (max !== undefined) eligibility.age_max = max;

  const event = EVENT_KINDS.includes(draft.type) && Boolean(draft.startsAt);
  return {
    type: draft.type,
    title_i18n: titles,
    description_i18n: description,
    region: draft.region || null,
    skills: skillList(draft.skills),
    reward,
    eligibility,
    // The end of the chosen day, in her own time zone. For an event, a
    // closing day that is the event's own day means "until it starts" — which
    // is what no deadline already means.
    deadline:
      draft.deadline && !(event && draft.deadline >= draft.startsAt.slice(0, 10))
        ? new Date(`${draft.deadline}T23:59:59`).toISOString()
        : null,
    starts_at: event ? new Date(draft.startsAt).toISOString() : null,
    ends_at: event && draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    format: event && draft.format ? draft.format : null,
    venue: event && draft.format !== "online" ? draft.venue.trim() || null : null,
  };
}

/** What the form can tell before sending — the same reasons the server uses. */
export function draftProblem(draft: ListingDraft, today: string): string | null {
  if (!draft.titleUz.trim() && !draft.titleRu.trim() && !draft.titleEn.trim()) return "title";
  const min = wholeNumber(draft.ageMin);
  const max = wholeNumber(draft.ageMax);
  if (min !== undefined && max !== undefined && min > max) return "age_range";
  if (draft.deadline && draft.deadline < today) return "deadline_past";
  if (EVENT_ONLY.includes(draft.type) && !draft.startsAt) return "starts_required";
  if (draft.startsAt && draft.endsAt && draft.endsAt < draft.startsAt) return "ends_before_start";
  if (draft.startsAt && draft.deadline && draft.deadline > draft.startsAt.slice(0, 10)) {
    return "deadline_after_start";
  }
  return null;
}

const KNOWN = new Set([
  "starts_required",
  "starts_past",
  "ends_before_start",
  "deadline_after_start",
  "not_an_event",
  "ends_without_start",
  "unknown_skill",
  "deadline_past",
  "title",
  "bad_url",
  "age_range",
  "already_invited",
  "too_many",
  "not_found",
]);

/**
 * An API refusal in words. The workspace's endpoints answer `{reason, …}`;
 * `unknown_skill` also names the skills, so the message can say which.
 */
export function problemMessage(
  detail: unknown,
  status: number | undefined,
): { key: MessageKey; values: Record<string, string> } {
  const body = (detail && typeof detail === "object" ? detail : {}) as {
    reason?: string;
    fields?: string[];
  };
  if (body.reason && KNOWN.has(body.reason)) {
    return {
      key: `ws.err.${body.reason}` as MessageKey,
      values: body.fields ? { fields: body.fields.join(", ") } : {},
    };
  }
  if (status === 404) return { key: "ws.err.not_found", values: {} };
  return { key: "ws.loadError", values: {} };
}

/** A pseudonym, shortened for reading. The full one is what an invitation sends. */
export function shortRef(ref: string): string {
  return ref.slice(0, 8).toUpperCase();
}
