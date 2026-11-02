"use client";

/**
 * Gulça — the WomanUP companion.
 *
 * A sakura blossom with a face, drawn like a small glossy toy: five plump
 * petals, big dark eyes, an open smile, three stamens and a bow. She floats in
 * the bottom-right corner, blinks, bobs her bow now and then, and opens the
 * assistant when touched. One character, one place, the same on every page a
 * woman uses; absent from the staff screens, where a mascot would be a toy on
 * a desk.
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

/** One petal, pointing up from the heart of the blossom: plump, with the
 *  shallow notch of a sakura petal at the tip. Rotated five times. */
const PETAL =
  "M0 -3 C -7 -5, -11.8 -10.5, -11 -16.5 C -10.4 -21, -7.4 -24.2, -4.2 -23.4 " +
  "C -2.2 -22.9, -0.9 -21.6, 0 -20.5 C 0.9 -21.6, 2.2 -22.9, 4.2 -23.4 " +
  "C 7.4 -24.2, 10.4 -21, 11 -16.5 C 11.8 -10.5, 7 -5, 0 -3 Z";
/** Lower petals first, the top one last, so the top one lies in front. */
const PETAL_ANGLES = [144, 216, 72, 288, 0];
const EYE_X = [-5.4, 5.4];
const STAMENS: ReadonlyArray<[number, number]> = [
  [-4.9, -13.6],
  [0, -15.2],
  [4.9, -13.6],
];

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

/** The blossom itself. Exported so the chat header can show a small one.
 *
 *  Everything that moves — the breath of the petals, the blink, the bob of
 *  the bow — is CSS on the class names below; the gradients give the lacquered
 *  look and take their colours from the `--wu-*` tokens, so the dark theme
 *  recolours her the same way it recolours the page. */
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
        {/* Along each petal: lightest at the tip, deepest where it meets the heart. */}
        <linearGradient id="wu-petal" gradientUnits="userSpaceOnUse" x1="0" y1="-24" x2="0" y2="-3">
          <stop offset="0" stopColor="var(--wu-petal-light)" />
          <stop offset=".55" stopColor="var(--wu-petal)" />
          <stop offset="1" stopColor="var(--wu-petal-deep)" />
        </linearGradient>
        <radialGradient id="wu-core" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="9">
          <stop offset=".7" stopColor="var(--wu-petal)" />
          <stop offset="1" stopColor="var(--wu-petal)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wu-heart" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="13">
          <stop offset="0" stopColor="var(--wu-petal-deep)" stopOpacity=".45" />
          <stop offset="1" stopColor="var(--wu-petal-deep)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wu-gloss" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff" stopOpacity=".8" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wu-stamen" cx=".38" cy=".32" r=".72">
          <stop offset="0" stopColor="var(--wu-stamen-light)" />
          <stop offset="1" stopColor="var(--wu-stamen)" />
        </radialGradient>
        <linearGradient id="wu-bow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--wu-bow-light)" />
          <stop offset="1" stopColor="var(--wu-bow)" />
        </linearGradient>
      </defs>

      <g className="wu-petals">
        {PETAL_ANGLES.map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <path d={PETAL} fill="url(#wu-petal)" className="wu-petal" />
            {/* The shine of a lacquered surface: one streak near each tip, lit
                from the upper left whichever way the petal points. */}
            <ellipse
              cx="-1.6"
              cy="-17.2"
              rx="3.6"
              ry="1.5"
              transform={`rotate(${-36 - angle} -1.6 -17.2)`}
              fill="url(#wu-gloss)"
              opacity=".7"
            />
          </g>
        ))}
        {/* The petals meet at a point; a soft-edged disc of their own colour
            fills the heart, which then sits a little deeper than the petals. */}
        <circle r="9" fill="url(#wu-core)" />
        <circle r="13" fill="url(#wu-heart)" />
        {/* Light from the upper left, over the whole blossom. */}
        <ellipse cx="-6" cy="-12" rx="13" ry="6.5" transform="rotate(-32 -6 -12)" fill="url(#wu-gloss)" opacity=".45" />
      </g>

      <g className="wu-stamens">
        <path d="M0 -2.2 Q-1.4 -7.6 -4.6 -12.2" className="wu-stem" />
        <path d="M0 -2.2 L0 -13.6" className="wu-stem" />
        <path d="M0 -2.2 Q1.4 -7.6 4.6 -12.2" className="wu-stem" />
        {STAMENS.map(([x, y]) => (
          <g key={x}>
            <circle cx={x} cy={y} r="1.9" fill="url(#wu-stamen)" />
            <circle cx={x - 0.55} cy={y - 0.65} r=".55" fill="#fff" opacity=".85" />
          </g>
        ))}
      </g>

      <g className="wu-eyes">
        {EYE_X.map((x) => (
          <g key={x} className="wu-eye">
            <ellipse cx={x} cy="-0.6" rx="2.7" ry="3.1" className="wu-eye-ball" />
            <circle cx={x + 0.95} cy="-1.9" r="1" className="wu-eye-light" />
            <circle cx={x - 0.9} cy="0.9" r=".5" className="wu-eye-light" opacity=".7" />
          </g>
        ))}
      </g>
      <ellipse cx="-9.6" cy="3.3" rx="2.6" ry="1.7" className="wu-cheek" />
      <ellipse cx="9.6" cy="3.3" rx="2.6" ry="1.7" className="wu-cheek" />
      <path d="M-2.6 3.4 Q0 2.7 2.6 3.4 Q2.3 8.3 0 8.3 Q-2.3 8.3 -2.6 3.4 Z" className="wu-smile" />
      <ellipse cx="0" cy="7" rx="1.6" ry="1.1" className="wu-tongue" />

      {/* The bow is the hand: it bobs. */}
      <g className="wu-bow">
        <ellipse
          cx="-15.8"
          cy="-12.2"
          rx="4.6"
          ry="3.3"
          transform="rotate(-28 -15.8 -12.2)"
          fill="url(#wu-bow)"
          className="wu-bow-loop"
        />
        <ellipse
          cx="-7.2"
          cy="-16.8"
          rx="4.6"
          ry="3.3"
          transform="rotate(-28 -7.2 -16.8)"
          fill="url(#wu-bow)"
          className="wu-bow-loop"
        />
        <circle cx="-11.5" cy="-14.5" r="2.3" className="wu-bow-knot" />
        <ellipse cx="-16.9" cy="-13.6" rx="1.7" ry=".7" transform="rotate(-28 -16.9 -13.6)" fill="#fff" opacity=".6" />
        <ellipse cx="-8.3" cy="-18.2" rx="1.7" ry=".7" transform="rotate(-28 -8.3 -18.2)" fill="#fff" opacity=".6" />
      </g>
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
  // Bottom-right on every page: that is where she is expected, and the left
  // edge is where a page's own content begins.
  const side = "right";

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
