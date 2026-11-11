/**
 * What a failed sign-in, sign-up or reset means, in words she can act on
 * (C-08, C-10, C-20).
 *
 * The API keeps `detail` a stable machine string — `email_taken`,
 * `weak_password`, `email_domain_unsupported`, `account_locked`,
 * `reset_token_invalid`, … — and this maps it to a message key and, when the
 * problem is one field's, to that field. A validation error in FastAPI's own
 * shape (a list of `{loc, msg}`) is read the same way, so an older server
 * still produces a useful sentence. Anything unknown falls back to the
 * generic message for the action. Pure, so it is tested without a page.
 */

export type AuthField = "name" | "email" | "password" | "birth" | "consent";

export type AuthErrorKey =
  | "login.tooMany"
  | "login.errLogin"
  | "login.errRegister"
  | "au.err.taken"
  | "au.err.weak"
  | "au.err.emailDomain"
  | "au.err.emailInvalid"
  | "au.err.locked"
  | "au.err.repeated"
  | "au.err.network"
  | "au.err.resetInvalid"
  | "au.err.generic";

export interface AuthProblem {
  key: AuthErrorKey;
  /** The field it belongs beside, when it is one field's. */
  field?: AuthField;
  /** Offer the forgotten-password link next to it. */
  offerReset?: boolean;
  /** Offer switching to sign-in, keeping the address (an existing account). */
  offerSignIn?: boolean;
}

interface ErrorLike {
  status?: number;
  detail?: unknown;
}

function code(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const reason = (detail as { reason?: unknown; code?: unknown }).reason ?? (detail as { code?: unknown }).code;
    if (typeof reason === "string") return reason;
  }
  return null;
}

/** FastAPI's 422: `[{loc: ["body", "password"], msg: "..."}]`. */
function validationField(detail: unknown): { field: "email" | "password"; msg: string } | null {
  if (!Array.isArray(detail)) return null;
  for (const item of detail) {
    const loc = Array.isArray(item?.loc) ? item.loc.map(String) : [];
    const msg = String(item?.msg ?? "");
    if (loc.includes("password") || loc.includes("new_password")) return { field: "password", msg };
    if (loc.includes("email")) return { field: "email", msg };
  }
  return null;
}

/**
 * @param action what was being done
 * @param failures how many sign-in attempts in a row have failed on this page,
 *   counting this one — after three the message also says the account may be
 *   paused and how to get back in, without saying whether the account exists.
 */
export function authProblem(
  error: unknown,
  action: "signin" | "signup" | "forgot" | "reset",
  failures = 1,
): AuthProblem {
  const err = (error ?? {}) as ErrorLike;
  const status = typeof err.status === "number" ? err.status : null;
  if (status === null) return { key: "au.err.network" };
  const detail = code(err.detail);

  switch (detail) {
    case "email_taken":
      return { key: "au.err.taken", field: "email", offerSignIn: true };
    case "weak_password":
      return { key: "au.err.weak", field: "password" };
    case "email_domain_unsupported":
      return { key: "au.err.emailDomain", field: "email" };
    case "account_locked":
      return { key: "au.err.locked", offerReset: true };
    case "reset_token_invalid":
      return { key: "au.err.resetInvalid" };
  }

  if (status === 409 && action === "signup") {
    return { key: "au.err.taken", field: "email", offerSignIn: true };
  }
  if (status === 429) return { key: "login.tooMany", offerReset: action === "signin" };

  if (status === 422 || status === 400) {
    const field = validationField(err.detail);
    if (field?.field === "password") return { key: "au.err.weak", field: "password" };
    if (field?.field === "email") {
      // Pydantic's email check explains a reserved or special-use domain in
      // words; anything else about the address is a malformed one.
      return /reserved|special-use|domain|deliverable/i.test(field.msg)
        ? { key: "au.err.emailDomain", field: "email" }
        : { key: "au.err.emailInvalid", field: "email" };
    }
  }

  if (action === "signin" && status === 401) {
    return failures >= 3
      ? { key: "au.err.repeated", offerReset: true }
      : { key: "login.errLogin", offerReset: true };
  }
  if (status >= 500) return { key: "au.err.network" };
  if (action === "signup") return { key: "login.errRegister" };
  if (action === "signin") return { key: "login.errLogin", offerReset: true };
  return { key: "au.err.generic" };
}

/** The most common passwords, refused before they reach the server. A short
 *  list on purpose: the server's is the authority, this only saves a round
 *  trip and says it beside the field. */
const COMMON = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwertyui", "qwerty123", "11111111", "00000000", "iloveyou", "parol123",
  "abcd1234", "admin123", "87654321", "qwertyuiop",
]);

/** Why a new password would be refused, or null when it looks acceptable. */
export function passwordIssue(password: string, email = ""): "short" | "common" | null {
  if (password.length < 8) return "short";
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "common";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local && local.length >= 3 && lower === local) return "common";
  return null;
}

/** Good enough to catch a typo; the server decides. A dot and a two-letter
 *  ending after the @, no spaces. Reserved test domains are the server's call
 *  and come back as `email_domain_unsupported`. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
