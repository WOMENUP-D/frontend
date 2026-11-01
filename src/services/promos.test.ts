/**
 * The promotion book keeps two promises: a card that leaves WomanUP says so
 * (`external`) and goes to a real https address, and a card that stays here
 * points at a route — never the other way round, which would hand a partner's
 * address to the client-side router or a route to a new tab.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveSlot, type SlotId } from "./promos";

const SLOTS: SlotId[] = ["home-top", "home-mid"];

test("an external promotion carries an https address and an internal one a route", () => {
  for (const slot of SLOTS) {
    for (const promo of resolveSlot(slot)) {
      if (promo.external) {
        assert.match(promo.href, /^https:\/\//, `${promo.id} must leave over https`);
      } else {
        assert.match(promo.href, /^\//, `${promo.id} must be a route`);
      }
    }
  }
});

test("the partner sites are named on their cards", () => {
  const top = resolveSlot("home-top");
  assert.deepEqual(
    top.map((promo) => promo.href),
    ["https://tijoratmarkazi.uz", "https://www.wbip.uz"],
  );
  assert.ok(top.every((promo) => promo.external && promo.sponsor.startsWith("promo.sponsor.")));
});

test("an empty slot resolves to nothing rather than failing", () => {
  assert.deepEqual(resolveSlot("nowhere" as SlotId), []);
});
