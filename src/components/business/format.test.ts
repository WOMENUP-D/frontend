/**
 * How a business listing reads: every reason is one the server sent, worded
 * the same way everywhere, and nothing is said about money that the listing
 * does not say.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { messages } from "@/i18n/messages";
import type { Eligibility, MatchReason } from "@/services/portal";
import {
  APPLY_STATE_KEY,
  BUSINESS_KINDS,
  applyState,
  kindMeaningKey,
  missingSignals,
  orderedReasons,
  reasonLine,
  rewardTerms,
} from "./format";

const reason = (patch: Partial<MatchReason>): MatchReason => ({
  kind: "skill",
  skill: null,
  status: null,
  source_i18n: {},
  career_slug: null,
  career_title_i18n: {},
  dimension: null,
  score: null,
  ...patch,
});

const eligibility = (patch: Partial<Eligibility>): Eligibility => ({
  status: "eligible",
  reason: null,
  age_min: null,
  age_max: null,
  may_apply: true,
  ...patch,
});

const name = (value: Record<string, string>) => value.en ?? "";

test("every business kind has a plain meaning, and a vacancy has none", () => {
  for (const kind of BUSINESS_KINDS) {
    const key = kindMeaningKey(kind);
    assert.ok(key && key in messages, kind);
  }
  assert.equal(kindMeaningKey("vacancy"), null);
  assert.equal(kindMeaningKey("internship"), null);
});

test("where she stands follows the server's eligibility, never a guess", () => {
  assert.equal(applyState(eligibility({}), true), "can");
  assert.equal(applyState(eligibility({ status: "unknown", reason: "other_requirements" }), true), "check");
  assert.equal(
    applyState(eligibility({ status: "not_eligible", reason: "too_young", may_apply: false }), true),
    "cannot",
  );
  assert.equal(applyState(eligibility({}), false), "closed");
  // A visitor has no eligibility: she is told to check, not that she can.
  assert.equal(applyState(null, true), "check");
  for (const key of Object.values(APPLY_STATE_KEY)) assert.ok(key in messages, key);
});

test("each reason names the real skill, direction or score it came from", () => {
  const skill = { slug: "marketing", label: "marketing", name_i18n: { en: "Marketing" }, category: null, dimensions: [] };
  assert.deepEqual(reasonLine(reason({ kind: "skill", skill }), name), {
    key: "biz.reason.skill",
    values: { skill: "Marketing" },
  });
  assert.deepEqual(reasonLine(reason({ kind: "interest", skill }), name), {
    key: "biz.reason.interest",
    values: { skill: "Marketing" },
  });
  assert.deepEqual(
    reasonLine(reason({ kind: "career", career_title_i18n: { en: "Small business owner" } }), name),
    { key: "biz.reason.career", values: { career: "Small business owner" } },
  );
  assert.deepEqual(reasonLine(reason({ kind: "score", dimension: "entrepreneurship", score: 42 }), name), {
    key: "biz.reason.score",
    values: { score: 42 },
  });
  assert.equal(reasonLine(reason({ kind: "own_business" }), name)?.key, "biz.reason.own_business");
});

test("a reason with nothing behind it is not worded", () => {
  assert.equal(reasonLine(reason({ kind: "skill", skill: null }), name), null);
  assert.equal(reasonLine(reason({ kind: "score", score: null }), name), null);
});

test("what she runs and chose come before where she lives", () => {
  const kinds = orderedReasons([
    reason({ kind: "region" }),
    reason({ kind: "score", score: 30 }),
    reason({ kind: "skill" }),
    reason({ kind: "own_business" }),
  ]).map((item) => item.kind);
  assert.deepEqual(kinds, ["own_business", "skill", "score", "region"]);
});

test("the empty state suggests only what she has not done", () => {
  assert.deepEqual(missingSignals({}), ["career", "profile", "score"]);
  assert.deepEqual(missingSignals({ career: true, interests: true, score: true }), []);
  assert.deepEqual(missingSignals({ career: true, score: true }), ["profile"]);
});

test("terms are the listing's own, in plain words, and a price of zero reads as free", () => {
  const money = (amount: number) => `${amount} UZS`;
  assert.deepEqual(
    rewardTerms({ amount: 150000000, currency: "UZS", equity_percent: 20 }, money).map((term) => term.key),
    ["biz.term.equity"],
  );
  assert.deepEqual(rewardTerms({ price: 0, sessions: 8 }, money), [
    { key: "biz.term.sessions", values: { n: 8 } },
    { key: "biz.term.free", values: {} },
  ]);
  assert.equal(rewardTerms({ commission_percent: 0 }, money)[0].key, "biz.term.noCommission");
  assert.deepEqual(rewardTerms({ volume: 4000, currency: "UZS" }, money), []);
  for (const key of ["equity", "rate", "commission", "noCommission", "firstMonthFree", "sessions", "free", "price", "repayable"]) {
    assert.ok(`biz.term.${key}` in messages, key);
  }
});
