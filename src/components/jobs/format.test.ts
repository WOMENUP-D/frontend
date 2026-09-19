/**
 * How a listing reads: the same fact always in the same words, and nothing
 * that is not a fact the server sent.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { messages } from "@/i18n/messages";
import type { ApplicationRecord, Eligibility } from "@/services/portal";
import {
  TRACK,
  activeFilters,
  deadlineLine,
  ineligibleReason,
  reachedAt,
  rewardText,
  statusKey,
  trackPosition,
} from "./format";

const NOW = Date.parse("2026-09-18T12:00:00Z");

test("a closed listing reads as closed whatever its deadline says", () => {
  assert.equal(deadlineLine({ is_open: false, deadline: "2026-12-01T00:00:00Z" }, NOW).key, "job.isClosed");
});

test("an open listing counts down its days, and says so on the last one", () => {
  assert.deepEqual(deadlineLine({ is_open: true, deadline: "2026-09-28T12:00:00Z" }, NOW), {
    key: "job.daysLeft",
    values: { n: 10 },
  });
  assert.equal(deadlineLine({ is_open: true, deadline: "2026-09-18T20:00:00Z" }, NOW).key, "job.lastDay");
  assert.equal(deadlineLine({ is_open: true, deadline: null }, NOW).key, "job.noDeadline");
});

test("every status the backend has is named, and only those", () => {
  for (const status of ["draft", "submitted", "in_review", "accepted", "rejected", "withdrawn"] as const) {
    const key = statusKey(status);
    assert.ok(key in messages, key);
  }
});

test("the track has three steps and a withdrawn application is off it", () => {
  assert.equal(TRACK.length, 3);
  assert.equal(trackPosition("submitted"), 0);
  assert.equal(trackPosition("in_review"), 1);
  assert.equal(trackPosition("accepted"), 2);
  assert.equal(trackPosition("rejected"), 2);
  assert.equal(trackPosition("withdrawn"), -1);
});

test("the date a status was reached comes from the application's own history", () => {
  const application = {
    status_history: [
      { status: "submitted", at: "2026-09-01T10:00:00Z" },
      { status: "in_review", at: "2026-09-05T09:00:00Z" },
    ],
  } as ApplicationRecord;
  assert.equal(reachedAt(application, "in_review"), "2026-09-05T09:00:00Z");
  assert.equal(reachedAt(application, "accepted"), null);
});

test("a reason she cannot apply is quoted with the listing's own limits", () => {
  const blocked: Eligibility = {
    status: "not_eligible",
    reason: "too_young",
    age_min: 21,
    age_max: null,
    may_apply: false,
  };
  assert.deepEqual(ineligibleReason(blocked), { key: "job.why.too_young", values: { min: 21 } });
  assert.equal(ineligibleReason({ ...blocked, may_apply: true }), null);
  assert.equal(ineligibleReason(null), null);
  for (const reason of ["closed", "too_young", "too_old", "adults_only", "age_unknown", "other_requirements"]) {
    assert.ok(`job.why.${reason}` in messages, reason);
  }
});

test("pay is read from the partner's own fields, and nothing is made up", () => {
  const money = (n: number) => `${n}`;
  assert.equal(rewardText({ salary_from: 5, salary_to: 9 }, money), "5 – 9");
  assert.equal(rewardText({ amount: 50 }, money), "50");
  assert.equal(rewardText({}, money), null);
  // A currency code is the unit of a figure, not a reward on its own.
  assert.equal(rewardText({ volume: 4000, currency: "UZS" }, money), null);
  assert.equal(rewardText({ text: "Office space", currency: "UZS" }, money), "Office space");
});

test("the filters button counts only the filters that are on", () => {
  assert.equal(activeFilters({}), 0);
  assert.equal(activeFilters({ region: "samarkand", closed: true }), 2);
});
