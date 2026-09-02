"use client";

import { useEffect } from "react";
import { CANOPY_ZONES } from "./Sakura";

/**
 * Petals shed by the background sakura. They are seeded inside the canopy box
 * rather than across the whole viewport, so they read as coming off the tree.
 *
 * Purely decorative: the container is pointer-events:none and sits behind all
 * content, so it can never intercept a click or cover a control.
 */
export function Petals() {
  useEffect(() => {
    // Honour the OS "reduce motion" setting — don't even build the nodes.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const box = document.createElement("div");
    box.className = "petals";
    box.setAttribute("aria-hidden", "true");
    document.body.appendChild(box);

    const MAX = 10; // a few at a time — the fall should feel light, not busy
    const timers: ReturnType<typeof setTimeout>[] = [];

    const petal = () => {
      // Skip work while the tab is hidden — animations are paused anyway and
      // the nodes would just pile up until the user comes back.
      if (document.hidden || box.childElementCount >= MAX) return;

      const el = document.createElement("div");
      el.className = "petal";

      // Pick a branch to fall from, weighted by how much blossom it carries,
      // then a point inside it biased toward the lower edge where the outer
      // twigs are.
      const total = CANOPY_ZONES.reduce((sum, z) => sum + z.weight, 0);
      let ticket = Math.random() * total;
      const zone =
        CANOPY_ZONES.find((z) => (ticket -= z.weight) <= 0) ?? CANOPY_ZONES[0];
      const x = zone.left + Math.random() * zone.width;
      const y = zone.top + zone.height * (0.3 + Math.random() * 0.7);

      const duration = 9 + Math.random() * 9; // slower than a greeting card
      const delay = Math.random() * 3;
      const width = 6 + Math.random() * 6;
      // Drift left as it falls, the way a real petal slips off the branch.
      const drift = (Math.random() < 0.75 ? -1 : 1) * (40 + Math.random() * 210);

      el.style.cssText =
        `left:${x}vw;top:${y}vh;width:${width}px;height:${width * 1.45}px;` +
        `--drift:${drift}px;--spin:${Math.random() < 0.5 ? 540 : -720}deg;` +
        `animation-duration:${duration}s;animation-delay:${delay}s;`;

      box.appendChild(el);
      timers.push(setTimeout(() => el.remove(), (duration + delay) * 1000 + 500));
    };

    const seed = (count: number) => {
      for (let i = 0; i < count; i += 1) petal();
    };

    seed(7);
    // Spawn faster than petals expire, so the population sits at MAX and the
    // fall never thins out. The MAX guard is what actually caps it.
    const interval = setInterval(petal, 1100);

    // Coming back to a backgrounded tab: timers were throttled and the old
    // petals have expired, so refill immediately instead of an empty sky.
    const onVisible = () => {
      if (!document.hidden) seed(5);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", onVisible);
      box.remove();
    };
  }, []);

  return null;
}
