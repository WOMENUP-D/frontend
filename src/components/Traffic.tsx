"use client";

/**
 * Records one page view per navigation.
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
import { getAccessToken } from "@/services/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function Traffic() {
  const pathname = usePathname();
  // React runs effects twice in development; without this the first view of
  // every route would be counted twice.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return;
    lastSent.current = pathname;

    const locale =
      typeof window !== "undefined" ? window.localStorage.getItem("womanup.locale") : null;

    // Without the token every view records as anonymous and the dashboard's
    // "signed in" share sits at zero however many members are browsing.
    const token = getAccessToken();

    void fetch(`${BASE_URL}/analytics/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // Carries the first-party visitor cookie so the same person is not
      // counted afresh on every page.
      credentials: "include",
      body: JSON.stringify({ path: pathname, locale }),
      keepalive: true,
    }).catch(() => {
      /* analytics is never worth an error in front of a user */
    });
  }, [pathname]);

  return null;
}
