/**
 * How an event reads — pure functions, no React.
 *
 * Dates are the heart of an event page, so every date on it is formatted
 * here, once, in her language: Uzbek from our own tables, Russian and English
 * through `Intl`. Times are 24-hour everywhere. The time zone is a parameter
 * so the functions can be tested; the pages pass her browser's own.
 */

import type { MessageKey } from "@/i18n/messages";
import type { EventCard, EventReason } from "@/services/portal";

/** The `Intl` locale for each of the portal's locales. */
export function intlLocale(locale: string): string {
  if (locale === "uz-Cyrl") return "uz-Cyrl";
  if (locale === "ru") return "ru";
  if (locale === "en") return "en-GB";
  return "uz-Latn";
}

/*
 * Uzbek is written from our own tables. Browsers ship Uzbek without its month
 * and weekday names — Chromium prints "M09" and "Mon" — so `Intl` is only
 * trusted for Russian and English, which every browser carries in full.
 */
const UZ = {
  "uz": {
    months: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
    short: ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"],
    days: ["dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba", "yakshanba"],
    dayShort: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
    date: (day: number, month: string) => `${day}-${month}`,
  },
  "uz-Cyrl": {
    months: ["январ", "феврал", "март", "апрел", "май", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"],
    short: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
    days: ["душанба", "сешанба", "чоршанба", "пайшанба", "жума", "шанба", "якшанба"],
    dayShort: ["Ду", "Се", "Чо", "Па", "Жу", "Ша", "Як"],
    date: (day: number, month: string) => `${day}-${month}`,
  },
} as const;

function uz(locale: string) {
  return locale === "uz-Cyrl" ? UZ["uz-Cyrl"] : locale === "ru" || locale === "en" ? null : UZ.uz;
}

/** The calendar parts of an instant in a zone, read through `en-US`, which
 *  every browser has. Weekday 0 is Monday; month 1 is January. */
function partsOf(iso: string | Date, timeZone?: string) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const out: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)) {
    out[part.type] = part.value;
  }
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(out.weekday);
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    weekday,
    hour: out.hour === "24" ? "00" : out.hour,
    minute: out.minute,
  };
}

function part(iso: string, locale: string, options: Intl.DateTimeFormatOptions, timeZone?: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone, ...options }).format(new Date(iso));
}

const cap = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

/** The three lines of a date leaf: month, day, weekday. */
export function leaf(iso: string, locale: string, timeZone?: string) {
  const table = uz(locale);
  if (table) {
    const p = partsOf(iso, timeZone);
    return { month: table.short[p.month - 1], day: String(p.day), weekday: table.dayShort[p.weekday] };
  }
  return {
    month: cap(part(iso, locale, { month: "short" }, timeZone).replace(/\.$/, "")),
    day: part(iso, locale, { day: "numeric" }, timeZone),
    weekday: cap(part(iso, locale, { weekday: "short" }, timeZone).replace(/\.$/, "")),
  };
}

export function timeText(iso: string, locale: string, timeZone?: string): string {
  const p = partsOf(iso, timeZone);
  return `${p.hour}:${p.minute}`;
}

/** "20-oktabr", "20 октября", "20 October". */
export function dateText(iso: string, locale: string, timeZone?: string): string {
  const table = uz(locale);
  if (table) {
    const p = partsOf(iso, timeZone);
    return table.date(p.day, table.months[p.month - 1]);
  }
  return part(iso, locale, { day: "numeric", month: "long" }, timeZone);
}

/** "Seshanba, 20-oktabr" — for the page, where there is room for the weekday. */
export function longDate(iso: string, locale: string, timeZone?: string): string {
  const table = uz(locale);
  if (table) {
    const p = partsOf(iso, timeZone);
    return cap(`${table.days[p.weekday]}, ${table.date(p.day, table.months[p.month - 1])}`);
  }
  return cap(part(iso, locale, { weekday: "long", day: "numeric", month: "long" }, timeZone));
}

/** A local calendar day, "2026-10-20", in the given zone. */
export function dayKey(iso: string | Date, timeZone?: string): string {
  const p = partsOf(iso, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/**
 * When it happens, in one line: "20-oktabr, 10:00–13:00" on one day, or both
 * ends written out when it runs over several.
 */
export function whenLine(
  start: string,
  end: string | null,
  locale: string,
  timeZone?: string,
): string {
  const from = `${dateText(start, locale, timeZone)}, ${timeText(start, locale, timeZone)}`;
  if (!end) return from;
  if (dayKey(start, timeZone) === dayKey(end, timeZone)) {
    return `${from}–${timeText(end, locale, timeZone)}`;
  }
  return `${from} — ${dateText(end, locale, timeZone)}, ${timeText(end, locale, timeZone)}`;
}

/** Who it is for, from the age range the organiser states. No range means
 *  adults: the platform's one age rule shows a girl only events that say so. */
export function forWhom(
  item: Pick<EventCard, "age_min" | "age_max">,
): { key: MessageKey; values: Record<string, number> } {
  const min = item.age_min;
  const max = item.age_max;
  if (min !== null && max !== null) return { key: "ev.forRange", values: { min, max } };
  if (min !== null) return { key: "ev.forFrom", values: { min } };
  if (max !== null) return { key: "ev.forTo", values: { max } };
  return { key: "ev.forAdults", values: {} };
}

/** Where a listing's page is: an event under /tadbirlar, the rest under
 *  /imkoniyatlar. */
export function listingHref(item: { id: string; starts_at?: string | null }): string {
  return item.starts_at ? `/tadbirlar/${item.id}` : `/imkoniyatlar/${item.id}`;
}

/** One reason, as a message key and its values. `name` resolves a localized
 *  record; `dimension` names a Development Score area. */
export function reasonLine(
  reason: EventReason,
  name: (value: Record<string, string>) => string,
  dimension: (value: string) => string,
): { key: MessageKey; values: Record<string, string | number> } | null {
  const skill = reason.skill ? name(reason.skill.name_i18n) || reason.skill.label : "";
  switch (reason.kind) {
    case "career":
      return { key: "ev.reason.career", values: { career: name(reason.career_title_i18n), skill } };
    case "learning":
      return { key: "ev.reason.learning", values: { course: name(reason.program_title_i18n), skill } };
    case "skill":
      return skill ? { key: "ev.reason.skill", values: { skill } } : null;
    case "interest":
      return skill ? { key: "ev.reason.interest", values: { skill } } : null;
    case "score":
      return reason.score === null || !reason.dimension
        ? null
        : {
            key: "ev.reason.score",
            values: { dimension: dimension(reason.dimension), score: reason.score, skill },
          };
    case "own_business":
      return { key: "ev.reason.own_business", values: {} };
    case "region":
      return { key: "ev.reason.region", values: {} };
    default:
      return null;
  }
}

/* ---- the calendar ------------------------------------------------------ */

export interface GridDay {
  /** "2026-10-20" */
  key: string;
  day: number;
  inMonth: boolean;
}

/** Six weeks, Monday first, always 42 days — so paging a month never makes the
 *  grid grow or shrink under her finger. `month` is 0-based. */
export function monthGrid(year: number, month: number): GridDay[] {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = Date.UTC(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start + index * 86_400_000);
    return {
      key: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
    };
  });
}

/** The days an event covers, in the given zone — a forum over three days is
 *  marked on all three. */
export function daysOf(
  item: Pick<EventCard, "starts_at" | "ends_at">,
  timeZone?: string,
): string[] {
  const first = dayKey(item.starts_at, timeZone);
  const last = item.ends_at ? dayKey(item.ends_at, timeZone) : first;
  const out: string[] = [];
  let cursor = Date.parse(`${first}T00:00:00Z`);
  const stop = Date.parse(`${last}T00:00:00Z`);
  while (cursor <= stop && out.length < 31) {
    out.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }
  return out;
}

/** "Oktabr 2026". */
export function monthTitle(year: number, month: number, locale: string): string {
  const table = uz(locale);
  if (table) return `${cap(table.months[month])} ${year}`;
  const date = new Date(Date.UTC(year, month, 15));
  return cap(
    new Intl.DateTimeFormat(intlLocale(locale), {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    }).format(date),
  );
}

/** Monday to Sunday, short, in her language. */
export function weekdayNames(locale: string): string[] {
  const table = uz(locale);
  if (table) return [...table.dayShort];
  // 2026-09-14 is a Monday.
  return Array.from({ length: 7 }, (_, index) =>
    cap(
      new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", weekday: "short" })
        .format(new Date(Date.UTC(2026, 8, 14 + index)))
        .replace(/\.$/, ""),
    ),
  );
}

/** Events grouped by the month they start in, in order. */
export function byMonth<T extends Pick<EventCard, "starts_at">>(
  items: T[],
  timeZone?: string,
): { key: string; year: number; month: number; items: T[] }[] {
  const groups: { key: string; year: number; month: number; items: T[] }[] = [];
  for (const item of items) {
    const key = dayKey(item.starts_at, timeZone).slice(0, 7);
    let group = groups.find((entry) => entry.key === key);
    if (!group) {
      const [year, month] = key.split("-").map(Number);
      group = { key, year, month: month - 1, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

/* ---- her own calendar -------------------------------------------------- */

function icsTime(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/**
 * A calendar file for one event, so her phone reminds her with its own
 * alarm. Only the event's own facts go in: title, time, place, page link.
 */
export function ics(event: {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  place: string;
  url: string;
}): string {
  const end = event.ends_at ?? new Date(Date.parse(event.starts_at) + 3_600_000).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WomanUP//Events//UZ",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@womanup.uz`,
    `DTSTAMP:${icsTime(event.starts_at)}`,
    `DTSTART:${icsTime(event.starts_at)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${icsText(event.title)}`,
    ...(event.place ? [`LOCATION:${icsText(event.place)}`] : []),
    `URL:${event.url}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
