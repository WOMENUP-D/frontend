/**
 * Shared marker for "a roadmap is being generated right now".
 *
 * Generation is a call to Opus at high effort and takes the better part of a
 * minute. That is fine as long as it is started at the moment the assessment
 * finishes rather than when she opens the roadmap — the wait then happens while
 * she is reading her results and walking to the next screen instead of in front
 * of an empty page.
 *
 * The cost of starting it early is that the plan row does not exist until the
 * model answers, so the roadmap page cannot tell "nothing has been generated" from
 * "generation is in flight" by looking at the database. Without that distinction
 * it starts a second one, and she ends up with two drafts and two model calls.
 *
 * This is the distinction, kept in the browser because it is about one tab's
 * user journey and nothing else needs to know. It expires on its own: a marker
 * left behind by a closed tab or a failed request stops being believed after
 * `WINDOW_MS`, and the page generates rather than waiting for something that is
 * never coming.
 */

const KEY = "womanup.plan_generating_at";

/** Long enough for a slow model call, short enough that a stale marker cannot
 *  strand the page for more than one attempt's worth of patience. */
const WINDOW_MS = 3 * 60 * 1000;

export function markPlanGenerating(): void {
  try {
    window.localStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Private mode or blocked storage: the roadmap page then generates its own
    // draft, which is the pre-existing behaviour rather than a broken one.
  }
}

export function isPlanGenerating(): boolean {
  try {
    const at = Number(window.localStorage.getItem(KEY));
    return Boolean(at) && Date.now() - at < WINDOW_MS;
  } catch {
    return false;
  }
}

export function clearPlanGenerating(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear if storage is unavailable */
  }
}
