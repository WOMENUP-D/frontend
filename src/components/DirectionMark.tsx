/**
 * The six marks on the direction cards: one plant each.
 *
 * Drawn from real plants rather than picked from an icon set: a wild rose for
 * work, rowan for business, a daisy for health, tulips for family, forget-me-
 * not for the digital world, lavender for leadership. Six pictograms from a
 * library would have been six unrelated drawings; these are one garden.
 *
 * Still flat and in one colour — the direction's own, through `currentColor` —
 * but drawn the way a botanical silhouette is: stems that taper, leaves with a
 * midrib, petals that are not all the same size, and the parts behind set back
 * in a lighter tone (`Back`), which is all the depth a single ink needs.
 *
 * Every stem runs out of the bottom of the box, so the card's own edge cuts the
 * plant and it reads as a detail of something larger. The card clips the right
 * quarter and the bottom tenth of this box — see `.face-mark` — so the plant
 * lives left of x≈70.
 */

const rad = (deg: number) => (deg * Math.PI) / 180;
const n = (value: number) => Math.round(value * 10) / 10;

/**
 * Points given in a local frame — origin at (x, y), turned by `deg` — written
 * out as "x y" pairs in the drawing's own frame.
 */
function frame(x: number, y: number, deg: number) {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return (px: number, py: number) => `${n(x + px * c - py * s)} ${n(y + px * s + py * c)}`;
}

/**
 * A pointed petal, or a leaf blade. Base at (x, y), tip `len` away at `deg`,
 * belly `w` to each side. `curve` bends it, which takes the symmetry out and is
 * what keeps these from looking machine-drawn.
 */
function petal(x: number, y: number, deg: number, len: number, w: number, curve = 0): string {
  const p = frame(x, y, deg);
  return `M${p(0, 0)}Q${p(len * 0.5, -(w + curve))} ${p(len, 0)}Q${p(len * 0.5, w - curve)} ${p(0, 0)}Z`;
}

/**
 * A leaf: the blade with its midrib cut out of it (the path is drawn even-odd).
 * The vein stops short of the tip and the base, as it does on a real leaf.
 */
function leaf(x: number, y: number, deg: number, len: number, w: number, curve = 0): string {
  const a = rad(deg);
  const vx = x + Math.cos(a) * len * 0.12;
  const vy = y + Math.sin(a) * len * 0.12;
  return petal(x, y, deg, len, w, curve) + petal(vx, vy, deg, len * 0.72, w * 0.1, curve * 0.62);
}

/** A strap with a rounded end: a daisy ray, an oblong leaf. */
function ray(x: number, y: number, deg: number, len: number, w: number): string {
  const p = frame(x, y, deg);
  const r = w * 0.95;
  return (
    `M${p(0, 0)}` +
    `C${p(len * 0.25, -w * 0.9)} ${p(len * 0.6, -w)} ${p(len - r, -r)}` +
    `A${n(r)} ${n(r)} 0 0 1 ${p(len - r, r)}` +
    `C${p(len * 0.6, w)} ${p(len * 0.25, w * 0.9)} ${p(0, 0)}Z`
  );
}

/** A rose petal: broad, narrow at the claw, with the shallow notch at the tip. */
function heartPetal(x: number, y: number, deg: number, len: number, w: number): string {
  const p = frame(x, y, deg);
  return (
    `M${p(0, 0)}` +
    `C${p(len * 0.25, -w * 0.5)} ${p(len * 0.6, -w * 1.05)} ${p(len * 0.92, -w * 0.72)}` +
    `Q${p(len * 1.03, -w * 0.35)} ${p(len * 0.88, 0)}` +
    `Q${p(len * 1.03, w * 0.35)} ${p(len * 0.92, w * 0.72)}` +
    `C${p(len * 0.6, w * 1.05)} ${p(len * 0.25, w * 0.5)} ${p(0, 0)}Z`
  );
}

/** A cupped petal, widest low down and drawn to a point: tulip, bud. */
function cup(x: number, y: number, deg: number, len: number, w: number): string {
  const p = frame(x, y, deg);
  return (
    `M${p(0, 0)}` +
    `C${p(len * 0.12, -w * 1.15)} ${p(len * 0.72, -w * 1.02)} ${p(len, 0)}` +
    `C${p(len * 0.72, w * 1.02)} ${p(len * 0.12, w * 1.15)} ${p(0, 0)}Z`
  );
}

/**
 * The outline of a whole tulip cup: an egg with three soft points at the rim,
 * the middle one a little higher. The notches stay shallow; cut deeper the cup
 * turns into a crown.
 */
function tulipCup(x: number, y: number, deg: number, h: number, w: number): string {
  const p = frame(x, y, deg);
  const a = w / 2;
  return (
    `M${p(0, 0)}` +
    `C${p(-a * 0.95, 0)} ${p(-a * 1.1, -h * 0.5)} ${p(-a * 0.84, -h * 0.98)}` +
    `C${p(-a * 0.66, -h * 0.9)} ${p(-a * 0.46, -h * 0.84)} ${p(-a * 0.3, -h * 0.86)}` +
    `C${p(-a * 0.24, -h * 0.98)} ${p(-a * 0.12, -h * 1.08)} ${p(0, -h * 1.12)}` +
    `C${p(a * 0.12, -h * 1.08)} ${p(a * 0.24, -h * 0.98)} ${p(a * 0.3, -h * 0.86)}` +
    `C${p(a * 0.46, -h * 0.84)} ${p(a * 0.66, -h * 0.9)} ${p(a * 0.84, -h * 0.98)}` +
    `C${p(a * 1.1, -h * 0.5)} ${p(a * 0.95, 0)} ${p(0, 0)}Z`
  );
}

/** A circle as a path, so it can sit in a list with the other shapes. */
function disc(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0Z`;
}

/**
 * A stem that tapers: the width runs from `w0` at the root to `w1` at the tip
 * along the cubic (x0 y0, c1, c2, x1 y1). A stroke of one width is what made
 * the first set look like wire.
 */
function stalk(pts: readonly number[], w0: number, w1: number): string {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = pts;
  const left: string[] = [];
  const right: string[] = [];
  const steps = 16;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
    const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
    const dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2);
    const dy = 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2);
    const len = Math.hypot(dx, dy) || 1;
    const half = (w0 + (w1 - w0) * t) / 2;
    const nx = (-dy / len) * half;
    const ny = (dx / len) * half;
    left.push(`${n(x + nx)} ${n(y + ny)}`);
    right.unshift(`${n(x - nx)} ${n(y - ny)}`);
  }
  return `M${left.join("L")}L${right.join("L")}Z`;
}

/** A closed bud: the cupped body along `deg`, held by two sepals. */
function bud(x: number, y: number, deg: number, len: number, w: number): string[] {
  return [
    cup(x, y, deg, len, w),
    petal(x, y, deg - 34, len * 0.62, w * 0.36, -0.4),
    petal(x, y, deg + 34, len * 0.62, w * 0.36, 0.4),
  ];
}

/* ------------------------------------------------------------- the plants */

/**
 * A wild rose, face on: five broad petals round a ring of stamens. The petals
 * stand clear of the heart, so the stamens show in the gap — the one detail
 * that tells a rose from a generic five-petal flower.
 */
function rose(cx: number, cy: number, size: number) {
  const jitter = [0, 5, -3, 6, -2];
  const lens = [1, 0.93, 1.04, 0.96, 1.01];
  const petals = jitter.map((j, i) => {
    const deg = -90 + 72 * i + j;
    const a = rad(deg);
    const r0 = size * 0.3;
    return heartPetal(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, deg, size * lens[i], size * 0.5);
  });
  const stamens = Array.from({ length: 10 }, (_, i) => {
    const a = rad(i * 36 + 8);
    return disc(cx + Math.cos(a) * size * 0.25, cy + Math.sin(a) * size * 0.25, size * 0.045);
  });
  return {
    back: [petals[1], petals[3]],
    front: [petals[0], petals[2], petals[4], disc(cx, cy, size * 0.17), ...stamens],
  };
}

/**
 * A berry with its light cut out of it (even-odd): the small spot of
 * highlight is what turns a dot into fruit.
 */
function berry(cx: number, cy: number, r: number): string {
  return disc(cx, cy, r) + disc(cx - r * 0.38, cy - r * 0.4, r * 0.2);
}

/** A rowan leaf: leaflets in pairs along a rachis, and one at the tip. */
function pinnate(x: number, y: number, deg: number, len: number, pairs: number, size: number): string[] {
  const a = rad(deg);
  const at = (t: number): [number, number] => [x + Math.cos(a) * len * t, y + Math.sin(a) * len * t];
  const out = [stalk([x, y, ...at(0.33), ...at(0.66), ...at(1)], 1.3, 0.6)];
  for (let i = 1; i <= pairs; i += 1) {
    const t = i / (pairs + 0.6);
    const [px, py] = at(t);
    const s = size * (1.05 - t * 0.3);
    out.push(petal(px, py, deg - 58, s, s * 0.3, -0.5), petal(px, py, deg + 58, s, s * 0.3, 0.5));
  }
  out.push(petal(...at(1), deg, size * 0.85, size * 0.27));
  return out;
}

/**
 * A daisy: two rows of narrow rays, the back row a half-step round and set
 * back in tone, round a small disc. Rays stand clear of the disc — a big disc
 * with petals touching it is a sunflower at any petal count.
 */
function daisy(cx: number, cy: number, len: number) {
  const row = (count: number, offset: number, scale: number) =>
    Array.from({ length: count }, (_, i) => {
      const deg = -90 + (360 / count) * i + offset;
      const a = rad(deg);
      const l = len * scale * [1, 0.92, 1.05, 0.95][i % 4];
      return ray(cx + Math.cos(a) * len * 0.5, cy + Math.sin(a) * len * 0.5, deg, l, len * 0.13);
    });
  return { back: row(16, 11.25, 0.8), front: [...row(16, 0, 1), disc(cx, cy, len * 0.3)] };
}

/**
 * A tulip at three-quarters: the whole cup set back in tone, and the one petal
 * facing us laid over it at full tone, its tip just short of the rim. The cup is
 * turned by `deg` to follow the stem it grows from — an upright cup on a
 * leaning stem is a flower stuck on, not grown.
 */
function tulip(x: number, y: number, deg: number, h: number, w: number) {
  return {
    back: [tulipCup(x, y, deg, h, w)],
    front: [cup(x, y, deg - 90, h * 1.02, w * 0.36)],
  };
}

/**
 * A forget-me-not: five round petals round an open eye. The petals sit far
 * enough out that the middle is left empty — the eye is the flower.
 */
function forgetMeNot(cx: number, cy: number, r: number, turn = 0): string[] {
  return Array.from({ length: 5 }, (_, i) => {
    const a = rad(-90 + 72 * i + turn);
    return disc(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35, r);
  });
}

/**
 * A lavender spike: whorls of small florets up the stem, spaced wide at the
 * bottom and closing up towards the top, the florets behind the stem set back.
 */
function lavender(x: number, bottom: number, top: number, whorls: number, size: number) {
  const back: string[] = [];
  const front: string[] = [];
  for (let i = 0; i < whorls; i += 1) {
    const k = i / (whorls - 1);
    const py = bottom - (bottom - top) * (1 - (1 - k) * (1 - k));
    const s = size * (1 - k * 0.35);
    back.push(petal(x, py, -90 - 60, s, s * 0.34, -0.3), petal(x, py, -90 + 60, s, s * 0.34, 0.3));
    front.push(petal(x, py + 0.6, -90 - 26, s * 0.9, s * 0.36), petal(x, py + 0.6, -90 + 26, s * 0.9, s * 0.36));
  }
  front.push(cup(x, top, -90, size * 1.1, size * 0.3));
  return { back, front };
}

/* ------------------------------------------------------------- rendering */

/** Filled shapes, drawn in order. Even-odd, so a shape can carry its own cut. */
const Fill = ({ d }: { d: string[] }) => (
  <>
    {d.map((path, i) => (
      <path key={i} d={path} fillRule="evenodd" />
    ))}
  </>
);

/** Parts that sit behind the rest of the plant, set back in tone. */
const Back = ({ d }: { d: string[] }) => (
  <g opacity=".55">
    <Fill d={d} />
  </g>
);

/** A fine stalk — a pedicel, a curled tip — too thin to taper. */
const Thread = ({ d, w = 1.1 }: { d: string; w?: number }) => (
  <path d={d} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
);

export type MarkKind =
  | "vocational_skills"
  | "entrepreneurship"
  | "health"
  | "parenting"
  | "digital_safety"
  | "leadership";

const ROSE = rose(38, 33, 14);
const DAISY = daisy(40, 31, 16);
const TULIP_BIG = tulip(35.4, 53.5, -21, 24, 20);
const TULIP_SMALL = tulip(58.8, 59, 23, 17, 14);
const LAVENDER_TALL = lavender(36.4, 62, 22, 10, 6);
const LAVENDER_SHORT = lavender(57.8, 68, 40, 8, 5);

/** Rowan berries as [x, y, r], each hung on a pedicel from its branch tip. */
const ROWAN_LEFT: ReadonlyArray<[number, number, number]> = [[23, 42, 4.4], [31, 37, 4.9], [21, 32, 3.8], [37, 44, 3.6]];
const ROWAN_RIGHT: ReadonlyArray<[number, number, number]> = [[51, 31, 4.2], [60, 30, 4.7], [64, 39, 3.6]];
const pedicel = (from: [number, number]) => ([x, y]: readonly number[]) =>
  `M${from[0]} ${from[1]}Q${n((from[0] + x) / 2)} ${from[1] - 2} ${x} ${y}`;

const MARKS: Record<MarkKind, React.ReactNode> = {
  // Work: a wild rose open, and a second still in bud on its own branch.
  vocational_skills: (
    <>
      <Fill d={[stalk([47, 100, 45, 80, 41, 60, 38, 36], 3.2, 1.8), stalk([41, 64, 35, 60, 29, 54, 25, 47], 2, 1.2)]} />
      <Fill d={[leaf(42, 74, -14, 22, 8, 3.5), leaf(45, 86, 196, 20, 7.2, -3.5), leaf(33, 58, 150, 12, 4.4, -2)]} />
      <Fill d={bud(25, 47, -112, 12, 3.8)} />
      <Back d={ROSE.back} />
      <Fill d={ROSE.front} />
    </>
  ),

  // Business: rowan — what a branch carries after a season, not in a week.
  entrepreneurship: (
    <>
      <Fill d={[stalk([46, 100, 46, 82, 44, 70, 43, 56], 3.2, 1.6), stalk([43, 66, 37, 62, 32, 56, 30, 48], 2, 1.1), stalk([44, 60, 50, 55, 54, 49, 56, 41], 2, 1.1)]} />
      <Fill d={[...pinnate(45, 80, -18, 22, 4, 7), ...pinnate(46, 90, 196, 18, 3, 6)]} />
      {[...ROWAN_LEFT.map(pedicel([30, 48])), ...ROWAN_RIGHT.map(pedicel([56, 41]))].map((d) => (
        <Thread key={d} d={d} />
      ))}
      <Back d={[berry(21, 32, 3.8), berry(37, 44, 3.6), berry(64, 39, 3.6)]} />
      <Fill d={[berry(23, 42, 4.4), berry(31, 37, 4.9), berry(51, 31, 4.2), berry(60, 30, 4.7)]} />
    </>
  ),

  // Health: the daisy — the most open flower on the sheet.
  health: (
    <>
      <Fill d={[stalk([44, 100, 42, 80, 40, 62, 40, 36], 3.2, 1.8), stalk([41, 70, 47, 64, 52, 58, 55, 51], 1.8, 1.1)]} />
      <Fill d={[leaf(41, 78, -18, 22, 7.2, 3.5), leaf(43, 89, 198, 20, 6.8, -3.5)]} />
      <Fill d={bud(55, 51, -68, 8, 3.4)} />
      <Back d={DAISY.back} />
      <Fill d={DAISY.front} />
    </>
  ),

  // Family: two tulips on one clump, the smaller beside and not behind.
  parenting: (
    <>
      <Fill d={[leaf(47, 100, -104, 40, 6.2, -4.5), leaf(50, 100, -72, 30, 5.2, 4)]} />
      <Fill d={[stalk([48, 100, 46, 82, 41, 68, 35.4, 53.5], 3, 2.2), stalk([48, 90, 51, 78, 55, 68, 58.8, 59], 2.4, 1.8)]} />
      <Back d={[...TULIP_BIG.back, ...TULIP_SMALL.back]} />
      <Fill d={[...TULIP_BIG.front, ...TULIP_SMALL.front]} />
    </>
  ),

  // Digital: forget-me-not — a spray, because the point is the connections.
  digital_safety: (
    <>
      <Fill d={[stalk([47, 100, 46, 82, 44, 66, 42, 50], 3, 1.6), stalk([44, 72, 37, 68, 30, 62, 26, 52], 2, 1.1), stalk([44, 64, 51, 59, 56, 52, 58, 44], 2, 1.1)]} />
      <Fill d={[ray(45, 82, -26, 18, 3.6), ray(46, 92, 204, 16, 3.3)]} />
      {["M42 50C40 42 41 36 44 33", "M44 33C47 30 51 29 54 31C56 33 55 35 53 35", "M26 52Q24 49 24 46", "M26 52Q22 54 19 55", "M58 44Q59 41 60 37", "M58 44Q62 44 65 44", "M42 52Q39 49 36 46"].map((d) => (
        <Thread key={d} d={d} />
      ))}
      <Fill d={[disc(41, 39, 1.9), disc(44.5, 33.5, 1.6), disc(49.5, 30, 1.3), disc(53.5, 31.5, 1)]} />
      <Back d={[...forgetMeNot(19, 55, 1.8, 12), ...forgetMeNot(65, 44, 1.7, 30)]} />
      <Fill d={[...forgetMeNot(24, 45, 2.3), ...forgetMeNot(60, 36, 2.2, 20), ...forgetMeNot(36, 45, 2, 36)]} />
    </>
  ),

  // Leadership: lavender, because being seen from across a field is the point.
  leadership: (
    <>
      <Fill d={[petal(40, 97, -112, 28, 1.9, -2.5), petal(42, 99, -74, 24, 1.8, 2.5), petal(54, 98, -58, 20, 1.6, 2)]} />
      <Fill d={[stalk([41, 100, 39, 82, 37, 64, 36.4, 22], 2.6, 1.2), stalk([53, 100, 55, 86, 57, 70, 57.8, 40], 2.2, 1.1)]} />
      <Back d={[...LAVENDER_TALL.back, ...LAVENDER_SHORT.back]} />
      <Fill d={[...LAVENDER_TALL.front, ...LAVENDER_SHORT.front]} />
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
