/**
 * A small line drawing for a career direction.
 *
 * Decoration beside a name that is always written out, so it is hidden from
 * screen readers. Drawn with the text colour at a 1.6 stroke to sit with the
 * interface's type rather than compete with it.
 */

import type { CareerGlyph } from "./model";

const PATHS: Record<CareerGlyph, string[]> = {
  // An open ledger with ruled lines.
  ledger: [
    "M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5z",
    "M13 4h5.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H13z",
    "M6.5 8h2.5M6.5 11h2.5M15.5 8h2M15.5 11h2M15.5 14h2",
  ],
  // A megaphone, for speaking to many people at once.
  megaphone: [
    "M4 10v4c0 .6.4 1 1 1h2l8 4V5L7 9H5c-.6 0-1 .4-1 1z",
    "M7 15l1.2 4.2c.1.5.6.8 1.1.8h.4c.7 0 1.2-.7 1-1.4L10 16",
    "M18 9.5a3 3 0 010 5",
  ],
  // A needle and a loose thread.
  needle: [
    "M18.5 4.5L6 17",
    "M17 3.5l3.5 3.5",
    "M6 17c-2 1-2.5 3-1 3.5s3-1.5 5-1.5 3 1.5 5 1",
  ],
  // Three people, one a little ahead.
  people: [
    "M12 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
    "M7.5 19c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5",
    "M5.5 12a2 2 0 100-4 2 2 0 000 4zM18.5 12a2 2 0 100-4 2 2 0 000 4z",
    "M3 18c0-1.8 1.2-3.3 2.8-3.8M21 18c0-1.8-1.2-3.3-2.8-3.8",
  ],
  // A shopfront with an awning.
  shop: [
    "M4 9l1.5-4.5h13L20 9",
    "M4 9c0 1.4 1.1 2.5 2.5 2.5S9 10.4 9 9c0 1.4 1.1 2.5 2.5 2.5S14 10.4 14 9c0 1.4 1.1 2.5 2.5 2.5S20 10.4 20 9",
    "M5.5 11.5V20h13v-8.5",
    "M10 20v-4.5h4V20",
  ],
  // A ball of yarn.
  craft: [
    "M12 20a8 8 0 100-16 8 8 0 000 16z",
    "M5 9.5c3.5-.5 8 1 11.5 5M4.5 13.5c3-.2 6.5 1.3 9 5M9 4.6c2.5 1.6 4.5 5 5 9",
    "M19 16.5l2.5 2",
  ],
  // A briefcase.
  briefcase: [
    "M4.5 8h15c.6 0 1 .4 1 1v9c0 .6-.4 1-1 1h-15c-.6 0-1-.4-1-1V9c0-.6.4-1 1-1z",
    "M9 8V6c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v2",
    "M3.5 13h17",
  ],
};

export function CareerIcon({ glyph, size = 28 }: { glyph: CareerGlyph; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[glyph].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
