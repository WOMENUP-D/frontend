/** sessionStorage key: the address typed on the sign-in form, handed to the
 *  forgotten-password form once (read and removed there). */
export const RESET_EMAIL_KEY = "womanup.reset_email";

export function takeResetEmail(): string {
  try {
    const value = window.sessionStorage.getItem(RESET_EMAIL_KEY) ?? "";
    window.sessionStorage.removeItem(RESET_EMAIL_KEY);
    return value;
  } catch {
    return "";
  }
}
