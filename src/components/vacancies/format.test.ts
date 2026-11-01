/**
 * The one promise the vacancy wording must keep: a salary reads exactly as
 * the employer wrote it, or as "not specified" — never as a guess. And the
 * address round-trips: what a link says is what the server is asked.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeFilterCount,
  currencyUnit,
  formatAmount,
  publishedLine,
  salaryLine,
  searchParamsFor,
  shortDate,
  stateFromParams,
} from "./format";

const unit = (currency: string | null) => (currency === "RUB" ? "RUB" : "сум");

test("an amount is grouped with spaces whatever the locale", () => {
  assert.equal(formatAmount(6_000_000), "6 000 000");
  assert.equal(formatAmount(300), "300");
  assert.equal(currencyUnit("UZS", "uz"), "so'm");
  assert.equal(currencyUnit(null, "ru"), "сум");
  assert.equal(currencyUnit("uzs", "en"), "UZS");
  assert.equal(currencyUnit("RUB", "uz"), "RUB");
});

test("a salary reads as a range, a bound, or not specified — never an estimate", () => {
  assert.deepEqual(
    salaryLine({ amount_from: 5_000_000, amount_to: 8_000_000, currency: "UZS", gross: false }, unit),
    { key: "vac.salary.range", values: { from: "5 000 000", to: "8 000 000 сум" } },
  );
  assert.deepEqual(
    salaryLine({ amount_from: 7_000_000, amount_to: null, currency: "UZS", gross: null }, unit),
    { key: "vac.salary.from", values: { amount: "7 000 000 сум" } },
  );
  assert.deepEqual(
    salaryLine({ amount_from: null, amount_to: 300, currency: "RUB", gross: true }, unit),
    { key: "vac.salary.to", values: { amount: "300 RUB" } },
  );
  assert.deepEqual(salaryLine(null, unit), { key: "vac.salary.none", values: {} });
  assert.deepEqual(
    salaryLine({ amount_from: null, amount_to: null, currency: "UZS", gross: null }, unit),
    { key: "vac.salary.none", values: {} },
  );
});

test("dates read in the reader's language, Uzbek included", () => {
  const date = new Date(2026, 9, 23, 12);
  assert.equal(shortDate(date, "uz"), "23-okt.");
  assert.match(shortDate(date, "ru"), /23 окт/);
  assert.match(shortDate(date, "en"), /23 Oct/);
});

test("the publication date is relative for a week and a date after that", () => {
  const now = Date.UTC(2026, 10, 1, 12);
  const at = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();
  const format = (date: Date) => date.toISOString().slice(0, 10);
  assert.deepEqual(publishedLine(at(0), now, format), { key: "vac.date.today", values: {} });
  assert.deepEqual(publishedLine(at(1), now, format), { key: "vac.date.yesterday", values: {} });
  assert.deepEqual(publishedLine(at(3), now, format), { key: "vac.date.daysAgo", values: { n: 3 } });
  assert.deepEqual(publishedLine(at(20), now, format), {
    key: "vac.date.on",
    values: { date: "2026-10-12" },
  });
  assert.equal(publishedLine(null, now, format), null);
  assert.equal(publishedLine("not a date", now, format), null);
});

test("the address and the request agree", () => {
  const params = new URLSearchParams(
    "q=buxgalter&region=tashkent_city&salary_from=5000000&with_salary=1&experience=noExperience&pick=remote&pick=junior&sort=salary",
  );
  const state = stateFromParams(params);
  assert.equal(state.q, "buxgalter");
  assert.equal(state.onlyWithSalary, true);
  assert.deepEqual(state.picks, ["remote", "junior"]);
  assert.equal(activeFilterCount(state), 4);

  const sent = searchParamsFor(state, 2, 20);
  assert.equal(sent.get("q"), "buxgalter");
  assert.equal(sent.get("only_with_salary"), "true");
  assert.equal(sent.get("salary_from"), "5000000");
  assert.deepEqual(sent.getAll("pick"), ["remote", "junior"]);
  assert.equal(sent.get("sort"), "salary");
  assert.equal(sent.get("page"), "2");
  assert.equal(sent.has("employment"), false);
});

test("a salary that is not a number is not sent", () => {
  const state = stateFromParams(new URLSearchParams("salary_from=много"));
  assert.equal(searchParamsFor(state, 1, 20).has("salary_from"), false);
});
