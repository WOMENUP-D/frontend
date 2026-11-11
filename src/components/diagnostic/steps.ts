/**
 * The result page's "next 3 steps", aligned with its course list. (QA D-06)
 *
 * The courses ("for your goal") and the steps used to come from two engines,
 * so the page recommended one set of courses and then told her to start a
 * different one. Here a course step survives only when it names one of the
 * recommended courses; when none does, the top recommended course she has
 * not finished becomes the course step. Non-course steps (a CV, a learning
 * path, a task) keep the server's order.
 */

import type { NextStep, RecommendedCourse } from "@/services/portal";

const isCourse = (step: NextStep) =>
  step.kind === "start_program" || step.kind === "continue_program";

export function alignSteps(
  steps: NextStep[],
  recommended: ReadonlyArray<Pick<RecommendedCourse, "program" | "enrollment_status">>,
  limit = 3,
): NextStep[] {
  if (recommended.length === 0) return steps;
  const ids = new Set(recommended.map((item) => item.program.id));
  const kept = steps.filter((step) => !isCourse(step) || (step.program && ids.has(step.program.id)));
  // Course steps that were dropped leave room: it is filled with the next
  // recommended courses, so "your next 3 steps" still has three — and every
  // course in it is one the list above recommends.
  const used = new Set(kept.filter(isCourse).map((step) => step.program?.id));
  const open = recommended.filter(
    (item) => item.enrollment_status !== "completed" && !used.has(item.program.id),
  );
  const asStep = (item: (typeof recommended)[number]): NextStep => {
    const started = item.enrollment_status === "enrolled" || item.enrollment_status === "in_progress";
    return {
      kind: started ? "continue_program" : "start_program",
      reason: "diagnostic_priority",
      dimension: null,
      params: {},
      program: item.program,
      path: null,
      task: null,
      plan_item_id: null,
      text: null,
      due_date: null,
      opportunity_types: [],
    } as unknown as NextStep;
  };
  if (!kept.some(isCourse) && open.length) kept.unshift(asStep(open.shift()!));
  while (kept.length < limit && open.length) kept.push(asStep(open.shift()!));
  return kept.slice(0, limit);
}
