/**
 * What the browser tells the platform about itself — and only that.
 *
 * Three calls, all silent: a view, a heartbeat, an event. None of them ever
 * blocks a render or shows an error; a failed beacon is dropped. The server
 * owns every business outcome (a registration, an enrollment, a completed
 * diagnostic) and records those beside the records themselves — this module
 * reports the few steps only the browser can see: a sign-up form started, a
 * diagnostic begun, a course page read, a search typed, a script that failed.
 *
 * Nothing personal leaves here. Event names and property keys are a fixed list
 * the server checks; the path is folded to a known screen on the server; the
 * visitor cookie is first-party and HttpOnly, so this code never even reads it.
 *
 * A developer or tester can keep her own browsing out of the figures:
 *   localStorage.setItem("womanup.analytics", "off")
 */

import { getAccessToken } from "./api";
import { currentSession } from "./session";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const OPT_OUT_KEY = "womanup.analytics";

export type ClientEvent =
  | "registration_started"
  | "development_test_started"
  | "program_viewed"
  | "catalogue_search"
  | "client_error";

type Scalar = string | number | boolean;

export interface TrackOptions {
  path?: string;
  entity_type?: string;
  entity_id?: string;
  properties?: Record<string, Scalar | undefined>;
}

export function optedOut(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === "off";
  } catch {
    return false;
  }
}

function headers(): Record<string, string> {
  const token = getAccessToken();
  const session = currentSession();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(session ? { "X-WU-Session": session } : {}),
  };
}

function send(endpoint: string, body: unknown): void {
  if (optedOut()) return;
  try {
    void fetch(`${BASE_URL}/analytics/${endpoint}`, {
      method: "POST",
      headers: headers(),
      // Carries the first-party visitor cookie so the same person is not
      // counted afresh on every page.
      credentials: "include",
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {
      /* analytics is never worth an error in front of a user */
    });
  } catch {
    /* and never a thrown one either */
  }
}

export function recordView(input: {
  path: string;
  locale: string | null;
  session: string | null;
  entry: boolean;
  referrer?: string;
}): void {
  send("view", input);
}

export function heartbeat(path: string): void {
  send("heartbeat", { path, session: currentSession() });
}

/** One step the browser saw. Unknown names are refused by the server. */
export function track(name: ClientEvent, options: TrackOptions = {}): void {
  const properties = Object.fromEntries(
    Object.entries(options.properties ?? {}).filter(([, value]) => value !== undefined),
  );
  send("event", {
    name,
    path: options.path ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    session: currentSession(),
    locale: typeof window !== "undefined" ? window.localStorage.getItem("womanup.locale") : null,
    entity_type: options.entity_type,
    entity_id: options.entity_id,
    properties,
  });
}

/**
 * Uncaught errors, reported as a name and a short message — enough to see that
 * a screen is breaking for people, never enough to see what they typed. At
 * most one report every ten seconds, so a loop cannot flood the table.
 */
export function installErrorTracking(): () => void {
  if (typeof window === "undefined") return () => {};
  let last = 0;
  const report = (name: string, message: string) => {
    const now = Date.now();
    if (now - last < 10_000) return;
    last = now;
    track("client_error", { properties: { name: name.slice(0, 40), message: message.slice(0, 120) } });
  };
  const onError = (event: ErrorEvent) =>
    report(event.error?.name ?? "Error", event.message ?? "");
  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason as { name?: string; message?: string } | string | undefined;
    if (typeof reason === "string") report("UnhandledRejection", reason);
    else report(reason?.name ?? "UnhandledRejection", reason?.message ?? "");
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
