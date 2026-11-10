/**
 * How a marketplace vacancy reads — pure functions, no React.
 *
 * The board decides every fact; what is decided here is only the wording,
 * and the one rule the wording must keep: a salary is shown exactly as the
 * employer wrote it — a range, a lower bound, an upper bound, or "not
 * specified" — and never an estimate.
 */

import type { MessageKey } from "@/i18n/messages";
import type { VacancySalary } from "@/services/portal";

/** `{name}` placeholders, the convention the whole message catalogue uses. */
export function fill(text: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (out, [name, value]) => out.split(`{${name}}`).join(String(value)),
    text,
  );
}

/** An amount with thousands separated by spaces — "6 000 000" — whatever the
 *  reader's locale: the portal's figures are read, not pasted into a sheet. */
export function formatAmount(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 })
    .format(value)
    .replace(/[\u00a0\u202f]/g, " ");
}

/** The unit a salary is written in: so'm / сум / UZS for the national
 *  currency, the code for anything else. */
export function currencyUnit(currency: string | null, locale: string): string {
  const code = (currency ?? "UZS").toUpperCase();
  if (code !== "UZS") return code;
  return locale === "ru" ? "сум" : locale === "en" ? "UZS" : "so'm";
}

/** The salary line, as a message key and the amounts already formatted. The
 *  unit appears once, at the end: "6 000 000 – 9 000 000 сум". */
export function salaryLine(
  salary: VacancySalary | null | undefined,
  unit: (currency: string | null) => string,
): { key: MessageKey; values: Record<string, string> } {
  if (!salary || (salary.amount_from === null && salary.amount_to === null)) {
    return { key: "vac.salary.none", values: {} };
  }
  const suffix = unit(salary.currency);
  if (salary.amount_from !== null && salary.amount_to !== null) {
    return {
      key: "vac.salary.range",
      values: { from: formatAmount(salary.amount_from), to: `${formatAmount(salary.amount_to)} ${suffix}` },
    };
  }
  if (salary.amount_from !== null) {
    return { key: "vac.salary.from", values: { amount: `${formatAmount(salary.amount_from)} ${suffix}` } };
  }
  return {
    key: "vac.salary.to",
    values: { amount: `${formatAmount(salary.amount_to as number)} ${suffix}` },
  };
}

/** Uzbek month names, short — Intl has none the browsers agree on. */
const MONTHS_UZ = ["yan.", "fev.", "mart", "apr.", "may", "iyun", "iyul", "avg.", "sen.", "okt.", "noy.", "dek."];

/** "23 окт." / "23 Oct" / "23-okt." for the reader's locale. */
export function shortDate(date: Date, locale: string): string {
  if (locale === "ru") return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
  if (locale === "en") return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
  return `${date.getDate()}-${MONTHS_UZ[date.getMonth()]}`;
}

const DAY = 86_400_000;

/** When a listing was published, relative for the first week and a date
 *  after that. `now` is passed in so the wording can be tested. */
export function publishedLine(
  iso: string | null | undefined,
  now: number,
  dateFormat: (date: Date) => string,
): { key: MessageKey; values: Record<string, string | number> } | null {
  if (!iso) return null;
  const when = new Date(iso).getTime();
  if (Number.isNaN(when)) return null;
  const days = Math.floor((now - when) / DAY);
  if (days <= 0) return { key: "vac.date.today", values: {} };
  if (days === 1) return { key: "vac.date.yesterday", values: {} };
  if (days < 7) return { key: "vac.date.daysAgo", values: { n: days } };
  return { key: "vac.date.on", values: { date: dateFormat(new Date(iso)) } };
}

export const experienceKey = (id: string) => `vac.exp.${id}` as MessageKey;
export const employmentKey = (id: string) => `vac.emp.${id}` as MessageKey;
export const scheduleKey = (id: string) => `vac.sch.${id}` as MessageKey;
export const workFormatKey = (id: string) => `vac.wf.${id}` as MessageKey;
export const pickKey = (id: string) => `vac.pick.${id}` as MessageKey;
export const sortKey = (id: string) => `vac.sort.${id}` as MessageKey;
/** The board's professional categories carry stable ids; the portal names
 *  them in its own three languages where it has a name. */
export const categoryKey = (id: string) => `vac.cat.${id}` as MessageKey;

/** The filters that are "on" for the "Filters (n)" button and the active pills. */
export interface VacancyFilterState {
  region: string | null;
  salaryFrom: string | null;
  onlyWithSalary: boolean;
  experience: string | null;
  employment: string | null;
  workFormat: string | null;
  category: string | null;
}

export function activeFilterCount(state: VacancyFilterState): number {
  return [
    state.region,
    state.salaryFrom,
    state.onlyWithSalary,
    state.experience,
    state.employment,
    state.workFormat,
    state.category,
  ].filter(Boolean).length;
}

/** Reads the filters out of the address. Everything lives in the URL so a
 *  shared link, the back button and the landing's shortcuts agree. */
export function stateFromParams(params: URLSearchParams): VacancyFilterState & {
  q: string;
  sort: string | null;
  picks: string[];
} {
  return {
    q: params.get("q") ?? "",
    region: params.get("region"),
    salaryFrom: params.get("salary_from"),
    onlyWithSalary: params.get("with_salary") === "1",
    experience: params.get("experience"),
    employment: params.get("employment"),
    workFormat: params.get("work_format"),
    category: params.get("category"),
    sort: params.get("sort"),
    picks: params.getAll("pick"),
  };
}

/** The reverse: the API query for what the address says. Only values the
 *  server understands are sent; `page` is added by the caller. */
export function searchParamsFor(
  state: ReturnType<typeof stateFromParams>,
  page: number,
  perPage: number,
): URLSearchParams {
  const out = new URLSearchParams();
  if (state.q.trim()) out.set("q", state.q.trim());
  if (state.region) out.set("region", state.region);
  if (state.salaryFrom && /^\d+$/.test(state.salaryFrom)) out.set("salary_from", state.salaryFrom);
  if (state.onlyWithSalary) out.set("only_with_salary", "true");
  if (state.experience) out.set("experience", state.experience);
  if (state.employment) out.set("employment", state.employment);
  if (state.workFormat) out.set("work_format", state.workFormat);
  if (state.category) out.set("category", state.category);
  if (state.sort) out.set("sort", state.sort);
  for (const pick of state.picks) out.append("pick", pick);
  out.set("page", String(page));
  out.set("per_page", String(perPage));
  return out;
}
