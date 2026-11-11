import assert from "node:assert/strict";
import { test } from "node:test";
import type { NextStep, RecommendedCourse } from "@/services/portal";
import { alignSteps } from "./steps";

const step = (kind: string, programId?: string) =>
  ({ kind, program: programId ? { id: programId } : null }) as unknown as NextStep;
const course = (id: string, enrollment_status: string | null = null) =>
  ({ program: { id }, enrollment_status }) as unknown as RecommendedCourse;

test("a course step outside the recommended list is replaced by the top course (QA D-06)", () => {
  const out = alignSteps(
    [step("start_program", "excel"), step("start_path"), step("build_cv")],
    [course("cv-course"), course("finance")],
  );
  assert.deepEqual(out.map((s) => [s.kind, s.program?.id ?? null]), [
    ["start_program", "cv-course"],
    ["start_path", null],
    ["build_cv", null],
  ]);
});

test("a course step that is recommended is kept", () => {
  const out = alignSteps([step("start_program", "finance"), step("build_cv")], [course("cv"), course("finance")]);
  // kept as is, and the free third slot takes the next recommended course
  assert.deepEqual(out.map((s) => s.program?.id ?? null), ["finance", null, "cv"]);
});

test("a finished top course is skipped; an enrolled one is continued", () => {
  const out = alignSteps([step("build_cv")], [course("done", "completed"), course("mine", "enrolled")]);
  assert.deepEqual([out[0].kind, out[0].program?.id], ["continue_program", "mine"]);
  assert.equal(out.length, 2);
});

test("without recommended courses the server's steps stand", () => {
  const steps = [step("start_program", "x")];
  assert.equal(alignSteps(steps, []), steps);
});
