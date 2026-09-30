/**
 * How an event reads: dates in her language, a calendar that never jumps,
 * "who is it for" from the organiser's own age range, and a calendar file
 * with nothing in it but the event's facts.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { messages } from "@/i18n/messages";
import type { EventReason } from "@/services/portal";
import {
  byMonth,
  dateText,
  dayKey,
  daysOf,
  forWhom,
  ics,
  leaf,
  listingHref,
  longDate,
  monthGrid,
  monthTitle,
  reasonLine,
  weekdayNames,
  whenLine,
} from "./format";

const TZ = "Asia/Tashkent";
const START = "2026-10-20T05:00:00Z"; // 10:00 in Tashkent, a Tuesday

test("the leaf reads month, day and weekday in her language", () => {
  assert.deepEqual(leaf(START, "uz", TZ), { month: "Okt", day: "20", weekday: "Se" });
  assert.deepEqual(leaf(START, "uz-Cyrl", TZ), { month: "Окт", day: "20", weekday: "Се" });
  assert.deepEqual(leaf(START, "en", TZ), { month: "Oct", day: "20", weekday: "Tue" });
  assert.equal(leaf(START, "ru", TZ).day, "20");
});

test("one line says when: a range on one day, both ends across days", () => {
  assert.equal(whenLine(START, "2026-10-20T08:00:00Z", "uz", TZ), "20-oktabr, 10:00–13:00");
  assert.equal(
    whenLine(START, "2026-10-22T13:00:00Z", "en", TZ),
    "20 October, 10:00 — 22 October, 18:00",
  );
  assert.equal(whenLine(START, null, "ru", TZ), "20 октября, 10:00");
  assert.equal(dateText(START, "en", TZ), "20 October");
  assert.equal(longDate(START, "uz", TZ), "Seshanba, 20-oktabr");
  assert.equal(longDate(START, "uz-Cyrl", TZ), "Сешанба, 20-октябр");
});

test("a day is her local day, not the server's", () => {
  // 21:00 UTC on the 19th is already the 20th in Tashkent.
  assert.equal(dayKey("2026-10-19T21:00:00Z", TZ), "2026-10-20");
  assert.deepEqual(daysOf({ starts_at: START, ends_at: "2026-10-22T13:00:00Z" }, TZ), [
    "2026-10-20",
    "2026-10-21",
    "2026-10-22",
  ]);
});

test("the month is always six weeks, Monday first", () => {
  const grid = monthGrid(2026, 9); // October 2026 starts on a Thursday
  assert.equal(grid.length, 42);
  assert.equal(grid[0].key, "2026-09-28");
  assert.equal(grid.find((day) => day.inMonth)?.key, "2026-10-01");
  assert.equal(grid.filter((day) => day.inMonth).length, 31);
  assert.equal(weekdayNames("en")[0], "Mon");
  assert.equal(monthTitle(2026, 9, "uz"), "Oktabr 2026");
  assert.equal(weekdayNames("uz")[0], "Du");
});

test("events group under the month they start in, in order", () => {
  const groups = byMonth(
    [{ starts_at: START }, { starts_at: "2026-10-30T05:00:00Z" }, { starts_at: "2026-11-02T05:00:00Z" }],
    TZ,
  );
  assert.deepEqual(
    groups.map((group) => [group.key, group.items.length]),
    [
      ["2026-10", 2],
      ["2026-11", 1],
    ],
  );
});

test("who it is for comes from the organiser's range; none means adults", () => {
  assert.deepEqual(forWhom({ age_min: 12, age_max: 17 }), { key: "ev.forRange", values: { min: 12, max: 17 } });
  assert.equal(forWhom({ age_min: 16, age_max: null }).key, "ev.forFrom");
  assert.equal(forWhom({ age_min: null, age_max: 30 }).key, "ev.forTo");
  assert.equal(forWhom({ age_min: null, age_max: null }).key, "ev.forAdults");
});

test("an event links to its own page; a listing to the catalogue", () => {
  assert.equal(listingHref({ id: "a", starts_at: START }), "/tadbirlar/a");
  assert.equal(listingHref({ id: "b", starts_at: null }), "/imkoniyatlar/b");
  assert.equal(listingHref({ id: "c" }), "/imkoniyatlar/c");
});

test("every reason names the record behind it", () => {
  const base: EventReason = {
    kind: "skill",
    skill: { slug: "budget", label: "budget", name_i18n: { en: "Budgeting" }, category: null, dimensions: [] },
    career_slug: null,
    career_title_i18n: {},
    program_title_i18n: {},
    dimension: null,
    score: null,
  };
  const name = (value: Record<string, string>) => value.en ?? "";
  const dim = (value: string) => `dim:${value}`;
  assert.deepEqual(reasonLine(base, name, dim), { key: "ev.reason.skill", values: { skill: "Budgeting" } });
  assert.deepEqual(
    reasonLine({ ...base, kind: "learning", program_title_i18n: { en: "Money basics" } }, name, dim),
    { key: "ev.reason.learning", values: { course: "Money basics", skill: "Budgeting" } },
  );
  assert.deepEqual(
    reasonLine({ ...base, kind: "score", dimension: "financial_literacy", score: 35 }, name, dim),
    { key: "ev.reason.score", values: { dimension: "dim:financial_literacy", score: 35, skill: "Budgeting" } },
  );
  assert.equal(reasonLine({ ...base, kind: "score" }, name, dim), null);
  for (const kind of ["career", "learning", "skill", "interest", "score", "own_business", "region"]) {
    assert.ok(`ev.reason.${kind}` in messages, kind);
  }
});

test("the calendar file carries only the event's facts and a day-before alarm", () => {
  const file = ics({
    id: "e1",
    title: "Forum, 2026; women",
    starts_at: START,
    ends_at: null,
    place: "Toshkent",
    url: "https://womanup.uz/tadbirlar/e1",
  });
  assert.match(file, /^BEGIN:VCALENDAR\r\n/);
  assert.match(file, /DTSTART:20261020T050000Z/);
  assert.match(file, /DTEND:20261020T060000Z/);
  assert.match(file, /SUMMARY:Forum\\, 2026\\; women/);
  assert.match(file, /TRIGGER:-P1D/);
  assert.doesNotMatch(file, /ATTENDEE|ORGANIZER/);
});

test("every event kind has a name and a plain explanation", () => {
  for (const kind of ["workshop", "seminar", "conference", "forum", "training", "consultation", "competition", "networking"]) {
    assert.ok(`typ.${kind}` in messages, kind);
    assert.ok(`ev.kind.${kind}` in messages, kind);
  }
});
