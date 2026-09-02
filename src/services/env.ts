/**
 * Build-time switches.
 *
 * `NEXT_PUBLIC_*` values are inlined when the site is built, so these are
 * constants at run time — reading them costs nothing and they cannot change
 * under a running page.
 */

/** Whether this build is a demonstration of the portal rather than the portal.
 *
 *  Off unless explicitly switched on. Two things hang on it: the banner across
 *  the top, and the list of ready-made accounts on the sign-in screen. The
 *  second is why the default has to be off — that list publishes a working
 *  password, which is a demonstration convenience and a live-site hole. */
export function showDemo(): boolean {
  return (process.env.NEXT_PUBLIC_DEMO ?? "").toLowerCase() === "true";
}
