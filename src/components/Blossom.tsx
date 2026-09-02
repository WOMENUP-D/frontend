"use client";

/**
 * A single sakura blossom, used as the streak mark.
 *
 * A flame is Duolingo's; the branch across the hero is ours, so the streak is
 * counted in blossoms. The petal outline is the same one the hero branch is
 * drawn with, scaled down — at 18px the cleft tip is what still reads as a
 * cherry blossom rather than a generic five-pointed flower.
 *
 * `alive` switches it from a pale outline to an open flower. A streak of zero
 * should look dormant, not scolding: it is the same blossom, not yet in bloom.
 */

const PETAL =
  "M0 -2 C -7.4 -6.8, -9.6 -15.8, -5.6 -21.8 C -3.6 -20.2, -1.8 -20.6, 0 -18.8 " +
  "C 1.8 -20.6, 3.6 -20.2, 5.6 -21.8 C 9.6 -15.8, 7.4 -6.8, 0 -2 Z";

export function Blossom({ alive = false, size = 18 }: { alive?: boolean; size?: number }) {
  return (
    <svg
      className={alive ? "blossom blossom-alive" : "blossom"}
      width={size}
      height={size}
      viewBox="-26 -26 52 52"
      aria-hidden="true"
    >
      {[0, 72, 144, 216, 288].map((angle) => (
        <path key={angle} d={PETAL} transform={`rotate(${angle})`} className="blossom-petal" />
      ))}
      <circle r="2.6" className="blossom-heart" />
    </svg>
  );
}
