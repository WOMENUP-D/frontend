/**
 * Who is looking at the page, in the one sense every state-dependent call to
 * action needs (J-01).
 *
 * The home page, the cabinet, the guide and the sign-in page each used to
 * decide for themselves — or not at all — what she had already done. So a
 * woman with a plan was offered "Create an account", and a woman with a score
 * was told she had no assessment (C-05, C-06, C-26). This is the single
 * answer they all read:
 *
 *   guest       no session in this tab
 *   staff       a coordinator, moderator, administrator or organisation person
 *   registered  signed in, no Development Score yet
 *   assessed    has a score, no active plan
 *   planned     has an active plan
 *
 * plus the facts the stages do not carry: the course she is in the middle of,
 * whether she has any enrollment at all, whether her profile lacks the name
 * or date of birth the age gate depends on, and whether the (separate,
 * optional) learning questionnaire is done.
 *
 * The stage is derived by a pure function (tested); the loader asks five
 * cheap endpoints once, in parallel, and keeps the answer per account until
 * the token changes or a page that changed it calls `invalidateViewer`.
 */

import { ApiError, getAccessToken, isStaff, onTokenChange } from "./api";
import { portal } from "./portal";
import { decodeSubject } from "./tokenStore";

export type ViewerStage = "guest" | "staff" | "registered" | "assessed" | "planned";

export interface ViewerState {
  stage: ViewerStage;
  /** The course to continue: the most recently touched unfinished one. */
  resume: { slug: string; programId: string } | null;
  /** Any enrollment at all, finished or not. */
  hasEnrollments: boolean;
  /** Name or date of birth missing — onboarding was skipped or failed (C-16). */
  profileIncomplete: boolean;
  /** The optional learning questionnaire on /welcome is answered. */
  learningProfileDone: boolean;
}

export const GUEST: ViewerState = {
  stage: "guest",
  resume: null,
  hasEnrollments: false,
  profileIncomplete: false,
  learningProfileDone: false,
};

export const STAFF: ViewerState = { ...GUEST, stage: "staff" };

interface EnrollmentLike {
  status: string;
  program_id?: string;
  program?: { id?: string; slug?: string } | null;
  last_activity_at?: string | null;
  started_at?: string | null;
}

export interface ViewerFacts {
  hasScore: boolean;
  hasActivePlan: boolean;
  enrollments: EnrollmentLike[];
  profile: { full_name?: string | null; birth_date?: string | null } | null;
  learningProfileDone: boolean;
}

/** The stage and the facts beside it, from what the API said. Pure. */
export function deriveViewer(facts: ViewerFacts): ViewerState {
  const unfinished = facts.enrollments
    .filter((item) => item.status !== "completed" && item.status !== "dropped" && item.program?.slug)
    .sort((a, b) =>
      String(b.last_activity_at ?? b.started_at ?? "").localeCompare(String(a.last_activity_at ?? a.started_at ?? "")),
    );
  const current = unfinished[0];
  const stage: ViewerStage = facts.hasActivePlan ? "planned" : facts.hasScore ? "assessed" : "registered";
  return {
    stage,
    resume: current?.program?.slug
      ? { slug: current.program.slug, programId: current.program.id ?? current.program_id ?? "" }
      : null,
    hasEnrollments: facts.enrollments.length > 0,
    // Unknown (the call failed) is not "incomplete": nagging her on an outage
    // would be wrong, and the sign-up form asks for both anyway.
    profileIncomplete: facts.profile !== null && !(facts.profile.full_name?.trim() && facts.profile.birth_date),
    learningProfileDone: facts.learningProfileDone,
  };
}

/** Where her one next step is, and what it is called. Pure. */
export function nextStepOf(
  state: ViewerState,
  panelHref = "/admin",
): { href: string; key: "vw.cta.signup" | "vw.cta.assess" | "vw.cta.plan" | "vw.cta.course" | "vw.cta.planGo" | "vw.cta.panel" } {
  switch (state.stage) {
    case "guest":
      return { href: "/login?mode=signup", key: "vw.cta.signup" };
    case "staff":
      return { href: panelHref, key: "vw.cta.panel" };
    case "registered":
      return { href: "/kabinet/diagnostika", key: "vw.cta.assess" };
    case "assessed":
      return { href: "/reja", key: "vw.cta.plan" };
    case "planned":
      return state.resume
        ? { href: `/talim/kurslar/${state.resume.slug}`, key: "vw.cta.course" }
        : { href: "/reja", key: "vw.cta.planGo" };
  }
}

/* ---- the loader and its cache ----------------------------------------- */

let cached: { subject: string; at: number; promise: Promise<ViewerState> } | null = null;

/** How long an answer is believed without asking again. Pages that change
 *  the stage call `invalidateViewer`; the rest (a plan accepted, a course
 *  enrolled in on another page) is picked up when this runs out. */
const FRESH_MS = 20_000;
const listeners = new Set<() => void>();

/** A 404 is an answer ("none"); anything else is "unknown". */
async function exists(call: () => Promise<unknown>): Promise<boolean | null> {
  try {
    await call();
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return false;
    return null;
  }
}

async function load(): Promise<ViewerState> {
  const [score, plan, enrollments, profile, learning] = await Promise.all([
    exists(() => portal.score()),
    exists(() => portal.activePlan()),
    (portal.myEnrollments() as Promise<EnrollmentLike[]>).catch(() => [] as EnrollmentLike[]),
    (portal.profile() as Promise<ViewerFacts["profile"]>).catch(() => null),
    portal.learningProfile().then((lp) => Boolean(lp?.completed)).catch(() => false),
  ]);
  return deriveViewer({
    hasScore: score === true,
    hasActivePlan: plan === true,
    enrollments,
    profile,
    learningProfileDone: learning,
  });
}

/** The state right now, without a request — or null when it must be asked. */
export function viewerNow(): ViewerState | null {
  const token = getAccessToken();
  if (!token) return GUEST;
  if (isStaff()) return STAFF;
  return null;
}

/** The current viewer, asked once per account and kept. */
export function getViewer(): Promise<ViewerState> {
  const now = viewerNow();
  if (now) return Promise.resolve(now);
  const subject = decodeSubject(getAccessToken()) ?? "?";
  if (!cached || cached.subject !== subject || Date.now() - cached.at > FRESH_MS) {
    cached = { subject, at: Date.now(), promise: load() };
  }
  return cached.promise;
}

/** She did something that moves her stage (finished the diagnostic, accepted
 *  a plan, enrolled): ask again next time. */
export function invalidateViewer(): void {
  cached = null;
  for (const listener of [...listeners]) listener();
}

/** Re-render when the viewer may have changed. */
export function onViewerChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}


// A different token is a different viewer: sign-in, sign-out, a session that
// died in the background.
if (typeof window !== "undefined") {
  let lastSubject: string | null = decodeSubject(getAccessToken());
  onTokenChange((token) => {
    const subject = decodeSubject(token);
    if (subject !== lastSubject) {
      lastSubject = subject;
      invalidateViewer();
    }
  });
}
