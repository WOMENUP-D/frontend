/**
 * What the Results dashboard asks for, and how it reads the answer: whole
 * Tashkent days, clean axes, unknown last, and nothing counted in the browser.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { messages } from "@/i18n/messages";
import {
  axisTicks,
  bucketLabel,
  formatPercent,
  isReversed,
  largest,
  ordered,
  periodOf,
  PRESETS,
  seriesSummary,
  shiftDay,
  todayIn,
} from "./model";

test("a period is whole days with both ends included", () => {
  const today = "2026-09-18";
  assert.deepEqual(periodOf("today", today), { date_from: today, date_to: today });
  assert.deepEqual(periodOf("7", today), { date_from: "2026-09-12", date_to: today });
  assert.deepEqual(periodOf("30", today), { date_from: "2026-08-20", date_to: today });
  assert.deepEqual(periodOf("90", today), { date_from: "2026-06-21", date_to: today });
  assert.deepEqual(periodOf("year", today), { date_from: "2026-01-01", date_to: today });
  assert.deepEqual(periodOf("all", today), {});
  assert.deepEqual(periodOf("custom", today, { date_from: "2026-03-01" }), { date_from: "2026-03-01" });
  assert.deepEqual(periodOf("custom", today, { date_from: "", date_to: "" }), {});
});

test("days roll over months and years, and today is Tashkent's", () => {
  assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDay("2024-03-01", -1), "2024-02-29");
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  // 20:00 UTC on the 18th is already the 19th in Tashkent.
  assert.equal(todayIn(new Date("2026-09-18T20:00:00Z")), "2026-09-19");
  assert.equal(todayIn(new Date("2026-09-18T18:59:00Z")), "2026-09-18");
});

test("a start after the end is caught before it is sent", () => {
  assert.equal(isReversed({ date_from: "2026-03-05", date_to: "2026-03-01" }), true);
  assert.equal(isReversed({ date_from: "2026-03-01", date_to: "2026-03-01" }), false);
  assert.equal(isReversed({ date_from: "2026-03-05" }), false);
});

test("axes are whole numbers from zero past the largest value", () => {
  assert.deepEqual(axisTicks(0), [0]);
  assert.deepEqual(axisTicks(1), [0, 1]);
  assert.deepEqual(axisTicks(9), [0, 3, 6, 9]);
  assert.deepEqual(axisTicks(23), [0, 10, 20, 30]);
  assert.deepEqual(axisTicks(124), [0, 50, 100, 150]);
  for (const max of [2, 7, 13, 48, 99, 1001]) {
    const ticks = axisTicks(max);
    assert.ok(ticks.at(-1)! >= max, String(max));
    assert.ok(ticks.length <= 6, String(max));
    assert.ok(ticks.every(Number.isInteger), String(max));
  }
});

test("lists read largest first, hidden groups after, unknown last", () => {
  const groups = [
    { key: "unknown", value: 9, suppressed: false },
    { key: "navoi", value: null, suppressed: true },
    { key: "andijan", value: 0, suppressed: false },
    { key: "samarkand", value: 12, suppressed: false },
    { key: "bukhara", value: 30, suppressed: false },
  ];
  assert.deepEqual(
    ordered(groups).map((group) => group.key),
    ["bukhara", "samarkand", "navoi", "andijan", "unknown"],
  );
  // Age bands keep their order; unknown still goes last.
  assert.deepEqual(
    ordered(groups, true).map((group) => group.key),
    ["navoi", "andijan", "samarkand", "bukhara", "unknown"],
  );
  assert.equal(largest(groups), 30);
  assert.equal(largest([{ value: null }]), 0);
});

test("a series summary names its total and its highest point", () => {
  const points = [
    { bucket: "2026-03-01", value: 2 },
    { bucket: "2026-03-02", value: 7 },
    { bucket: "2026-03-03", value: 7 },
  ];
  assert.deepEqual(seriesSummary(points), { total: 16, peak: points[1] });
  assert.deepEqual(seriesSummary([{ bucket: "2026-03-01", value: 0 }]), { total: 0, peak: null });
});

test("buckets are dated in her language, Uzbek included", () => {
  assert.deepEqual(bucketLabel("2026-03-09", "day", "en"), { short: "9 Mar", long: "9 March 2026" });
  assert.deepEqual(bucketLabel("2026-03-09", "day", "uz"), { short: "9 Mar", long: "9-mart 2026" });
  assert.equal(bucketLabel("2026-10-01", "month", "uz").long, "Oktabr 2026");
  assert.equal(bucketLabel("2026-10-01", "month", "en").short, "Oct 2026");
  assert.equal(formatPercent(54.8, "en"), "54.8%");
  assert.equal(formatPercent(100, "en"), "100%");
});

test("every period, metric and definition has words in all three languages", () => {
  for (const preset of PRESETS) assert.ok(`res.p.${preset}` in messages, preset);
  const figures = [
    "participants", "new_registrations", "active_in_period", "onboarded", "diagnosed",
    "learners_started", "enrollments_started", "in_progress_now", "course_completions",
    "certificates", "paths_started", "paths_completed", "tasks_started", "tasks_submitted",
    "tasks_evaluated", "tasks_passed", "portfolio_projects", "applications",
    "event_registrations", "outcomes_recorded", "saved_listings", "invitations_sent",
    "invitations_accepted", "events_added", "events_held", "events_upcoming",
    "event_reminders", "events_saved", "attendance", "course_completion_rate",
    "path_completion_rate", "task_pass_rate", "application_accepted_rate", "score_people",
  ];
  for (const key of figures) {
    for (const kind of ["m", "def"]) {
      const entry = (messages as Record<string, { uz: string; ru: string; en: string }>)[`res.${kind}.${key}`];
      assert.ok(entry, `res.${kind}.${key}`);
      assert.ok(entry.uz && entry.ru && entry.en, `res.${kind}.${key}`);
    }
  }
});
