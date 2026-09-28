/**
 * The six marks on the direction cards: a woman, at what that direction is
 * about.
 *
 * Silhouettes rather than icons, because the card is about her and not about a
 * category. One figure is drawn once and stands in all six; what changes is
 * what is beside her — the folder, the rising columns, the leaf, the child, the
 * screen, the microphone. A stock icon set would have given six unrelated
 * pictograms at 24px; this is one person, seen six times, at the size of an
 * illustration.
 *
 * Every composition rises out of the bottom of its box, so the figure is always
 * cut by the card's own edge and reads as a detail of something larger. Flat,
 * one colour: the direction's own colour arrives through `currentColor`.
 */

type Bust = { cx: number; shoulders: number; top: number; head: number };

/** Head and shoulders, rising out of the bottom edge of the box. */
function figure({ cx, shoulders: half, top, head: r }: Bust) {
  return (
    <>
      <circle cx={cx} cy={top - r - 4} r={r} />
      <path
        d={`M${cx - half} 100 C${cx - half} ${top + 9}, ${cx - half * 0.5} ${top}, ${cx} ${top} C${cx + half * 0.5} ${top}, ${cx + half} ${top + 9}, ${cx + half} 100 Z`}
      />
    </>
  );
}

/** The woman every card is about: right of centre, so the card's corner cuts her. */
const HER: Bust = { cx: 62, shoulders: 27, top: 58, head: 12.5 };

export type MarkKind =
  | "vocational_skills"
  | "entrepreneurship"
  | "health"
  | "parenting"
  | "digital_safety"
  | "leadership";

const MARKS: Record<MarkKind, React.ReactNode> = {
  // Work: the folder she carries to an interview and to a first day.
  vocational_skills: (
    <>
      {figure(HER)}
      <path d="M6 76h13l4 5h11a3 3 0 0 1 3 3v16H3V79a3 3 0 0 1 3-3Z" />
    </>
  ),
  // Business: what she is building, drawn as it grows.
  entrepreneurship: (
    <>
      {figure(HER)}
      <rect x="4" y="80" width="9" height="20" rx="2.5" />
      <rect x="17" y="70" width="9" height="30" rx="2.5" />
      <rect x="30" y="58" width="9" height="42" rx="2.5" />
    </>
  ),
  // Health: a leaf at her side — rest is part of the work, not its reward.
  health: (
    <>
      {figure(HER)}
      <path d="M30 100C10 96 4 82 8 64c16 1 25 9 27 21 1.6 6 .3 11-5 15Z" />
    </>
  ),
  // Family: the smaller one beside her, not behind her.
  parenting: (
    <>
      {figure(HER)}
      {figure({ cx: 26, shoulders: 17, top: 76, head: 8 })}
    </>
  ),
  // Digital: the screen she works at.
  digital_safety: (
    <>
      {figure(HER)}
      <rect x="6" y="62" width="34" height="26" rx="3" />
      <path d="M2 92h42l4 8H-2l4-8Z" />
    </>
  ),
  // Leadership: the microphone, because being heard is the whole point.
  leadership: (
    <>
      {figure(HER)}
      <rect x="15" y="50" width="15" height="28" rx="7.5" />
      <path
        d="M8 68c0 8 6.5 14.5 14.5 14.5S37 76 37 68"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="20.5" y="82" width="4" height="12" rx="2" />
      <rect x="12" y="94" width="21" height="4.5" rx="2.2" />
    </>
  ),
};

export function DirectionMark({ kind }: { kind: MarkKind }) {
  return (
    <svg className="face-mark" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {MARKS[kind]}
    </svg>
  );
}
