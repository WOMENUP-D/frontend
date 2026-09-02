import { api, clearTokens, setTokens } from "./api";
import { googleSignOut } from "./googleAuth";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export async function requestOtp(
  identifier: { phone?: string; email?: string },
  language = "uz",
) {
  return api.post<{ detail: string }>("/auth/otp/request", { ...identifier, language });
}

export async function verifyOtp(
  identifier: { phone?: string; email?: string },
  code: string,
) {
  const tokens = await api.post<TokenPair>("/auth/otp/verify", { ...identifier, code });
  setTokens(tokens.access_token, tokens.refresh_token);
  return tokens;
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
  setTokens(result.access_token, result.refresh_token);

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
  setTokens(tokens.access_token, tokens.refresh_token);
  return tokens;
}

/** Come back to an account. */
export async function passwordLogin(email: string, password: string) {
  const tokens = await api.post<TokenPair>("/auth/login", { email, password });
  setTokens(tokens.access_token, tokens.refresh_token);
  return tokens;
}

export function logout(): void {
  clearTokens();
  try {
    window.sessionStorage.removeItem(GOOGLE_HANDOFF_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
  // Firebase keeps its own session. On a shared handset, leaving it behind
  // would let the next person back in with one click.
  void googleSignOut();
}

/** Staff sign-in: a login and a password, never an SMS code. */
export function staffLogin(login: string, password: string) {
  return api.post<TokenPair>("/auth/staff/login", { login, password });
}
