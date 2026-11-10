/**
 * The six marks on the direction cards: one plant each.
 *
 * Drawn from real plants rather than picked from an icon set: a wild rose for
 * work, rowan for business, a daisy for health, tulips for family, forget-me-
 * not for the digital world, lavender for leadership. Six pictograms from a
 * library would have been six unrelated drawings; these are one garden.
 *
 * Flat, one colour (the direction's own, through `currentColor`), in the
 * manner of a botanical paper-cut: every petal of a flower is the same clean
 * shape, turned round its centre; the parts behind are set back in a lighter
 * tone (`back`), which is all the depth a single ink needs. Asymmetry lives in
 * the composition — the lean of a stem, the angle of a leaf — never in the
 * shapes, which is what kept an earlier set from looking drawn on purpose.
 *
 * Every stem runs out of the bottom of the box, so the card's own edge cuts the
 * plant and it reads as a detail of something larger. The card clips the right
 * quarter and the bottom tenth of this box — see `.face-mark` — so the plant
 * lives left of x≈72.
 */

const rad = (deg: number) => (deg * Math.PI) / 180;
const n = (value: number) => Math.round(value * 10) / 10;

/** Points in a local frame — origin (x, y), x-axis turned by `deg` — written
 *  out as "x y" pairs in the drawing's own frame. */
function frame(x: number, y: number, deg: number) {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return (px: number, py: number) => `${n(x + px * c - py * s)} ${n(y + px * s + py * c)}`;
}

/** A pointed leaf blade or petal: base at (x, y), tip `len` away along `deg`,
 *  belly `w` to each side; `bend` curves it. */
function blade(x: number, y: number, deg: number, len: number, w: number, bend = 0): string {
  const p = frame(x, y, deg);
  return (
    `M${p(0, 0)}` +
    `C${p(len * 0.18, -w * 0.9 - bend)} ${p(len * 0.62, -w - bend)} ${p(len, 0)}` +
    `C${p(len * 0.62, w - bend)} ${p(len * 0.18, w * 0.9 - bend)} ${p(0, 0)}Z`
  );
}

/** A leaf: the blade with its midrib cut out of it (the path is drawn even-odd). */
function leaf(x: number, y: number, deg: number, len: number, w: number, bend = 0): string {
  const a = rad(deg);
  const vx = x + Math.cos(a) * len * 0.1;
  const vy = y + Math.sin(a) * len * 0.1;
  return blade(x, y, deg, len, w, bend) + blade(vx, vy, deg, len * 0.74, w * 0.09, bend * 0.7);
}

/** A broad petal with a round shoulder and a shallow notch at the tip: a rose. */
function rosePetal(x: number, y: number, deg: number, len: number, w: number): string {
  const p = frame(x, y, deg);
  return (
    `M${p(0, 0)}` +
    `C${p(len * 0.08, -w * 0.62)} ${p(len * 0.6, -w * 1.08)} ${p(len * 0.9, -w * 0.52)}` +
    `C${p(len * 1.0, -w * 0.3)} ${p(len * 0.98, -w * 0.08)} ${p(len * 0.9, 0)}` +
    `C${p(len * 0.98, w * 0.08)} ${p(len * 1.0, w * 0.3)} ${p(len * 0.9, w * 0.52)}` +
    `C${p(len * 0.6, w * 1.08)} ${p(len * 0.08, w * 0.62)} ${p(0, 0)}Z`
  );
}

/** A strap with rounded ends: a daisy ray. */
function ray(x: number, y: number, deg: number, len: number, w: number): string {
  const p = frame(x, y, deg);
  return (
    `M${p(0, 0)}` +
    `C${p(len * 0.2, -w * 0.95)} ${p(len * 0.78, -w)} ${p(len * 0.9, -w * 0.72)}` +
    `C${p(len * 1.08, -w * 0.3)} ${p(len * 1.08, w * 0.3)} ${p(len * 0.9, w * 0.72)}` +
    `C${p(len * 0.78, w)} ${p(len * 0.2, w * 0.95)} ${p(0, 0)}Z`
  );
}

/** A tulip cup: three soft tips at the rim, the middle one highest. The
 *  notches stay shallow; cut deeper, the cup turns into a crown. */
function tulipCup(x: number, y: number, deg: number, h: number, w: number): string {
  const p = frame(x, y, deg);
  const a = w / 2;
  return (
    `M${p(0, 0)}` +
    `C${p(-a * 1.05, -h * 0.02)} ${p(-a * 1.08, -h * 0.56)} ${p(-a * 0.9, -h * 0.97)}` +
    `C${p(-a * 0.72, -h * 0.86)} ${p(-a * 0.5, -h * 0.8)} ${p(-a * 0.33, -h * 0.84)}` +
    `C${p(-a * 0.2, -h * 0.98)} ${p(-a * 0.08, -h * 1.08)} ${p(0, -h * 1.1)}` +
    `C${p(a * 0.08, -h * 1.08)} ${p(a * 0.2, -h * 0.98)} ${p(a * 0.33, -h * 0.84)}` +
    `C${p(a * 0.5, -h * 0.8)} ${p(a * 0.72, -h * 0.86)} ${p(a * 0.9, -h * 0.97)}` +
    `C${p(a * 1.08, -h * 0.56)} ${p(a * 1.05, -h * 0.02)} ${p(0, 0)}Z`
  );
}

/** The one petal facing us: a narrower cup laid over the whole at full tone. */
function tulipFront(x: number, y: number, deg: number, h: number, w: number): string {
  const p = frame(x, y, deg);
  const a = w * 0.26;
  return (
    `M${p(0, 0)}` +
    `C${p(-a * 1.1, -h * 0.02)} ${p(-a * 1.3, -h * 0.5)} ${p(-a * 0.4, -h * 0.96)}` +
    `Q${p(0, -h * 1.0)} ${p(a * 0.4, -h * 0.96)}` +
    `C${p(a * 1.3, -h * 0.5)} ${p(a * 1.1, -h * 0.02)} ${p(0, 0)}Z`
  );
}

/** A circle as a path, so it can sit in a list with the other shapes. */
function disc(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0Z`;
}

/** A berry: a disc with its light cut out of it (even-odd), upper left. */
function berry(cx: number, cy: number, r: number): string {
  return disc(cx, cy, r) + disc(cx - r * 0.36, cy - r * 0.38, r * 0.22);
}

/** A stem that tapers from `w0` at the root to `w1` at the tip along the
 *  cubic (x0 y0, c1, c2, x1 y1). A stroke of one width reads as wire. */
function stalk(pts: readonly number[], w0: number, w1: number): string {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = pts;
  const left: string[] = [];
  const right: string[] = [];
  const steps = 18;
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

/** A closed bud: an egg along `deg`, held by two sepals. */
function bud(x: number, y: number, deg: number, len: number, w: number): string[] {
  return [
    blade(x, y, deg, len, w),
    blade(x, y, deg - 30, len * 0.66, w * 0.34, -0.3),
    blade(x, y, deg + 30, len * 0.66, w * 0.34, 0.3),
  ];
}

/* ------------------------------------------------------------- the plants */

interface Depth {
  back: string[];
  front: string[];
}

/** A wild rose, face on: five broad petals round a ring of stamens, two of
 *  the petals set back. The stamens show in the gap between petals and
 *  heart — the one detail that tells a rose from a generic five-petal flower. */
function rose(cx: number, cy: number, size: number): Depth {
  const petals = [0, 1, 2, 3, 4].map((i) => {
    const deg = -90 + 72 * i;
    const a = rad(deg);
    const r0 = size * 0.22;
    return rosePetal(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, deg, size, size * 0.56);
  });
  const stamens = Array.from({ length: 8 }, (_, i) => {
    const a = rad(i * 45 + 22);
    return disc(cx + Math.cos(a) * size * 0.3, cy + Math.sin(a) * size * 0.3, size * 0.055);
  });
  return {
    back: [petals[1], petals[3]],
    front: [petals[0], petals[2], petals[4], disc(cx, cy, size * 0.15), ...stamens],
  };
}

/** A rose leaf: three leaflets on a short stalk. */
function trifoliate(x: number, y: number, deg: number, size: number): string[] {
  const a = rad(deg);
  const mid: [number, number] = [x + Math.cos(a) * size * 0.55, y + Math.sin(a) * size * 0.55];
  const tip: [number, number] = [x + Math.cos(a) * size * 0.85, y + Math.sin(a) * size * 0.85];
  return [
    stalk([x, y, ...mid, ...mid, x + Math.cos(a) * size * 0.9, y + Math.sin(a) * size * 0.9], 1.2, 0.6),
    blade(mid[0], mid[1], deg - 52, size * 0.62, size * 0.22, -0.4),
    blade(mid[0], mid[1], deg + 52, size * 0.62, size * 0.22, 0.4),
    blade(tip[0], tip[1], deg, size * 0.7, size * 0.24),
  ];
}

/** A rowan leaf: leaflets in pairs along the rachis, and one at the tip. */
function pinnate(x: number, y: number, deg: number, len: number, pairs: number, size: number): string[] {
  const a = rad(deg);
  const at = (t: number): [number, number] => [x + Math.cos(a) * len * t, y + Math.sin(a) * len * t];
  const tip = at(1);
  const out = [stalk([x, y, ...at(0.4), ...at(0.7), ...tip], 1.3, 0.6)];
  for (let i = 1; i <= pairs; i += 1) {
    const t = (i - 0.15) / (pairs + 0.55);
    const [px, py] = at(t);
    const s = size * (1 - t * 0.28);
    out.push(blade(px, py, deg - 56, s, s * 0.26, -0.3), blade(px, py, deg + 56, s, s * 0.26, 0.3));
  }
  out.push(blade(tip[0], tip[1], deg, size * 0.8, size * 0.26));
  return out;
}

/** A corymb of berries: a dome of round fruit on pedicels that fan from one
 *  point, with air between them so each berry stays a berry. */
function rowanCluster(cx: number, cy: number, r: number, from: [number, number]) {
  const gap = r * 2.08;
  const place = (spots: Array<[number, number]>): Array<[number, number]> =>
    spots.map(([dx, dy]) => [cx + dx * gap, cy + dy * gap]);
  const front = place([
    [-1, -0.82], [0, -0.82], [1, -0.82],
    [-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0],
    [-1, 0.82], [0, 0.82], [1, 0.82],
  ]);
  const back = place([[-0.5, -1.62], [0.5, -1.62], [-2, -0.82], [2, -0.82]]);
  const pedicels = [...front, ...back].map(([x, y]) =>
    stalk(
      [from[0], from[1], from[0] + (x - from[0]) * 0.4, from[1] + (y - from[1]) * 0.2, x, y + r * 0.8, x, y],
      1.2,
      0.7,
    ),
  );
  return {
    pedicels,
    back: back.map(([x, y]) => disc(x, y, r * 0.9)),
    front: front.map(([x, y]) => berry(x, y, r)),
  };
}

/** A daisy: slender rays in two rows round a small disc, the back row a
 *  half-step round and set back. Rays stand clear of the disc — a big disc
 *  with petals touching it is a sunflower at any petal count. */
function daisy(cx: number, cy: number, len: number): Depth {
  const row = (count: number, offset: number, scale: number, w: number) =>
    Array.from({ length: count }, (_, i) => {
      const deg = -90 + (360 / count) * i + offset;
      const a = rad(deg);
      const r0 = len * 0.36;
      return ray(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, deg, len * scale, w);
    });
  return {
    back: row(18, 10, 0.86, len * 0.1),
    front: [...row(18, 0, 1, len * 0.11), disc(cx, cy, len * 0.3)],
  };
}

/** A tulip at three-quarters: the whole cup set back, the petal facing us
 *  laid over it at full tone. The cup follows the lean of its stem. */
function tulip(x: number, y: number, deg: number, h: number, w: number): Depth {
  return { back: [tulipCup(x, y, deg, h, w)], front: [tulipFront(x, y, deg, h, w)] };
}

/** A forget-me-not: five round petals, overlapping, with the eye cut out of
 *  the middle (even-odd) — the eye is the flower. */
function forgetMeNot(cx: number, cy: number, r: number, turn = 0): string {
  let d = "";
  for (let i = 0; i < 5; i += 1) {
    const a = rad(-90 + 72 * i + turn);
    d += disc(cx + Math.cos(a) * r * 1.12, cy + Math.sin(a) * r * 1.12, r);
  }
  return d + disc(cx, cy, r * 0.42);
}

/** A lavender spike: pairs of florets up a thin stem, closing to a tip, the
 *  pair behind each whorl set back. */
function lavender(x: number, bottom: number, top: number, whorls: number, size: number): Depth {
  const back: string[] = [];
  const front: string[] = [];
  for (let i = 0; i < whorls; i += 1) {
    const k = i / (whorls - 1);
    const py = bottom - (bottom - top) * k;
    const s = size * (1 - k * 0.3);
    back.push(blade(x, py, -90 - 72, s * 0.95, s * 0.34), blade(x, py, -90 + 72, s * 0.95, s * 0.34));
    front.push(blade(x, py + 0.4, -90 - 32, s, s * 0.36), blade(x, py + 0.4, -90 + 32, s, s * 0.36));
  }
  front.push(blade(x, top + 0.5, -90, size * 1.15, size * 0.32));
  return { back, front };
}

/* ------------------------------------------------------------- the marks */

export type MarkKind =
  | "vocational_skills"
  | "entrepreneurship"
  | "health"
  | "parenting"
  | "digital_safety"
  | "leadership";

/** Filled shapes, drawn in order; a layer marked `back` is set back in tone. */
interface Layer {
  d: string[];
  back?: boolean;
}

const ROSE = rose(38, 30, 16.5);
const DAISY = daisy(40, 30, 17);
const TULIP_BIG = tulip(34, 50, -14, 25, 21);
const TULIP_SMALL = tulip(58, 60, 12, 18, 15);
const LAVENDER = [lavender(33, 64, 20, 9, 6.2), lavender(50, 72, 34, 8, 5.6), lavender(64, 80, 48, 7, 5)];
const ROWAN = rowanCluster(50, 36, 4.3, [49, 56]);

const MARKS: Record<MarkKind, Layer[]> = {
  // Work: a wild rose open, one bud beside it.
  vocational_skills: [
    { d: [stalk([48, 100, 46, 82, 41, 62, 38, 46], 3.2, 1.8), stalk([42, 66, 36, 62, 29, 58, 24, 50], 2, 1.1)] },
    { d: [...trifoliate(44, 76, -22, 18), ...trifoliate(46, 88, 198, 15)] },
    { d: bud(24, 50, -108, 11, 3.6) },
    { d: ROSE.back, back: true },
    { d: ROSE.front },
  ],

  // Business: rowan — what a branch carries after a season, not in a week.
  entrepreneurship: [
    { d: [stalk([50, 100, 49, 84, 48, 70, 49, 56], 3.2, 1.6)] },
    { d: [...pinnate(48, 76, -160, 30, 4, 8.5), ...pinnate(49, 89, 20, 24, 3, 7)] },
    { d: ROWAN.pedicels },
    { d: ROWAN.back, back: true },
    { d: ROWAN.front },
  ],

  // Health: the daisy — the most open flower on the sheet.
  health: [
    { d: [stalk([46, 100, 44, 82, 41, 62, 40, 36], 3.2, 1.8), stalk([42, 72, 48, 66, 54, 60, 58, 52], 1.8, 1.1)] },
    { d: [leaf(43, 80, -22, 24, 6.4, 3), leaf(45, 91, 200, 22, 6, -3)] },
    { d: bud(58, 52, -66, 8.5, 3.4) },
    { d: DAISY.back, back: true },
    { d: DAISY.front },
  ],

  // Family: two tulips on one clump, the smaller beside and not behind.
  parenting: [
    { d: [leaf(46, 100, -106, 44, 6.6, -5), leaf(52, 100, -68, 34, 5.6, 5)] },
    { d: [stalk([50, 100, 47, 84, 40, 68, 34, 50], 3, 2.2), stalk([50, 100, 53, 86, 56, 74, 58, 60], 2.4, 1.8)] },
    { d: [...TULIP_BIG.back, ...TULIP_SMALL.back], back: true },
    { d: [...TULIP_BIG.front, ...TULIP_SMALL.front] },
  ],

  // Digital: forget-me-not — a spray, because the point is the connections.
  digital_safety: [
    {
      d: [
        stalk([48, 100, 47, 82, 45, 66, 43, 50], 2.4, 1.2),
        stalk([45, 68, 38, 64, 30, 58, 25, 50], 1.5, 0.9),
        stalk([44, 60, 51, 55, 58, 48, 63, 42], 1.5, 0.9),
      ],
    },
    { d: [leaf(46, 84, -24, 20, 4.2, 2), leaf(47, 93, 204, 17, 3.8, -2)] },
    { d: [stalk([43, 50, 42, 42, 44, 36, 48, 33], 1.2, 0.9), stalk([48, 33, 52, 30, 56, 31, 58, 35], 0.9, 0.7)] },
    { d: [disc(53, 29.8, 1.6), disc(56.4, 31.3, 1.3), disc(58.4, 34.6, 1.1)] },
    { d: [forgetMeNot(31, 54, 2.8, 10), forgetMeNot(54, 42, 2.7, 24), forgetMeNot(20, 42, 2.4, 30)], back: true },
    {
      d: [
        forgetMeNot(25, 48, 3.4),
        forgetMeNot(36, 41, 3.2, 20),
        forgetMeNot(46, 31, 3.3, 8),
        forgetMeNot(63, 41, 3.3, 30),
        forgetMeNot(70, 52, 2.6, 15),
      ],
    },
  ],

  // Leadership: lavender, because being seen from across a field is the point.
  leadership: [
    {
      d: [
        blade(38, 99, -116, 26, 1.8, -2.5),
        blade(44, 100, -80, 22, 1.7, 2),
        blade(56, 100, -64, 20, 1.6, 2),
        blade(50, 100, -100, 18, 1.5, -1.5),
      ],
    },
    {
      d: [
        stalk([40, 100, 38, 84, 35, 70, 33, 20], 2.4, 1.1),
        stalk([50, 100, 50, 86, 50, 72, 50, 34], 2.2, 1.1),
        stalk([60, 100, 62, 88, 63, 76, 64, 48], 2, 1),
      ],
    },
    { d: LAVENDER.flatMap((spike) => spike.back), back: true },
    { d: LAVENDER.flatMap((spike) => spike.front) },
  ],
};

export function DirectionMark({ kind }: { kind: MarkKind }) {
  return (
    <svg className="face-mark" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {MARKS[kind].map((layer, i) => {
        const paths = layer.d.map((d, j) => <path key={j} d={d} fillRule="evenodd" />);
        return layer.back ? (
          <g key={i} opacity=".55">
            {paths}
          </g>
        ) : (
          <g key={i}>{paths}</g>
        );
      })}
    </svg>
  );
}
