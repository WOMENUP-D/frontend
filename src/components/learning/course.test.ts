import assert from "node:assert/strict";
import { test } from "node:test";
import type { EnrollmentDetail } from "@/services/portal";
import { isOpen, resumeOf } from "./course";

const row = (id: string, status: string, external = false) =>
  ({ id, status, program: { id, external_url: external ? "https://stepik.org/x" : null } }) as unknown as EnrollmentDetail;

test("a fresh 'enrolled' course is open (QA C-14)", () => {
  assert.equal(isOpen(row("a", "enrolled")), true);
  assert.equal(isOpen(row("a", "completed")), false);
  assert.equal(isOpen(row("a", "dropped")), false);
});

test("the hero resumes an enrolled course when nothing is in progress", () => {
  assert.equal(resumeOf([row("done", "completed"), row("new", "enrolled")])?.id, "new");
});

test("a started course wins over a fresh one; partner courses are never resumed", () => {
  assert.equal(resumeOf([row("new", "enrolled"), row("going", "in_progress")])?.id, "going");
  assert.equal(resumeOf([row("stepik", "in_progress", true)]), null);
});
