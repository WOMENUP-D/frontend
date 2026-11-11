/**
 * QA Phase 2 (auth): the pure parts of the session and sign-in fixes.
 *
 *  - only a refusal ends a session; a throttle or an outage does not (C-02)
 *  - server error codes become field messages (C-08, C-10, C-20)
 *  - `next=` cannot be turned into an open redirect (C-09)
 *  - one viewer state decides every state-dependent call to action (J-01)
 *  - one person's drafts do not reach the next person on the device (I-01)
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { authProblem, passwordIssue, EMAIL_PATTERN } from "./authErrors";
import { clearPersonalData, noteOwner, OWNER_KEY } from "./personalData";
import { decodeSubject, getAccessToken, onTokenChange, setAccessToken } from "./tokenStore";
import { loginHref, safeNext } from "../utils/url";

class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  keys() {
    return [...this.map.keys()].sort();
  }
}

function jwt(payload: Record<string, unknown>): string {
  const b64 = (value: string) => Buffer.from(value).toString("base64").replace(/=+$/, "");
  return `${b64('{"alg":"HS256"}')}.${b64(JSON.stringify(payload))}.sig`;
}

/* ---- C-02 / C-01 ---------------------------------------------------- */

test("only 400/401/403 end the session on refresh; 429, 5xx and the network do not", async () => {
  const { classifyRefresh } = await import("./api");
  assert.equal(classifyRefresh(200), "ok");
  for (const status of [400, 401, 403]) assert.equal(classifyRefresh(status), "rejected");
  for (const status of [429, 500, 502, 503, 504, null]) assert.equal(classifyRefresh(status), "transient");
});

test("listeners hear every token change, once per change (C-25)", () => {
  const heard: Array<string | null> = [];
  const off = onTokenChange((token) => heard.push(token));
  setAccessToken("a");
  setAccessToken("a");
  setAccessToken(null);
  off();
  setAccessToken("b");
  setAccessToken(null);
  assert.deepEqual(heard, ["a", null]);
  assert.equal(getAccessToken(), null);
});

test("the account id is read from the token's sub claim", () => {
  assert.equal(decodeSubject(jwt({ sub: "u-1", roles: ["user"] })), "u-1");
  assert.equal(decodeSubject(jwt({ roles: ["user"] })), null);
  assert.equal(decodeSubject("garbage"), null);
  assert.equal(decodeSubject(null), null);
});

/* ---- C-08 / C-10 / C-20 ---------------------------------------------- */

test("server codes become the right message beside the right field", () => {
  assert.deepEqual(authProblem({ status: 409, detail: "email_taken" }, "signup"), {
    key: "au.err.taken",
    field: "email",
    offerSignIn: true,
  });
  assert.deepEqual(authProblem({ status: 409, detail: "something else" }, "signup"), {
    key: "au.err.taken",
    field: "email",
    offerSignIn: true,
  });
  assert.deepEqual(authProblem({ status: 422, detail: "weak_password" }, "signup"), {
    key: "au.err.weak",
    field: "password",
  });
  assert.deepEqual(authProblem({ status: 422, detail: "email_domain_unsupported" }, "signup"), {
    key: "au.err.emailDomain",
    field: "email",
  });
  assert.deepEqual(authProblem({ status: 429, detail: "account_locked" }, "signin"), {
    key: "au.err.locked",
    offerReset: true,
  });
  assert.equal(authProblem({ status: 400, detail: "reset_token_invalid" }, "reset").key, "au.err.resetInvalid");
});

test("a throttled forgot or reset request says to try later", () => {
  assert.equal(authProblem({ status: 429, detail: "Too many requests" }, "reset").key, "login.tooMany");
  assert.equal(authProblem({ status: 429 }, "forgot").key, "login.tooMany");
});

test("FastAPI's own 422 shape is read field by field", () => {
  const weak = { status: 422, detail: [{ loc: ["body", "password"], msg: "Value error, this password is too common" }] };
  assert.deepEqual(authProblem(weak, "signup"), { key: "au.err.weak", field: "password" });
  const reserved = {
    status: 422,
    detail: [{ loc: ["body", "email"], msg: "value is not a valid email address: The domain name example.test is a special-use or reserved name" }],
  };
  assert.deepEqual(authProblem(reserved, "signup"), { key: "au.err.emailDomain", field: "email" });
  const malformed = { status: 422, detail: [{ loc: ["body", "email"], msg: "An email address must have an @-sign." }] };
  assert.deepEqual(authProblem(malformed, "signup"), { key: "au.err.emailInvalid", field: "email" });
});

test("repeated sign-in failures say the account may be paused, without saying it exists", () => {
  assert.equal(authProblem({ status: 401, detail: "invalid email or password" }, "signin", 1).key, "login.errLogin");
  assert.equal(authProblem({ status: 401, detail: "invalid email or password" }, "signin", 3).key, "au.err.repeated");
  assert.equal(authProblem({ status: 401 }, "signin", 3).offerReset, true);
});

test("unknown errors fall back to the action's generic message; no status is the network", () => {
  assert.equal(authProblem({ status: 418, detail: "teapot" }, "signup").key, "login.errRegister");
  assert.equal(authProblem({ status: 418 }, "forgot").key, "au.err.generic");
  assert.equal(authProblem(new TypeError("Failed to fetch"), "signin").key, "au.err.network");
  assert.equal(authProblem({ status: 503 }, "signup").key, "au.err.network");
});

test("the client refuses short and common passwords before the server does", () => {
  assert.equal(passwordIssue("short"), "short");
  assert.equal(passwordIssue("password123"), "common");
  assert.equal(passwordIssue("dilnoza1998", "dilnoza1998@example.com"), "common");
  assert.equal(passwordIssue("Tong-otdi-7"), null);
  assert.ok(EMAIL_PATTERN.test("ism@example.com"));
  assert.ok(!EMAIL_PATTERN.test("ism@example"));
});

/* ---- C-09 ------------------------------------------------------------ */

test("next= accepts a path on this site and nothing else", () => {
  assert.equal(safeNext("/reja"), "/reja");
  assert.equal(safeNext("/dasturlar/abc?tab=1#x"), "/dasturlar/abc?tab=1#x");
  for (const bad of [
    "//evil.example/x",
    "/\\evil.example",
    "https://evil.example/",
    "javascript:alert(1)",
    "reja",
    "/\u0000x",
    "/login?mode=signin",
    "/parol-tiklash",
    "",
    null,
  ]) {
    assert.equal(safeNext(bad as string | null), null, String(bad));
  }
});

test("sign-in links carry the mode and a safe return address", () => {
  assert.equal(loginHref("signin", "/reja"), "/login?mode=signin&next=%2Freja");
  assert.equal(loginHref("signup"), "/login?mode=signup");
  assert.equal(loginHref("signin", "//evil.example"), "/login?mode=signin");
  assert.equal(loginHref("signin", "/"), "/login?mode=signin");
});

/* ---- J-01 ------------------------------------------------------------ */

test("the viewer stage follows score, plan and enrollments", async () => {
  const { deriveViewer, nextStepOf, GUEST, STAFF } = await import("./viewer");
  const base = { hasScore: false, hasActivePlan: false, enrollments: [], profile: { full_name: "Dilnoza", birth_date: "2000-01-01" }, learningProfileDone: false };

  const registered = deriveViewer(base);
  assert.equal(registered.stage, "registered");
  assert.equal(registered.profileIncomplete, false);
  assert.deepEqual(nextStepOf(registered), { href: "/kabinet/diagnostika", key: "vw.cta.assess" });

  const assessed = deriveViewer({ ...base, hasScore: true });
  assert.deepEqual(nextStepOf(assessed), { href: "/reja", key: "vw.cta.plan" });

  const planned = deriveViewer({ ...base, hasScore: true, hasActivePlan: true });
  assert.deepEqual(nextStepOf(planned), { href: "/reja", key: "vw.cta.planGo" });

  const learning = deriveViewer({
    ...base,
    hasScore: true,
    hasActivePlan: true,
    enrollments: [
      { status: "completed", program: { id: "p0", slug: "done" }, last_activity_at: "2026-11-10" },
      { status: "enrolled", program: { id: "p1", slug: "older" }, last_activity_at: "2026-11-01" },
      { status: "in_progress", program: { id: "p2", slug: "newer" }, last_activity_at: "2026-11-05" },
    ],
  });
  assert.deepEqual(learning.resume, { slug: "newer", programId: "p2" });
  assert.equal(learning.hasEnrollments, true);
  assert.deepEqual(nextStepOf(learning), { href: "/talim/kurslar/newer", key: "vw.cta.course" });

  assert.deepEqual(nextStepOf(GUEST), { href: "/login?mode=signup", key: "vw.cta.signup" });
  assert.deepEqual(nextStepOf(STAFF, "/hamkor"), { href: "/hamkor", key: "vw.cta.panel" });
});

test("a missing name or date of birth marks the profile incomplete; an unknown profile does not", async () => {
  const { deriveViewer } = await import("./viewer");
  const base = { hasScore: false, hasActivePlan: false, enrollments: [], learningProfileDone: false };
  assert.equal(deriveViewer({ ...base, profile: { full_name: "", birth_date: "2000-01-01" } }).profileIncomplete, true);
  assert.equal(deriveViewer({ ...base, profile: { full_name: "Dilnoza", birth_date: null } }).profileIncomplete, true);
  assert.equal(deriveViewer({ ...base, profile: null }).profileIncomplete, false);
});

/* ---- I-01 ------------------------------------------------------------ */

test("sign-out wipes one person's drafts and keeps the device's preferences", () => {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  local.setItem("womanup.diagnostic.v3", "{}");
  local.setItem("womanup.diagnostic.v3:u-1", "{}");
  local.setItem("womanup.lms.note.course.lesson", "my note");
  local.setItem("womanup.plan_generating_at", "1");
  local.setItem(OWNER_KEY, "u-1");
  local.setItem("womanup.locale", "ru");
  local.setItem("womanup.theme", "dark");
  local.setItem("womanup.session", "1");
  session.setItem("womanup.mascot.chat", "[]");
  session.setItem("womanup.session", "{}");

  clearPersonalData(local, session);

  assert.deepEqual(local.keys(), ["womanup.locale", "womanup.session", "womanup.theme"]);
  assert.deepEqual(session.keys(), ["womanup.session"]);
});

test("a different account signing in starts clean; the same one keeps her draft", () => {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  assert.equal(noteOwner("u-1", local, session), false);
  local.setItem("womanup.diagnostic.v3:u-1", "{\"owner\":\"u-1\"}");

  assert.equal(noteOwner("u-1", local, session), false);
  assert.ok(local.getItem("womanup.diagnostic.v3:u-1"));

  assert.equal(noteOwner("u-2", local, session), true);
  assert.equal(local.getItem("womanup.diagnostic.v3:u-1"), null);
  assert.equal(local.getItem(OWNER_KEY), "u-2");
});

/* ---- I-06 ------------------------------------------------------------ */

test("account deletion failures are named", async () => {
  const { ApiError } = await import("./api");
  const { deletionErrorKey } = await import("../components/auth/AccountSecurity");
  assert.equal(deletionErrorKey(new ApiError("x", 403, undefined, "password_incorrect")), "au.acc.wrongPassword");
  assert.equal(deletionErrorKey(new ApiError("x", 409, undefined, "last_admin")), "au.acc.lastAdmin");
  assert.equal(deletionErrorKey(new ApiError("x", 422, undefined, "confirmation_required")), "au.acc.typeDelete");
  assert.equal(deletionErrorKey(new ApiError("x", 500)), "au.acc.deleteErr");
});
