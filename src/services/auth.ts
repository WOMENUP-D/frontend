import {
  api,
  broadcastSignedOut,
  clearSession,
  endServerSession,
  getAccessToken,
  request,
  setAccessToken,
} from "./api";
import { browserStorages, clearPersonalData } from "./personalData";
import { googleSignOut } from "./googleAuth";

export interface TokenPair {
  access_token: string;
  /** Null for browsers: the refresh token travels as an HttpOnly cookie. */
  refresh_token: string | null;
  token_type: string;
  expires_in: number;
}

export interface GoogleTokenPair extends TokenPair {
  is_new_user: boolean;
  onboarding_completed: boolean;
  email: string | null;
  given_name: string;
  family_name: string;
  avatar_url: string | null;
}

/** Where the API stashes the name Google gave us, for the onboarding step to
 *  prefill. Session-scoped and cleared on read: it is a handoff, not storage. */
const GOOGLE_HANDOFF_KEY = "womanup.google_name";

/** Trade a Firebase ID token for our own session.
 *
 *  The server verifies the token with the Firebase Admin SDK before it will
 *  look anything up, so a forged one buys nothing.
 */
export async function googleLogin(idToken: string): Promise<GoogleTokenPair> {
  const result = await api.post<GoogleTokenPair>("/auth/google", { id_token: idToken });
  setAccessToken(result.access_token);

  if (result.given_name || result.family_name) {
    try {
      window.sessionStorage.setItem(
        GOOGLE_HANDOFF_KEY,
        JSON.stringify({ name: result.given_name, surname: result.family_name }),
      );
    } catch {
      // Private mode can refuse session storage; onboarding just starts blank.
    }
  }
  return result;
}

/** Read and clear the name Google supplied, so onboarding starts filled in. */
export function takeGoogleName(): { name: string; surname: string } | null {
  try {
    const raw = window.sessionStorage.getItem(GOOGLE_HANDOFF_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(GOOGLE_HANDOFF_KEY);
    const parsed = JSON.parse(raw);
    return { name: String(parsed.name ?? ""), surname: String(parsed.surname ?? "") };
  } catch {
    return null;
  }
}

/** Open an account. She is signed in by the same call. */
/** The policy edition the form showed her. Sent with the agreement, because
 *  "she agreed" only means something if the record says what she agreed to. */
export const PRIVACY_POLICY_VERSION = "1.0";

export async function register(email: string, password: string, acceptedPolicy: boolean) {
  const tokens = await api.post<TokenPair>("/auth/register", {
    email,
    password,
    accepted_privacy_policy: acceptedPolicy,
    policy_version: PRIVACY_POLICY_VERSION,
  });
  setAccessToken(tokens.access_token);
  return tokens;
}

/** Come back to an account. */
export async function passwordLogin(email: string, password: string) {
  const tokens = await api.post<TokenPair>("/auth/login", { email, password });
  setAccessToken(tokens.access_token);
  return tokens;
}

/**
 * Sign out of this browser.
 *
 * The tab forgets the session at once — the header changes on the click —
 * then the server is told and the call is awaited, carrying the refresh
 * cookie so the session is revoked even when the access token has already
 * expired (C-03). Other tabs are told too, and what this person left in the
 * browser (a diagnostic draft, lesson notes, the companion's chat) is wiped
 * so the next person on a shared phone does not inherit it (I-01).
 */
export async function logout(): Promise<void> {
  const access = getAccessToken();
  forgetLocally();
  await endServerSession(access);
}

/** Everything this browser holds for her, gone — without a server call. */
function forgetLocally(): void {
  clearSession();
  broadcastSignedOut();
  const { local, session } = browserStorages();
  clearPersonalData(local, session);
  // Firebase keeps its own session. On a shared handset, leaving it behind
  // would let the next person back in with one click.
  void googleSignOut();
}

/** Staff sign-in: a login and a password, never an SMS code. */
export function staffLogin(login: string, password: string) {
  return api.post<TokenPair>("/auth/staff/login", { login, password });
}


/** End every session of this account, on every device (C-17). She signs in
 *  again here afterwards. Throws when the server did not confirm it, so the
 *  page can say so instead of pretending it happened. */
export async function logoutEverywhere(): Promise<void> {
  await api.post<unknown>("/auth/logout-all", {});
  forgetLocally();
}

/* ---- QA Phase 2 (auth): forgotten password (C-04) and deletion (I-06) ---- */

/** Ask for a reset link. The API answers 202 whether or not the address has
 *  an account, so nothing here can tell her which. */
export function requestPasswordReset(email: string, language?: string): Promise<unknown> {
  // The e-mail is written in the language she is reading the page in.
  return api.post<unknown>("/auth/password/forgot", language ? { email, language } : { email });
}

/** Set a new password with the token from the emailed link. Every session of
 *  the account is revoked by the server, this browser's included. */
export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post<unknown>("/auth/password/reset", { token, password });
  forgetLocally();
}

/** What the deletion call needs to prove it is her: the current password, or
 *  — for an account that has none (Google) — the typed word DELETE. */
export type DeletionProof = { password: string } | { confirm: "DELETE" };

/** Delete the account. On success this browser forgets everything about her. */
export async function deleteAccount(proof: DeletionProof): Promise<void> {
  await request<unknown>("/users/me", { method: "DELETE", body: JSON.stringify(proof) });
  forgetLocally();
}
