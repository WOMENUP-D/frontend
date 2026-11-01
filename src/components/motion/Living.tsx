"use client";

import { useEffect } from "react";
import { pointInBox } from "./math";

/**
 * Blossom light.
 *
 * Where the pointer rests on a card, the card warms — a soft pink light that
 * follows the cursor, the same tint the paper takes under the branch. The
 * light itself is CSS (`::after` on each host, see globals.css); this
 * component only tells the host where the pointer is, as two custom
 * properties, so there is one listener for the whole page rather than one per
 * card.
 *
 * Fine pointers only: a finger has no hover, and the light would sit wherever
 * the last tap landed. Under reduced motion the light stays centred and still.
 */
const HOSTS =
  ".tile, .face-card, .prog-card, .ev-card, .jb-card, .cp-card, .wk-tile, .dash-next";

export function LivingUI() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let last: PointerEvent | null = null;
    let current: HTMLElement | null = null;

    const paint = () => {
      frame = 0;
      if (!last) return;
      const target = last.target instanceof Element ? last.target : null;
      const host = target?.closest<HTMLElement>(HOSTS) ?? null;
      if (host !== current) {
        current?.style.removeProperty("--mx");
        current?.style.removeProperty("--my");
        current = host;
      }
      if (!host) return;
      const { x, y } = pointInBox(last.clientX, last.clientY, host.getBoundingClientRect());
      host.style.setProperty("--mx", x);
      host.style.setProperty("--my", y);
    };
    const onMove = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
