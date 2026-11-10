"use client";

/**
 * Records one page view per navigation, keeps presence alive while the tab is
 * visible, and reports scripts that fail.
 *
 * Nothing counted visits before this: the dashboard could report registered
 * and active accounts, but a woman who read the catalogue and left — or any of
 * the guests the assistant answers — left no trace at all.
 *
 * Deliberately silent. It never blocks a render, never shows an error, and a
 * failed beacon is dropped: analytics must not be able to break a page.
 */

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { heartbeat, installErrorTracking, optedOut, recordView } from "@/services/analytics";
import { touchSession } from "@/services/session";

// How often a visible tab says "still here". The server counts a visitor as
// online for five minutes after the last signal, so once a minute is enough.
const HEARTBEAT_MS = 60_000;

export function Traffic() {
  const pathname = usePathname();
  // React runs effects twice in development; without this the first view of
  // every route would be counted twice.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return;
    lastSent.current = pathname;
    if (optedOut()) return;

    const locale = window.localStorage.getItem("womanup.locale");
    const session = touchSession();

    recordView({
      path: pathname,
      locale,
      session: session?.id ?? null,
      // The first screen of a session is the landing page, and the referrer
      // is read there and nowhere else: a click between two portal pages is
      // navigation, not a source.
      entry: session?.started ?? false,
      referrer: session?.started ? document.referrer || undefined : undefined,
    });
  }, [pathname]);

  useEffect(() => {
    if (optedOut()) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      touchSession();
      heartbeat(window.location.pathname);
    };
    const timer = window.setInterval(tick, HEARTBEAT_MS);
    const uninstall = installErrorTracking();
    return () => {
      window.clearInterval(timer);
      uninstall();
    };
  }, []);

  return null;
}
