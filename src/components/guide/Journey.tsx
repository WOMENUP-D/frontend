"use client";

/**
 * A journey: a short, ordered set of stages drawn down a single line.
 *
 * Built for the career path first and meant for any flow that is genuinely a
 * sequence — onboarding, a learning path, an application. It is not a
 * flowchart: one column, one line, top to bottom, the same on a phone and on a
 * desktop, because a route that has to be read in two dimensions is a route a
 * newcomer gets lost on.
 *
 * Each stage names its state in words ("Now", "Done", "Later") beside a marker
 * whose *shape* also differs — a filled check, a blossom, an open circle, a
 * dashed one — so nothing is told apart by colour alone. A stage with detail
 * opens in place: a real button with `aria-expanded`, so it works the same by
 * touch, by keyboard and with a screen reader, and nothing depends on hover.
 *
 * The stretch of line after a stage she has finished is drawn in the accent
 * colour, and it grows into place once, when the page opens. That is the one
 * piece of motion here, and it is skipped for anyone who asked for reduced
 * motion.
 */

import { useId, useState, type ReactNode } from "react";

export type JourneyState = "done" | "now" | "later" | "unavailable" | "neutral" | "you";

export function Journey({
  label,
  children,
}: {
  /** What the list is, for a screen reader: "Your career path". */
  label: string;
  children: ReactNode;
}) {
  return (
    <ol className="journey" aria-label={label}>
      {children}
    </ol>
  );
}

export function JourneyStep({
  state,
  title,
  stateLabel,
  summary,
  defaultOpen = false,
  id,
  children,
}: {
  state: JourneyState;
  title: string;
  /** The state in words. Required wherever there is a state to name. */
  stateLabel?: string | null;
  /** One line under the title: a count, a measure. */
  summary?: string | null;
  defaultOpen?: boolean;
  id?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  const head = (
    <>
      <span className="journey-title-row">
        <span className="journey-title">{title}</span>
        {stateLabel && <span className={`journey-state is-${state}`}>{stateLabel}</span>}
      </span>
      {summary && <span className="journey-summary">{summary}</span>}
    </>
  );

  return (
    <li className={`journey-step is-${state}`} id={id}>
      <span className="journey-node" aria-hidden="true">
        <Marker state={state} />
      </span>
      <div className="journey-body">
        {children ? (
          <button
            type="button"
            className="journey-head"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="journey-head-text">{head}</span>
            <svg
              className="journey-chevron"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M5 7.5l5 5 5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <div className="journey-head is-static">
            <span className="journey-head-text">{head}</span>
          </div>
        )}
        {children && (
          <div id={panelId} className="journey-panel" hidden={!open}>
            {children}
          </div>
        )}
      </div>
    </li>
  );
}

/** Five petals, the portal's own mark — the stage she is on. */
const PETAL =
  "M0 -1.2 C -3.6 -3.4, -4.7 -7.8, -2.7 -10.8 C -1.8 -10, -0.9 -10.2, 0 -9.3 " +
  "C 0.9 -10.2, 1.8 -10, 2.7 -10.8 C 4.7 -7.8, 3.6 -3.4, 0 -1.2 Z";

function Marker({ state }: { state: JourneyState }) {
  switch (state) {
    case "done":
      return (
        <svg viewBox="-12 -12 24 24" width="100%" height="100%" focusable="false">
          <circle r="11" className="m-fill" />
          <path d="M-5 0.5l3.3 3.3L5.2-3.6" className="m-check" />
        </svg>
      );
    case "now":
      return (
        <svg viewBox="-12 -12 24 24" width="100%" height="100%" focusable="false">
          <circle r="11" className="m-ring" />
          {[0, 72, 144, 216, 288].map((angle) => (
            <path key={angle} d={PETAL} transform={`rotate(${angle}) scale(.82)`} className="m-petal" />
          ))}
        </svg>
      );
    case "you":
      return (
        <svg viewBox="-12 -12 24 24" width="100%" height="100%" focusable="false">
          <circle r="11" className="m-you" />
          <circle cy="-2.6" r="3.2" className="m-you-mark" />
          <path d="M-5.5 6.2c1-3 3.1-4.4 5.5-4.4s4.5 1.4 5.5 4.4" className="m-you-mark" />
        </svg>
      );
    case "unavailable":
      return (
        <svg viewBox="-12 -12 24 24" width="100%" height="100%" focusable="false">
          <circle r="10" className="m-dashed" />
          <path d="M-4 0h8" className="m-dash" />
        </svg>
      );
    default:
      return (
        <svg viewBox="-12 -12 24 24" width="100%" height="100%" focusable="false">
          <circle r="10" className="m-open" />
        </svg>
      );
  }
}
