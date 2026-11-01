"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { countAt } from "./math";

/**
 * Scroll-triggered arrival.
 *
 * The server renders everything visible. Only once the first `Reveal` mounts
 * does the page opt in (`html[data-motion="on"]`), so a visitor without
 * JavaScript — or one whose script fails — never meets a blank section. The
 * hidden state is one CSS rule, the arrival is one CSS animation; this file
 * only decides *when*.
 *
 * One IntersectionObserver is shared by every instance and each element is
 * watched exactly once: it arrives, it is forgotten.
 */

let observer: IntersectionObserver | null = null;
const pending = new WeakMap<Element, () => void>();

function markMotion() {
  if (typeof document !== "undefined") document.documentElement.dataset.motion = "on";
}

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function alreadyOnScreen(el: Element): boolean {
  const box = el.getBoundingClientRect();
  return box.top < window.innerHeight * 0.95 && box.bottom > 0;
}

/** Calls `onEnter` once, the first time `el` scrolls into view. */
export function whenVisible(el: Element, onEnter: () => void): () => void {
  if (typeof IntersectionObserver === "undefined" || alreadyOnScreen(el)) {
    onEnter();
    return () => {};
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        pending.get(entry.target)?.();
        pending.delete(entry.target);
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  pending.set(el, onEnter);
  observer.observe(el);
  return () => {
    pending.delete(el);
    observer?.unobserve(el);
  };
}

type RevealTag = "div" | "ul" | "ol" | "section" | "article";

type RevealProps<T extends RevealTag> = Omit<ComponentPropsWithoutRef<T>, "children"> & {
  as?: T;
  /** Children arrive one after another instead of the block arriving whole. */
  stagger?: boolean;
  /** Called once, when the block first scrolls into view. */
  onEnter?: () => void;
  children?: ReactNode;
};

export function Reveal<T extends RevealTag = "div">({
  as,
  stagger = false,
  className,
  onEnter,
  children,
  ...rest
}: RevealProps<T>) {
  const ref = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);
  const enter = useRef(onEnter);
  enter.current = onEnter;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    markMotion();
    return whenVisible(el, () => {
      setEntered(true);
      enter.current?.();
    });
  }, []);

  return createElement(
    as ?? "div",
    {
      ...rest,
      ref,
      "data-reveal": stagger ? "stagger" : "block",
      className: [className, entered ? "is-in" : ""].filter(Boolean).join(" ") || undefined,
    },
    children,
  );
}

/**
 * A number that counts up to its value the first time it is seen. Rendered at
 * its final value on the server and under reduced motion, so the figure is
 * never wrong — only, briefly, on its way.
 */
export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !Number.isFinite(value)) {
      setShown(value);
      return;
    }
    let frame = 0;
    const stop = whenVisible(el, () => {
      const started = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        setShown(countAt(0, value, progress));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    return () => {
      stop();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {shown}
    </span>
  );
}
