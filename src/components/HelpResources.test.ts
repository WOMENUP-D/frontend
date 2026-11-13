import assert from "node:assert/strict";
import { test } from "node:test";
import { usableResources } from "./HelpResources";

test("only well-formed tel: lines are kept", () => {
  const ok = { id: "a", phone: "1146", tel: "tel:1146", label: "Hotline" };
  assert.deepEqual(usableResources([ok, { ...ok, tel: "javascript:alert(1)" }, null, "x"]), [ok]);
});

test("an absent or malformed field is nothing", () => {
  assert.deepEqual(usableResources(undefined), []);
  assert.deepEqual(usableResources({}), []);
});
