/**
 * The arithmetic behind the motion layer, kept free of the DOM so it can be
 * tested on its own.
 */

/** Fast start, long settle — the curve every reveal and counter follows. */
export function easeOutCubic(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return 1 - (1 - p) ** 3;
}

/** Where a counter stands at `progress` (0..1) on its way from `from` to `to`. */
export function countAt(from: number, to: number, progress: number): number {
  const eased = easeOutCubic(progress);
  return Math.round(from + (to - from) * eased);
}

/** Pointer position inside a box, as percentages the CSS can read. */
export function pointInBox(
  clientX: number,
  clientY: number,
  box: { left: number; top: number; width: number; height: number },
): { x: string; y: string } {
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const x = box.width > 0 ? clamp(((clientX - box.left) / box.width) * 100) : 50;
  const y = box.height > 0 ? clamp(((clientY - box.top) / box.height) * 100) : 50;
  return { x: `${x.toFixed(1)}%`, y: `${y.toFixed(1)}%` };
}
