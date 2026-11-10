"use client";

/**
 * Resumes the session before the page renders anything that depends on it.
 *
 * The access token lives in memory, so a reload starts without one. Pages
 * decide what to show from `getAccessToken()` on mount; rendering them before
 * the session is back would show a signed-in woman the guest view for a
 * moment and send her to the sign-in form from pages that need an account. So
 * the tree waits — for a guest not at all (no session marker, nothing to ask),
 * for a signed-in woman one same-origin request.
 */

import { useEffect, useState, type ReactNode } from "react";
import { bootstrapSession } from "@/services/api";

export function SessionGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    bootstrapSession()
      .catch(() => false)
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
