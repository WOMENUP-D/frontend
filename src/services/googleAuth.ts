/**
 * Signing in with Google, through Firebase Authentication.
 *
 * Firebase runs the whole OAuth exchange with Google and hands back an ID
 * token. That token goes to our API, which verifies it with the Firebase Admin
 * SDK before it will look up or create anything — so nothing this file claims
 * about who she is is trusted, and no secret is needed here.
 *
 * A popup is used because it keeps her on the page. Browsers that refuse
 * popups — most in-app browsers, Telegram's and Instagram's among them, which
 * is how a great many women here open links — fall back to a full-page
 * redirect, and `completeGoogleRedirect` picks the result up on the way back.
 */

import { firebaseAuth, firebaseConfigured } from "./firebase";

export { firebaseConfigured as googleConfigured };

/** She closed the popup or declined. Not an error worth showing her. */
export class GoogleCancelled extends Error {
  constructor() {
    super("google-cancelled");
    this.name = "GoogleCancelled";
  }
}

/** The SDK never loaded, or Firebase refused the request. */
export class GoogleUnavailable extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "GoogleUnavailable";
  }
}

/** Firebase codes that mean "she changed her mind", not "something broke". */
const CANCELLED = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

/** Codes that mean the popup could not open — a redirect is the way through. */
const NEEDS_REDIRECT = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
]);

function codeOf(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}

/**
 * Open Google's sign-in and resolve with the Firebase ID token.
 *
 * Must be called straight from a click handler — a popup opened later in the
 * task is blocked by every browser.
 *
 * Resolves to `null` when the browser was sent off on a full-page redirect:
 * there is no token yet, and the page is about to be replaced.
 */
export async function requestGoogleIdToken(): Promise<string | null> {
  if (!firebaseConfigured()) throw new GoogleUnavailable("google-not-configured");

  const [auth, { GoogleAuthProvider, signInWithPopup, signInWithRedirect }] = await Promise.all([
    firebaseAuth(),
    import("firebase/auth"),
  ]).catch(() => {
    throw new GoogleUnavailable("google-script-blocked");
  });

  const provider = new GoogleAuthProvider();
  // Always offer the account chooser: shared handsets are common, and silently
  // reusing whoever signed in last is how one woman ends up in another's
  // cabinet.
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    return await result.user.getIdToken();
  } catch (error) {
    const code = codeOf(error);
    if (CANCELLED.has(code)) throw new GoogleCancelled();

    if (NEEDS_REDIRECT.has(code)) {
      await signInWithRedirect(auth, provider);
      return null; // the page is navigating away
    }
    throw new GoogleUnavailable(code || "google-failed");
  }
}

/**
 * The token waiting after a redirect sign-in, or `null` on a normal load.
 *
 * Called once when the sign-in screen mounts. Silent by design: a woman who
 * simply opened the page must not be shown an error because there was nothing
 * to pick up.
 */
export async function completeGoogleRedirect(): Promise<string | null> {
  if (!firebaseConfigured()) return null;
  try {
    const [auth, { getRedirectResult }] = await Promise.all([
      firebaseAuth(),
      import("firebase/auth"),
    ]);
    const result = await getRedirectResult(auth);
    return result ? await result.user.getIdToken() : null;
  } catch {
    return null;
  }
}

/** Drop Firebase's own session on sign-out, so the next person starts clean. */
export async function googleSignOut(): Promise<void> {
  if (!firebaseConfigured()) return;
  try {
    const [auth, { signOut }] = await Promise.all([firebaseAuth(), import("firebase/auth")]);
    await signOut(auth);
  } catch {
    // Our tokens are already gone; a stale Firebase session is harmless.
  }
}
