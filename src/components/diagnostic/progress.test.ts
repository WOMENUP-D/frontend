import assert from "node:assert/strict";
import { test } from "node:test";
import { partProgress } from "./progress";

const q = (section: string) => ({ section });

test("profile part promises no total (QA D-11)", () => {
  const shown = [q("about"), q("goals"), q("score"), q("score")];
  const at = partProgress(shown, 1);
  assert.equal(at.part, 1);
  assert.equal(at.parts, 2);
  assert.equal(at.n, 2);
  assert.equal(at.total, null);
  assert.equal(at.percent, 50);
});

test("scored part counts against its fixed length", () => {
  const shown = [q("about"), q("goals"), q("situation"), q("score"), q("score")];
  const at = partProgress(shown, 3);
  assert.deepEqual([at.part, at.n, at.total, at.percent], [2, 1, 2, 75]);
});

test("branching in the profile part does not move the scored half", () => {
  const short = [q("about"), q("score"), q("score")];
  const long = [q("about"), q("situation"), q("situation"), q("score"), q("score")];
  assert.equal(partProgress(short, 2).percent, partProgress(long, 4).percent);
  assert.equal(partProgress(short, 1).n, partProgress(long, 3).n);
});

test("a bank with one part uses the full bar", () => {
  const shown = [q("score"), q("score")];
  const at = partProgress(shown, 0);
  assert.deepEqual([at.part, at.parts, at.percent], [1, 1, 50]);
});
