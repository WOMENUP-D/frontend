/**
 * The workspace's listing form: what it sends is what the organisation typed,
 * in the shapes the catalogue reads — pay only on paid kinds, a sum only on
 * kinds that give one — and a refusal is said in words.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { messages } from "@/i18n/messages";
import type { OrgListing } from "@/services/portal";
import {
  LISTING_TYPES,
  draftFrom,
  draftProblem,
  emptyDraft,
  problemMessage,
  shortRef,
  skillList,
  toPayload,
  wholeNumber,
} from "./model";

const listing: OrgListing = {
  id: "l1",
  type: "grant",
  title_i18n: { uz: "Grant", ru: "Грант" },
  description_i18n: { uz: "Tavsif", ru: "Описание" },
  region: "samarkand",
  skills: [{ slug: "marketing", label: "marketing", name_i18n: {}, category: null, dimensions: [] }],
  reward: { amount: 20000000 },
  eligibility: { age_min: 18 },
  deadline: null,
  starts_at: null,
  ends_at: null,
  format: null,
  venue: null,
  is_open: true,
  applications: 0,
  created_at: null,
};

test("every kind an organisation may publish has a label", () => {
  for (const type of LISTING_TYPES) assert.ok(`typ.${type}` in messages, type);
});

test("numbers are whole and non-negative, typed with or without spaces", () => {
  assert.equal(wholeNumber("5 000 000"), 5000000);
  assert.equal(wholeNumber("1,500"), 1500);
  assert.equal(wholeNumber(""), undefined);
  assert.equal(wholeNumber("-3"), undefined);
  assert.equal(wholeNumber("about 5m"), undefined);
});

test("skills are split, trimmed and not repeated", () => {
  assert.deepEqual(skillList(" Excel, marketing ;Excel\n"), ["Excel", "marketing"]);
});

test("a vacancy sends pay and no sum; a grant sends a sum and no pay", () => {
  const vacancy = toPayload({ ...emptyDraft(), titleUz: "Kassir", salaryFrom: "3 000 000", amount: "9" });
  assert.deepEqual(vacancy.reward, { salary_from: 3000000 });
  const grant = toPayload({ ...emptyDraft(), type: "grant", titleUz: "Grant", salaryFrom: "5", amount: "20000000" });
  assert.deepEqual(grant.reward, { amount: 20000000 });
  const mentoring = toPayload({ ...emptyDraft(), type: "mentorship", titleUz: "M", amount: "5" });
  assert.deepEqual(mentoring.reward, {});
});

test("empty fields are left out rather than sent as empty", () => {
  const payload = toPayload({ ...emptyDraft(), titleUz: "  Kassir " });
  assert.deepEqual(payload.title_i18n, { uz: "Kassir" });
  assert.deepEqual(payload.eligibility, {});
  assert.equal(payload.region, null);
  assert.equal(payload.deadline, null);
  assert.deepEqual(payload.skills, []);
});

test("editing keeps the languages the form does not show", () => {
  const draft = draftFrom(listing);
  assert.equal(draft.amount, "20000000");
  assert.equal(draft.ageMin, "18");
  assert.equal(draft.skills, "marketing");
  const payload = toPayload({ ...draft, description: "Yangi" }, listing);
  assert.deepEqual(payload.description_i18n, { uz: "Yangi", ru: "Описание" });
});

test("a closing date is the end of that day", () => {
  const payload = toPayload({ ...emptyDraft(), titleUz: "X", deadline: "2026-10-01" });
  const closes = new Date(payload.deadline as string);
  assert.equal(closes.getDate(), 1);
  assert.equal(closes.getHours(), 23);
});

test("the form refuses what the server would refuse, for the same reason", () => {
  assert.equal(draftProblem(emptyDraft(), "2026-09-18"), "title");
  assert.equal(draftProblem({ ...emptyDraft(), titleRu: "X", ageMin: "40", ageMax: "20" }, "2026-09-18"), "age_range");
  assert.equal(draftProblem({ ...emptyDraft(), titleEn: "X", deadline: "2026-09-17" }, "2026-09-18"), "deadline_past");
  assert.equal(draftProblem({ ...emptyDraft(), titleEn: "X", deadline: "2026-09-18" }, "2026-09-18"), null);
});

test("a refusal names its reason, and the unknown skills by name", () => {
  assert.deepEqual(problemMessage({ reason: "unknown_skill", fields: ["Excel", "Foo"] }, 422), {
    key: "ws.err.unknown_skill",
    values: { fields: "Excel, Foo" },
  });
  assert.equal(problemMessage({ reason: "already_invited" }, 409).key, "ws.err.already_invited");
  assert.equal(problemMessage("Not found", 404).key, "ws.err.not_found");
  assert.equal(problemMessage(null, 500).key, "ws.loadError");
  for (const reason of ["unknown_skill", "deadline_past", "title", "bad_url", "age_range", "already_invited", "too_many", "not_found"]) {
    assert.ok(`ws.err.${reason}` in messages, reason);
  }
});

test("a pseudonym is shortened for reading only", () => {
  assert.equal(shortRef("a1b2c3d4e5f6a7b8c9d0e1f2"), "A1B2C3D4");
});

test("an event carries its time, place and format; a standing listing carries none", () => {
  const event = toPayload({
    ...emptyDraft(),
    type: "seminar",
    titleUz: "Seminar",
    startsAt: "2026-10-20T10:00",
    endsAt: "2026-10-20T13:00",
    format: "offline",
    venue: " Samarqand, Registon 5 ",
  });
  assert.equal(new Date(event.starts_at as string).getHours(), 10);
  assert.equal(event.format, "offline");
  assert.equal(event.venue, "Samarqand, Registon 5");
  const online = toPayload({ ...emptyDraft(), type: "workshop", titleUz: "W", startsAt: "2026-10-20T10:00", format: "online", venue: "ignored" });
  assert.equal(online.venue, null);
  const standing = toPayload({ ...emptyDraft(), type: "competition", titleUz: "C", venue: "x" });
  assert.equal(standing.starts_at, null);
  assert.equal(standing.venue, null);
  const vacancy = toPayload({ ...emptyDraft(), titleUz: "V", startsAt: "2026-10-20T10:00" });
  assert.equal(vacancy.starts_at, null);
});

test("the form refuses an event without a start, or one that ends before it begins", () => {
  assert.equal(draftProblem({ ...emptyDraft(), type: "forum", titleUz: "F" }, "2026-09-18"), "starts_required");
  assert.equal(
    draftProblem({ ...emptyDraft(), type: "forum", titleUz: "F", startsAt: "2026-10-20T10:00", endsAt: "2026-10-19T10:00" }, "2026-09-18"),
    "ends_before_start",
  );
  assert.equal(
    draftProblem({ ...emptyDraft(), type: "forum", titleUz: "F", startsAt: "2026-10-20T10:00", deadline: "2026-10-21" }, "2026-09-18"),
    "deadline_after_start",
  );
  for (const reason of ["starts_required", "starts_past", "ends_before_start", "deadline_after_start", "not_an_event"]) {
    assert.ok(`ws.err.${reason}` in messages, reason);
  }
});
