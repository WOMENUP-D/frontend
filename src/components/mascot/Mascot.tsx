"use client";

/**
 * Gulça — the WomanUP companion.
 *
 * A sakura blossom with a face: the same petal the hero branch is drawn with,
 * opened into a small spirit that floats in the bottom corner, blinks, waves a
 * leaf now and then, and opens the assistant when touched. One character, one
 * place, the same on every page a woman uses; absent from the staff screens,
 * where a mascot would be a toy on a desk.
 *
 * Everything that moves is CSS, and all of it stops under
 * prefers-reduced-motion — the blossom still sits there and still opens the
 * chat. The speech bubble speaks rarely: once on arrival, then at most a few
 * times a session, never while the chat is open, and a tap on it closes it.
 */

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { MascotChat } from "./MascotChat";

const PETAL =
  "M0 -2 C -7.4 -6.8, -9.6 -15.8, -5.6 -21.8 C -3.6 -20.2, -1.8 -20.6, 0 -18.8 " +
  "C 1.8 -20.6, 3.6 -20.2, 5.6 -21.8 C 9.6 -15.8, 7.4 -6.8, 0 -2 Z";

const HINTS: MessageKey[] = ["wu.hint.help", "wu.hint.programs", "wu.hint.about", "wu.hint.score"];
const SEEN_KEY = "womanup.mascot.seen";
const BUBBLE_LIFE_MS = 6500;
const FIRST_BUBBLE_MS = 2200;
const BUBBLE_EVERY_MS = 150_000;
const MAX_BUBBLES = 3;

/** Screens where the companion stays away. */
function hiddenOn(pathname: string | null): boolean {
  if (!pathname) return true;
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/hamkor") ||
    pathname === "/yordamchi" ||
    pathname.startsWith("/talim/yordamchi")
  );
}

/** The blossom itself. Exported so the chat header can show a small one. */
export function MascotFigure({ size = 64, mood = "idle" }: { size?: number; mood?: "idle" | "happy" }) {
  return (
    <svg
      className={`wu-figure is-${mood}`}
      width={size}
      height={size}
      viewBox="-30 -30 60 60"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="wu-petal" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="var(--wu-petal-light)" />
          <stop offset="100%" stopColor="var(--wu-petal)" />
        </radialGradient>
      </defs>
      <g className="wu-petals">
        {[0, 72, 144, 216, 288].map((angle) => (
          <path key={angle} d={PETAL} transform={`rotate(${angle})`} fill="url(#wu-petal)" className="wu-petal" />
        ))}
      </g>
      <circle r="11.5" className="wu-face" />
      <g className="wu-eyes">
        <ellipse cx="-4" cy="-1.6" rx="1.6" ry="2.3" className="wu-eye" />
        <ellipse cx="4" cy="-1.6" rx="1.6" ry="2.3" className="wu-eye" />
      </g>
      <circle cx="-7.2" cy="2.6" r="1.9" className="wu-cheek" />
      <circle cx="7.2" cy="2.6" r="1.9" className="wu-cheek" />
      <path d="M-3.2 3.6 Q0 6.4 3.2 3.6" className="wu-smile" />
      {/* The leaf is the hand: it waves. */}
      <path
        d="M14 9 C 19 6, 24 8, 25 13 C 20 15, 15.5 13.5, 14 9 Z"
        className="wu-leaf"
      />
    </svg>
  );
}

export function Mascot() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [bubble, setBubble] = useState<MessageKey | null>(null);
  const [poke, setPoke] = useState(0);
  const shown = useRef(0);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const say = useCallback((key: MessageKey) => {
    setBubble(key);
    timers.current.push(window.setTimeout(() => setBubble(null), BUBBLE_LIFE_MS));
  }, []);

  // Arrival, then an occasional word — never while the chat is open.
  useEffect(() => {
    if (hiddenOn(pathname)) return;
    setArrived(true);
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY) === "1";
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* no storage: she is greeted once per page instead */
    }
    if (!seen) {
      timers.current.push(
        window.setTimeout(() => {
          shown.current += 1;
          say("wu.hint.hello");
        }, FIRST_BUBBLE_MS),
      );
    }
    const interval = window.setInterval(() => {
      if (document.hidden || shown.current >= MAX_BUBBLES) return;
      shown.current += 1;
      say(HINTS[Math.floor(Math.random() * HINTS.length)]);
    }, BUBBLE_EVERY_MS);
    timers.current.push(interval);
    return () => {
      clear();
      window.clearInterval(interval);
    };
    // The companion is mounted once; a route change only decides visibility.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenOn(pathname)]);

  useEffect(() => {
    if (open) setBubble(null);
  }, [open]);

  if (hiddenOn(pathname)) return null;
  const side = pathname?.startsWith("/talim") ? "right" : "left";

  return (
    <div className={`wu wu-${side}${arrived ? " is-here" : ""}${open ? " is-open" : ""}`}>
      {open && <MascotChat onClose={() => setOpen(false)} />}
      {bubble && !open && (
        <button
          type="button"
          className="wu-bubble"
          onClick={() => {
            setBubble(null);
            setOpen(true);
          }}
        >
          {t(bubble)}
        </button>
      )}
      <button
        type="button"
        className="wu-button"
        aria-label={t(open ? "wu.close" : "wu.open")}
        aria-expanded={open}
        aria-controls="wu-chat"
        data-poke={poke % 2}
        onClick={() => {
          setPoke((n) => n + 1);
          setOpen((value) => !value);
        }}
      >
        <MascotFigure mood={open ? "happy" : "idle"} />
      </button>
    </div>
  );
}
