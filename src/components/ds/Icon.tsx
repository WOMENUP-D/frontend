/**
 * One line-icon set, drawn on a 24px grid with a 1.7 stroke in the current
 * colour. Icons support words, they never replace them: every use sits next
 * to a label, so each is `aria-hidden`.
 */

import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6.5-6.1 6.5-10.9a6.5 6.5 0 10-13 0C5.5 14.9 12 21 12 21z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5z" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <circle cx="16.8" cy="9.5" r="2.5" />
      <path d="M15.6 14.2c2.4-.3 4.3 1.1 4.9 4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 1112 0v5.5l1.5 2h-15z" />
      <path d="M10 20.5a2.2 2.2 0 004 0" />
    </>
  ),
  bookmark: <path d="M7 3.8h10a1 1 0 011 1v15.4l-6-3.9-6 3.9V4.8a1 1 0 011-1z" />,
  check: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.3l2.7 2.7 5.3-5.6" />
    </>
  ),
  spark: <path d="M12 3.5l2 5.6 5.5 2-5.5 2-2 5.6-2-5.6-5.5-2 5.5-2z" />,
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 016.5 18H20v3H6.5" />
    </>
  ),
  task: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.5" />
      <path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3.5" y="7" width="17" height="12.5" rx="2.5" />
      <path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M3.5 12.5h17" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.4a2.5 2.5 0 114 2c-.9.5-1.6 1.1-1.6 2.1M12 16.8v.1" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  filter: <path d="M4 6.5h16M7 12h10M10 17.5h4" />,
  chevronLeft: <path d="M14.5 6l-6 6 6 6" />,
  chevronRight: <path d="M9.5 6l6 6-6 6" />,
  download: (
    <>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  external: (
    <>
      <path d="M13.5 4.5h6v6M19.5 4.5l-8 8" />
      <path d="M17 13.5V19a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 19V8.5A1.5 1.5 0 015 7h5.5" />
    </>
  ),
  /* Event kinds — each a shape a woman can tell apart at a glance. */
  workshop: (
    <>
      <path d="M4 20l6.5-6.5M13.5 4.5l6 6-4 4-6-6z" />
      <path d="M11.5 10.5L8 14" />
    </>
  ),
  seminar: (
    <>
      <rect x="3.5" y="4" width="17" height="11" rx="2" />
      <path d="M12 15v5M8.5 20h7" />
    </>
  ),
  conference: (
    <>
      <path d="M12 4.5v6" />
      <rect x="9.5" y="2.5" width="5" height="8.5" rx="2.5" />
      <path d="M6.5 10a5.5 5.5 0 0011 0M12 15.5V20M8.5 20h7" />
    </>
  ),
  forum: (
    <>
      <path d="M4 5.5h11a1.5 1.5 0 011.5 1.5v6A1.5 1.5 0 0115 14.5H9l-4 3.5v-3.5H4z" />
      <path d="M16.5 9.5H19a1.5 1.5 0 011.5 1.5v6A1.5 1.5 0 0119 18.5h-1v2.5l-3.5-2.5H11" />
    </>
  ),
  training: (
    <>
      <path d="M2.5 9L12 4.5 21.5 9 12 13.5z" />
      <path d="M6.5 11v4.5c1.5 1.5 3.5 2.3 5.5 2.3s4-.8 5.5-2.3V11M21.5 9v5.5" />
    </>
  ),
  consultation: (
    <>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M3 19c.5-3 2.5-4.8 5-4.8s4.5 1.8 5 4.8M13.5 16c.8-1.2 1.8-1.8 3-1.8 2.1 0 3.5 1.5 4 4" />
    </>
  ),
  competition: (
    <>
      <path d="M8 4h8v5a4 4 0 01-8 0z" />
      <path d="M8 6H5a3 3 0 003 3.5M16 6h3a3 3 0 01-3 3.5M12 13v3.5M8.5 20h7l-1-3.5h-5z" />
    </>
  ),
  networking: (
    <>
      <circle cx="6" cy="7" r="2.3" />
      <circle cx="18" cy="7" r="2.3" />
      <circle cx="12" cy="17" r="2.3" />
      <path d="M8.2 7.8l7.6-.1M7.2 9l3.6 6M16.8 9l-3.6 6" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      className={`ds-icon ${className ?? ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name] ?? PATHS.calendar}
    </svg>
  );
}
