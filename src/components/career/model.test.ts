/**
 * How a career journey reads on screen.
 *
 * The server decides every status; these pin that the browser words each one
 * the same way every time, that no state is left without words (so a marker
 * is never the only sign of it), and that a visitor is never shown a count of
 * things she has "done".
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { messages } from "@/i18n/messages";
import type { CareerDetail, CareerStage } from "@/services/portal";
import {
  STAGES,
  fill,
  glyphFor,
  splitSkills,
  stageProgress,
  stageState,
  stageTitleKey,
  stageWhatKey,
  stagesDone,
  stateLabelKey,
} from "./model";

const stage = (overrides: Partial<CareerStage>): CareerStage => ({
  stage: "learn",
  status: "todo",
  reason: null,
  done: 0,
  total: 0,
  ...overrides,
});

test("the stage she is on reads as 'now', whatever its own status", () => {
  assert.equal(stageState(stage({ status: "todo" }), "learn"), "now");
  assert.equal(stageState(stage({ status: "in_progress" }), "learn"), "now");
  assert.equal(stageState(stage({ status: "done" }), "practice"), "done");
  assert.equal(stageState(stage({ status: "todo" }), "practice"), "later");
});

test("an unavailable stage is never the current one, and a visitor has no state", () => {
  assert.equal(stageState(stage({ status: "unavailable" }), "learn"), "unavailable");
  assert.equal(stageState(stage({ status: null }), "learn"), "neutral");
});

test("every state she can be in is named in words", () => {
  for (const status of ["done", "in_progress", "todo", "unavailable"] as const) {
    for (const current of [null, "learn", "practice"] as const) {
      const item = stage({ status });
      const key = stateLabelKey(stageState(item, current), item);
      assert.ok(key, `${status} / ${current}`);
      assert.ok(key in messages, key);
    }
  }
});

test("every stage has a title and a plain explanation in all three languages", () => {
  for (const name of STAGES) {
    for (const key of [stageTitleKey(name), stageWhatKey(name)]) {
      const entry = messages[key];
      assert.ok(entry, key);
      assert.ok(entry.uz && entry.ru && entry.en, key);
    }
  }
});

test("a visitor is told what exists, never a count of what she has done", () => {
  assert.equal(stageProgress(stage({ stage: "learn", status: null, total: 3 })), null);
  assert.deepEqual(stageProgress(stage({ stage: "practice", status: null, total: 2 })), {
    key: "car.count.tasks",
    values: { n: 2 },
  });
  assert.equal(stageProgress(stage({ stage: "build", status: null })), null);
});

test("her progress is quoted from the server's numbers", () => {
  const reading = stageProgress(stage({ stage: "learn", status: "in_progress", done: 1, total: 4 }));
  assert.ok(reading);
  assert.equal(
    fill(messages[reading.key].en, reading.values),
    "1 of 4 skills learned",
  );
  const applied = stageProgress(stage({ stage: "explore", status: "done", done: 2, total: 3 }));
  assert.equal(applied?.key, "car.progress.applied");
  assert.equal(stageProgress(stage({ status: "unavailable", reason: "no_tasks" })), null);
});

test("stages done are counted only among those WomanUP can offer", () => {
  const detail = {
    stages: [
      stage({ stage: "learn", status: "done" }),
      stage({ stage: "practice", status: "unavailable", reason: "no_tasks" }),
      stage({ stage: "build", status: "todo" }),
      stage({ stage: "explore", status: "done" }),
    ],
  } as CareerDetail;
  assert.deepEqual(stagesDone(detail), { done: 2, total: 3 });
});

test("skills split into what she has and what to learn, and nothing is lost", () => {
  const ref = (slug: string) => ({ slug, name_i18n: {}, label: slug, category: null, dimensions: [] });
  const detail = {
    skill_details: [
      { skill: ref("excel"), status: "learned", programs: 1, tasks: 0, opportunities: 1 },
      { skill: ref("1c"), status: null, programs: 1, tasks: 0, opportunities: 1 },
      { skill: ref("accounting"), status: "self_reported", programs: 1, tasks: 1, opportunities: 2 },
    ],
  } as unknown as CareerDetail;
  const { have, need } = splitSkills(detail);
  assert.deepEqual(have.map((item) => item.skill.slug), ["excel", "accounting"]);
  assert.deepEqual(need.map((item) => item.skill.slug), ["1c"]);
});

test("a direction added later still gets a picture", () => {
  assert.equal(glyphFor("buxgalter", "employment"), "ledger");
  assert.equal(glyphFor("yangi-kasb", "own_business"), "shop");
  assert.equal(glyphFor("yangi-kasb", "employment"), "briefcase");
});
