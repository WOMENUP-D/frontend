"use client";

/**
 * The page's ornaments, loaded after the page itself (QA H-02).
 *
 * The companion and the falling petals are on every route but are nobody's
 * reason for opening it. They used to be in the first bundle of every page;
 * now each is its own chunk, fetched once the browser is idle after the first
 * render, so the content and its controls arrive first on a slow connection.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Mascot = dynamic(() => import("./mascot/Mascot").then((m) => m.Mascot), { ssr: false });
const Petals = dynamic(() => import("./Petals").then((m) => m.Petals), { ssr: false });

function useIdle(): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setIdle(true), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setIdle(true), 1200);
    return () => window.clearTimeout(id);
  }, []);
  return idle;
}

export function DeferredMascot() {
  return useIdle() ? <Mascot /> : null;
}

export function DeferredPetals() {
  return useIdle() ? <Petals /> : null;
}
