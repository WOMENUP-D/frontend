/**
 * The six marks on the direction cards: one flower each.
 *
 * Drawn rather than picked from an icon set, and drawn as one hand would draw
 * them — a stem that leaves the bottom edge, two leaves on it, and a bloom
 * that differs per direction: an open flower for work, berries for business, a
 * daisy for health, two tulips for family, a branching spray for the digital
 * world, two spikes for leadership. Six pictograms from a library would have
 * been six unrelated drawings; these are one garden.
 *
 * Every stem runs out of the bottom of the box, so the card's own edge cuts the
 * plant and it reads as a detail of something larger. The card clips the right
 * quarter and the bottom tenth of this box — see `.face-mark` — so the flower
 * lives left of x≈70. Flat, one colour: the direction's own arrives through
 * `currentColor`.
 */

const rad = (deg: number) => (deg * Math.PI) / 180;
const n = (value: number) => Math.round(value * 10) / 10;

/**
 * A petal, or a leaf — the same shape at different sizes. Base at (x, y), tip
 * `len` away at `deg`, belly `w` to each side. `curve` pushes both control
 * points the same way, which takes the symmetry out and is what keeps these
 * from looking machine-drawn.
 */
function petal(x: number, y: number, deg: number, len: number, w: number, curve = 0): string {
  const a = rad(deg);
  const tx = x + Math.cos(a) * len;
  const ty = y + Math.sin(a) * len;
  const mx = x + Math.cos(a) * len * 0.5;
  const my = y + Math.sin(a) * len * 0.5;
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  return (
    `M${n(x)} ${n(y)}` +
    `Q${n(mx + nx * (w + curve))} ${n(my + ny * (w + curve))} ${n(tx)} ${n(ty)}` +
    `Q${n(mx + nx * (curve - w))} ${n(my + ny * (curve - w))} ${n(x)} ${n(y)}Z`
  );
}

/** A corolla: `count` petals around (cx, cy), starting at radius `r0`. */
function ring(cx: number, cy: number, count: number, r0: number, len: number, w: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const deg = -90 + (360 / count) * i;
    const a = rad(deg);
    return petal(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, deg, len, w);
  });
}

/** A spike: small buds up the stem, smaller towards the tip, and a point. */
function spike(x: number, y: number, height: number, steps: number, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < steps; i += 1) {
    const k = i / (steps - 1);
    const py = y - height * k;
    const r = size * (1 - k * 0.5);
    const off = size * 0.78 * (1 - k * 0.35);
    out.push(`M${n(x - off)} ${n(py)}a${n(r)} ${n(r * 1.25)} 0 1 0 ${n(r * 0.12)} 0Z`);
    out.push(`M${n(x + off)} ${n(py - r * 0.75)}a${n(r * 0.94)} ${n(r * 1.2)} 0 1 1 ${n(-r * 0.12)} 0Z`);
  }
  out.push(petal(x, y - height - size * 0.4, -90, size * 2.4, size * 0.72));
  return out;
}

/**
 * A tulip: a cup with three points. The notches are shallow on purpose — cut
 * deeper, a flower this size stops being a flower and becomes three claws.
 */
function tulip(cx: number, cy: number, w: number, h: number): string {
  const a = w / 2;
  const notch = cy - h * 0.66;
  return (
    `M${n(cx)} ${n(cy)}` +
    `C${n(cx - a * 1.04)} ${n(cy - h * 0.1)} ${n(cx - a * 1.12)} ${n(cy - h * 0.6)} ${n(cx - a)} ${n(cy - h * 0.99)}` +
    `C${n(cx - a * 0.78)} ${n(cy - h * 0.82)} ${n(cx - a * 0.6)} ${n(notch + h * 0.04)} ${n(cx - a * 0.4)} ${n(notch)}` +
    `C${n(cx - a * 0.3)} ${n(cy - h * 0.82)} ${n(cx - a * 0.16)} ${n(cy - h)} ${n(cx)} ${n(cy - h * 1.08)}` +
    `C${n(cx + a * 0.16)} ${n(cy - h)} ${n(cx + a * 0.3)} ${n(cy - h * 0.82)} ${n(cx + a * 0.4)} ${n(notch)}` +
    `C${n(cx + a * 0.6)} ${n(notch + h * 0.04)} ${n(cx + a * 0.78)} ${n(cy - h * 0.82)} ${n(cx + a)} ${n(cy - h * 0.99)}` +
    `C${n(cx + a * 1.12)} ${n(cy - h * 0.6)} ${n(cx + a * 1.04)} ${n(cy - h * 0.1)} ${n(cx)} ${n(cy)}Z`
  );
}

/** Filled shapes, drawn in order. */
const Fill = ({ d }: { d: string[] }) => (
  <>
    {d.map((path) => (
      <path key={path} d={path} />
    ))}
  </>
);

/** A stem. Stroked rather than filled: a hairline that tapers is a different
 *  drawing problem, and this one reads at 40% of a phone card. */
const Stem = ({ d, w = 2.5 }: { d: string; w?: number }) => (
  <path d={d} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
);

export type MarkKind =
  | "vocational_skills"
  | "entrepreneurship"
  | "health"
  | "parenting"
  | "digital_safety"
  | "leadership";

const MARKS: Record<MarkKind, React.ReactNode> = {
  // Work: one flower open, and a second still a bud on its own branch.
  vocational_skills: (
    <>
      <Stem d="M47 100C45 80 41 66 39 50" />
      <Stem d="M41 60C34 57 27 53 23 47" w={2.2} />
      <Fill d={ring(38, 36, 6, 5.6, 15, 5.8)} />
      <circle cx="38" cy="36" r="5.2" />
      <Fill d={[petal(21, 48, -104, 15, 5.4, 1.5)]} />
      <Fill d={[petal(42, 72, -14, 22, 8, 3.5), petal(45, 86, 196, 20, 7.2, -3.5)]} />
    </>
  ),

  // Business: berries — what a branch carries after a season, not in a week.
  entrepreneurship: (
    <>
      <Stem d="M46 100C46 82 44 70 43 54" />
      <Stem d="M43 62C36 58 31 52 29 44" w={2.2} />
      <Stem d="M44 56C50 50 55 44 56 36" w={2.2} />
      <circle cx="28" cy="38" r="6.4" />
      <circle cx="19" cy="44" r="5.2" />
      <circle cx="30" cy="26" r="5.6" />
      <circle cx="20" cy="31" r="4.6" />
      <circle cx="57" cy="30" r="6" />
      <circle cx="62" cy="40" r="4.8" />
      <circle cx="48" cy="25" r="4.6" />
      <Fill d={[petal(42, 74, -22, 23, 8, 3.5), petal(45, 88, 200, 21, 7.4, -3.5)]} />
    </>
  ),

  // Health: the daisy — the most open flower on the sheet.
  health: (
    <>
      <Stem d="M44 100C42 80 40 66 40 50" />
      <Fill d={ring(40, 32, 14, 7, 16, 3.6)} />
      <circle cx="40" cy="32" r="6.8" />
      <Fill d={[petal(41, 70, -18, 22, 8, 3.5), petal(43, 84, 198, 20, 7.4, -3.5)]} />
    </>
  ),

  // Family: two flowers on one plant, the smaller one beside and not behind.
  parenting: (
    <>
      <Stem d="M48 100C46 82 41 68 35 52" />
      <Stem d="M48 90C51 78 55 68 59 58" w={2.2} />
      <Fill d={[tulip(34, 46, 20, 22), tulip(59, 58, 14, 16)]} />
      <Fill d={[petal(44, 76, -24, 20, 7.2, 3.5), petal(47, 89, 202, 19, 6.8, -3.5)]} />
    </>
  ),

  // Digital: a spray rather than a single bloom — the point is the connections.
  digital_safety: (
    <>
      <Stem d="M47 100C46 82 44 70 43 58" />
      <Stem d="M44 66C37 62 30 56 26 48" w={2.2} />
      <Stem d="M44 62C51 57 57 50 59 42" w={2.2} />
      <Fill d={ring(24, 43, 6, 4.4, 9.5, 3.8)} />
      <circle cx="24" cy="43" r="3.6" />
      <Fill d={ring(60, 37, 6, 4.4, 9.5, 3.8)} />
      <circle cx="60" cy="37" r="3.6" />
      <Fill d={ring(42, 48, 6, 5, 11, 4.4)} />
      <circle cx="42" cy="48" r="4.2" />
      <Fill d={[petal(45, 80, -26, 18, 6.4, 3.5), petal(46, 91, 204, 17, 6, -3.5)]} />
    </>
  ),

  // Leadership: two spikes, because being seen from across a field is the point.
  leadership: (
    <>
      <Stem d="M41 100C39 82 37 70 36 56" />
      <Stem d="M53 100C55 86 57 76 58 64" w={2.2} />
      <Fill d={spike(36, 56, 32, 8, 4.4)} />
      <Fill d={spike(58, 64, 24, 7, 3.7)} />
      <Fill d={[petal(39, 82, -28, 18, 6.4, 3.5), petal(43, 92, 206, 17, 6, -3.5)]} />
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
