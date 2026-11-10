import assert from "node:assert/strict";
import { test } from "node:test";
import { countAt, easeOutCubic, pointInBox } from "./math";

test("easeOutCubic is pinned at both ends and clamps outside 0..1", () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(-3), 0);
  assert.equal(easeOutCubic(7), 1);
});

test("easeOutCubic moves faster at the start than at the end", () => {
  const early = easeOutCubic(0.25);
  const late = easeOutCubic(1) - easeOutCubic(0.75);
  assert.ok(early > late, `expected ${early} > ${late}`);
});

test("countAt lands exactly on the target and never overshoots", () => {
  assert.equal(countAt(0, 1400, 0), 0);
  assert.equal(countAt(0, 1400, 1), 1400);
  for (let step = 0; step <= 20; step += 1) {
    const value = countAt(0, 1400, step / 20);
    assert.ok(value >= 0 && value <= 1400);
  }
  assert.equal(countAt(58, 58, 0.5), 58);
});

test("pointInBox reports percentages and clamps to the box", () => {
  const box = { left: 100, top: 50, width: 200, height: 100 };
  assert.deepEqual(pointInBox(200, 100, box), { x: "50.0%", y: "50.0%" });
  assert.deepEqual(pointInBox(0, 0, box), { x: "0.0%", y: "0.0%" });
  assert.deepEqual(pointInBox(900, 900, box), { x: "100.0%", y: "100.0%" });
  assert.deepEqual(pointInBox(5, 5, { left: 0, top: 0, width: 0, height: 0 }), { x: "50.0%", y: "50.0%" });
});
