/**
 * The hero sakura, traced from the composition sketch.
 *
 * The skeleton is the sketch, mapped onto the hero as fractions of its box so
 * it holds its shape at any width: a main limb entering top-centre and plunging
 * to the bottom-right corner; a narrow fork running just above it and rejoining
 * on the way down; a straight twig reaching back left over the fold; a second
 * one lower down; a branch that hooks right and hangs vertically; and four
 * blossoms already loose in the air.
 *
 * The *look* comes from the reference painting instead: blossom runs the whole
 * length of the wood rather than clustering only at the tips, in three tints so
 * the mass reads as painted rather than stamped, over near-black bark.
 *
 * Drawn as tapered filled ribbons rather than uniform strokes, so the wood
 * thins from the limb to the tips in one continuous line — that taper is what
 * separates an ink drawing from a set of pipes.
 *
 * Background texture only: the layer is pointer-events:none and sits behind
 * every element of the hero. Deterministic (fixed-seed PRNG, no Date or
 * Math.random at render time) so server and client markup agree.
 *
 * Coordinates are viewBox units: 1 unit = 1.44 CSS px at the pinned scale, so
 * x 0..1000 is a 1440px-wide hero and y 0..308 its height; past those the tail
 * runs off the corner and the layer is clipped.
 */

type Pt = [number, number];
type Seg = [Pt, Pt, Pt, Pt];

/** Where petals are shed from, in viewport units. Kept next to the geometry
 *  so the two cannot drift apart. */
export const CANOPY_ZONES: ReadonlyArray<{
  left: number; width: number; top: number; height: number; weight: number;
}> = [
  { left: 48, width: 30, top: 10, height: 8, weight: 2 },
  { left: 58, width: 40, top: 34, height: 26, weight: 3 },
];

/** mulberry32 — small, fast, and repeatable across server and client.
 *  Exported for <Sky />, which seeds its own stream for the moon's craters:
 *  separate sequences mean nudging one drawing cannot re-scatter the other. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ spline */

/** Catmull-Rom through the given points, expressed as cubic Bézier segments.
 *  Lets a branch be authored as a handful of waypoints instead of control
 *  points, which is what keeps the curves organic rather than geometric.
 *  Exported alongside the other geometry helpers so a second drawing can be
 *  built from the same curves rather than a lookalike set. */
export function spline(pts: ReadonlyArray<Pt>): Seg[] {
  const segs: Seg[] = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    segs.push([
      p1,
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    ]);
  }
  return segs;
}

function cubic(s: Seg, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [
    a * s[0][0] + b * s[1][0] + c * s[2][0] + d * s[3][0],
    a * s[0][1] + b * s[1][1] + c * s[2][1] + d * s[3][1],
  ];
}

/** First derivative — the direction of travel, used for the ribbon normals. */
function slope(s: Seg, t: number): Pt {
  const u = 1 - t;
  const a = 3 * u * u, b = 6 * u * t, c = 3 * t * t;
  return [
    a * (s[1][0] - s[0][0]) + b * (s[2][0] - s[1][0]) + c * (s[3][0] - s[2][0]),
    a * (s[1][1] - s[0][1]) + b * (s[2][1] - s[1][1]) + c * (s[3][1] - s[2][1]),
  ];
}

/** Point and unit normal at u ∈ [0,1] along a whole chain of segments.
 *  Exported alongside `spline` and `ribbon` — see the note there. */
export function walk(segs: Seg[], u: number): { p: Pt; n: Pt } {
  const c = Math.min(0.999999, Math.max(0, u));
  const i = Math.floor(c * segs.length);
  const t = c * segs.length - i;
  const p = cubic(segs[i], t);
  const d = slope(segs[i], t);
  const len = Math.hypot(d[0], d[1]) || 1;
  return { p, n: [-d[1] / len, d[0] / len] };
}

/**
 * A closed outline that follows the centreline and narrows from w0 to w1.
 * Sampled densely enough that the polyline reads as a smooth edge at any
 * sensible render size.
 *
 * Exported alongside `spline` — see the note there.
 */
export function ribbon(segs: Seg[], w0: number, w1: number): string {
  const SUB = 9;
  const total = segs.length * SUB;
  const left: string[] = [];
  const right: string[] = [];

  for (let i = 0; i <= total; i += 1) {
    const u = i / total;
    const { p, n } = walk(segs, u);
    // Taper slightly ahead of linear, so the tip goes fine early and the
    // last stretch of twig stays hair-thin instead of wedge-shaped.
    const w = (w0 + (w1 - w0) * Math.pow(u, 0.72)) / 2;
    left.push(`${+(p[0] + n[0] * w).toFixed(1)} ${+(p[1] + n[1] * w).toFixed(1)}`);
    right.push(`${+(p[0] - n[0] * w).toFixed(1)} ${+(p[1] - n[1] * w).toFixed(1)}`);
  }
  return `M${left.join("L")}L${right.reverse().join("L")}Z`;
}

/* ------------------------------------------------------------- the geometry */

interface Twig {
  /** Waypoints of the centreline, in the 860 × 800 viewBox. */
  pts: Pt[];
  /** Wood width where the twig leaves its parent, and at the tip. */
  w: [number, number];
  /** Blossoms carried on this twig. */
  bloom?: number;
  /** Closed buds — always further out than the flowers. */
  buds?: number;
  /** Where along the twig the blossom starts. Cherry flowers on the outer wood. */
  from?: number;
  /** Size multiplier for this twig's flowers. */
  size?: number;
}

/**
 * The main limb, traced from the sketch: in from behind the header at just past
 * the middle of the page, out to the right while barely dropping, then rolling
 * over into a plunge that leaves through the bottom-right corner.
 */
const MAIN: Pt[] = [
  [430, -26], [470, -8], [518, 35], [593, 59], [651, 76], [708, 98],
  [762, 122], [804, 144], [828, 161], [853, 186], [875, 211], [894, 243],
  [914, 278], [932, 318], [947, 362], [958, 408],
];

/**
 * Side branches, also from the sketch: a narrow fork running just above the
 * limb and rejoining on the descent, two straight reaches back to the left, and
 * one that hooks right and hangs vertically. Each starts on a waypoint of its
 * parent so the joins are seamless; `bloom` runs from `from` to the tip, so
 * blossom rides the outer wood the way the painting has it.
 */
const TWIGS: Twig[] = [
    // Every twig starts on a waypoint of MAIN and grows away from the wood.
    //
    // Two things had to be got right here, and both were wrong before.
    //
    // Attachment: reaches inherited from an earlier layout sat 80-210 units off
    // the limb and pointed back toward the origin — twigs growing out of
    // nothing, against the direction of growth.
    //
    // Balance: sending them all "forward" piled two thirds of the blossom above
    // the limb. Near the tail the limb plunges faster than any twig, so a
    // down-and-right twig still ends up above it. The lower ones therefore
    // *hang* — steeply, drifting back under the sweep — which is both what a
    // heavy cherry branch does and what fills the empty space beneath it.

    // --- the first third, which used to carry almost nothing ---
    {pts: [[518, 35], [537, 76], [548, 112]],
     w: [3.0, 0.72], bloom: 4, buds: 3, from: 0.1, size: .86},
    {pts: [[593, 59], [634, 44], [668, 34]],
     w: [3.6, 0.8], bloom: 5, buds: 3, from: 0.1, size: .9},
    {pts: [[651, 76], [667, 121], [674, 159]],
     w: [3.4, 0.78], bloom: 5, buds: 3, from: 0.12, size: .9},

    // --- the middle, where the mass belongs ---
    {pts: [[708, 98], [757, 82], [798, 72], [832, 69]],
     w: [5.4, 1.0], bloom: 6, buds: 4, from: 0.14, size: .98},
    {pts: [[798, 72], [816, 51], [828, 34]],
     w: [2.2, 0.6], bloom: 3, buds: 2, from: 0.1, size: .8},
    {pts: [[762, 122], [775, 168], [780, 208]],
     w: [3.8, 0.82], bloom: 6, buds: 4, from: 0.12, size: .92},
    {pts: [[804, 144], [847, 130], [882, 123]],
     w: [4.2, 0.88], bloom: 5, buds: 3, from: 0.14, size: .94},
    {pts: [[853, 186], [860, 233], [860, 274]],
     w: [3.6, 0.8], bloom: 6, buds: 4, from: 0.12, size: .92},

    // --- the far end stays light, so the branch tapers out ---
    {pts: [[875, 211], [917, 199], [951, 194]],
     w: [3.4, 0.78], bloom: 4, buds: 3, from: 0.14, size: .88},
    {pts: [[894, 243], [889, 291], [880, 330]],
     w: [2.8, 0.7], bloom: 4, buds: 3, from: 0.1, size: .84},
    {pts: [[932, 318], [971, 307], [1003, 302]],
     w: [2.6, 0.66], bloom: 3, buds: 2, from: 0.12, size: .82},
];

/* ------------------------------------------------------ generated placement */

/** `t` picks one of three petal tints, so a cluster is never one flat pink. */
interface Bloom { x: number; y: number; s: number; a: number; t: number }

const rand = prng(20260821);

const WOOD: string[] = [];
/** Grain lines that ride the wood — the bark texture of the reference. */
const GRAIN: Array<{ d: string; o: number }> = [];
const FLOWERS: Bloom[] = [];
const BUDS: Bloom[] = [];
/** Soft watercolour haze under the blossom, so the mass reads as one wash of
 *  colour from across the room rather than as separate stickers. */
const WASH: Array<{ x: number; y: number; r: number }> = [];

/** Blossom, buds and bark grain for one length of wood. */
function dress(pts: ReadonlyArray<Pt>, w: [number, number], t: Twig) {
  const segs = spline(pts);
  WOOD.push(ribbon(segs, w[0], w[1]));

  // Two or three fibres running the length of the limb, inset from its edges
  // and fading out as the wood narrows. Cheaper and calmer than a filter.
  const fibres = w[0] > 8 ? 3 : w[0] > 4 ? 2 : 1;
  for (let i = 0; i < fibres; i += 1) {
    const lane = (i + 1) / (fibres + 1) - 0.5; // -0.5..0.5 across the width
    const pass: string[] = [];
    const STEP = segs.length * 6;
    for (let k = 0; k <= STEP; k += 1) {
      const u = k / STEP;
      const { p, n } = walk(segs, u);
      const width = w[0] + (w[1] - w[0]) * Math.pow(u, 0.72);
      const off = lane * width * 0.72;
      pass.push(`${+(p[0] + n[0] * off).toFixed(1)} ${+(p[1] + n[1] * off).toFixed(1)}`);
    }
    GRAIN.push({ d: `M${pass.join("L")}`, o: +(0.16 + rand() * 0.16).toFixed(2) });
  }

  const from = t.from ?? 0.5;
  const size = t.size ?? 1;

  for (let i = 0; i < (t.bloom ?? 0); i += 1) {
    const u = from + (1 - from) * ((i + 0.12 + rand() * 0.76) / (t.bloom ?? 1));
    const { p, n } = walk(segs, u);
    const off = (1.4 + rand() * 9) * (rand() < 0.5 ? 1 : -1);
    FLOWERS.push({
      x: +(p[0] + n[0] * off).toFixed(1),
      y: +(p[1] + n[1] * off).toFixed(1),
      s: +((0.48 + rand() * 0.3) * size).toFixed(3),
      a: Math.round(rand() * 360),
      t: Math.floor(rand() * 3),
    });
  }

  // Buds ride the last of the wood, past the open flowers.
  for (let i = 0; i < (t.buds ?? 0); i += 1) {
    const u = 0.62 + 0.4 * ((i + rand() * 0.9) / (t.buds ?? 1));
    const { p, n } = walk(segs, Math.min(1, u));
    const off = (1.2 + rand() * 6) * (rand() < 0.5 ? 1 : -1);
    BUDS.push({
      x: +(p[0] + n[0] * off).toFixed(1),
      y: +(p[1] + n[1] * off).toFixed(1),
      s: +((0.5 + rand() * 0.3) * size).toFixed(3),
      a: Math.round(rand() * 360),
      t: 0,
    });
  }

  // A wash under each flowering stretch, sized to how much blossom it carries.
  const n = t.bloom ?? 0;
  if (n >= 3) {
    for (const at of [0.45, 0.78]) {
      const { p } = walk(segs, Math.min(1, from + (1 - from) * at));
      WASH.push({
        x: +p[0].toFixed(1),
        y: +p[1].toFixed(1),
        r: Math.round(18 + n * 2.8),
      });
    }
  }
}

{
  dress(MAIN, [11, 1.3], { pts: [], w: [11, 1.3], bloom: 13, buds: 5, from: 0.28, size: 1.02 });
  for (const twig of TWIGS) dress(twig.pts, twig.w, twig);
}

/* -------------------------------------------------------------- the drawing */

/** A cherry petal: broad, rounded, with the cleft the real flower has. */
export const PETAL =
  "M0 -2 C -7.4 -6.8, -9.6 -15.8, -5.6 -21.8 C -3.6 -20.2, -1.8 -20.6, 0 -18.8 " +
  "C 1.8 -20.6, 3.6 -20.2, 5.6 -21.8 C 9.6 -15.8, 7.4 -6.8, 0 -2 Z";

/**
 * The blossom vocabulary — three petal tints, the colour wash, the bud, and the
 * five-petal flower and bud symbols built from them.
 *
 * It lives here and is rendered by both branches because they must be the same
 * flower: the hero canopy and the bottom-left limb are two corners of one
 * scene, and when each kept its own copy of these gradients they drifted — the
 * canopy ended up with three tints and a white-centred petal, the corner with
 * two and an inverted one, which is exactly what made the second branch read as
 * a different plant. One definition, two instances, no way to change one alone.
 *
 * `p` prefixes every id, because two SVGs in one document cannot both define
 * `#Bloom0`.
 */
export function BlossomDefs({ p }: { p: string }) {
  return (
    <>
      {/* Three tints so a cluster is never one flat pink, the way the
          reference painting shifts from near-white to a deeper rose. */}
      <radialGradient id={`${p}Petal0`} cx="50%" cy="88%" r="86%">
        <stop offset="0%" stopColor="var(--bloom-core)" />
        <stop offset="26%" stopColor="var(--bloom-core)" />
        <stop offset="62%" stopColor="var(--bloom-mid)" />
        <stop offset="100%" stopColor="var(--bloom-edge)" />
      </radialGradient>
      <radialGradient id={`${p}Petal1`} cx="46%" cy="92%" r="92%">
        <stop offset="0%" stopColor="var(--bloom-core)" />
        <stop offset="18%" stopColor="var(--bloom-mid)" />
        <stop offset="70%" stopColor="var(--bloom-edge)" />
        <stop offset="100%" stopColor="var(--bloom-deep)" />
      </radialGradient>
      <radialGradient id={`${p}Petal2`} cx="54%" cy="84%" r="80%">
        <stop offset="0%" stopColor="var(--bloom-core)" />
        <stop offset="44%" stopColor="var(--bloom-core)" />
        <stop offset="82%" stopColor="var(--bloom-mid)" />
        <stop offset="100%" stopColor="var(--bloom-edge)" />
      </radialGradient>

      <radialGradient id={`${p}Wash`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="var(--bloom-wash)" stopOpacity=".34" />
        <stop offset="52%" stopColor="var(--bloom-wash)" stopOpacity=".16" />
        <stop offset="100%" stopColor="var(--bloom-wash)" stopOpacity="0" />
      </radialGradient>

      <radialGradient id={`${p}Bud`} cx="42%" cy="78%" r="70%">
        <stop offset="0%" stopColor="var(--bloom-mid)" />
        <stop offset="100%" stopColor="var(--bloom-bud)" />
      </radialGradient>

      {[0, 1, 2].map((tint) => (
        <g key={tint} id={`${p}Bloom${tint}`}>
          {[0, 72, 144, 216, 288].map((angle) => (
            <path
              key={angle}
              transform={`rotate(${angle})`}
              d={PETAL}
              fill={`url(#${p}Petal${tint})`}
              stroke="var(--bloom-line)"
              strokeWidth=".45"
              strokeOpacity=".55"
            />
          ))}
          {/* Stamens: a short filament with a dot of pollen at the end. */}
          {[16, 88, 160, 232, 304].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <path d="M0 0 L0 -6.4" stroke="var(--bloom-heart)"
                strokeWidth=".55" strokeOpacity=".75" />
              <circle cy="-6.8" r=".9" fill="var(--bloom-heart)" />
            </g>
          ))}
          <circle r="1.6" fill="var(--bloom-heart)" fillOpacity=".9" />
        </g>
      ))}

      <g id={`${p}BudShape`}>
        <path d="M0 0 L0 -4.6" stroke="var(--bark-soft)" strokeWidth=".8" />
        <path
          d="M0 -4.2 C -3.4 -6, -4.2 -10.4, 0 -13.6 C 4.2 -10.4, 3.4 -6, 0 -4.2 Z"
          fill={`url(#${p}Bud)`}
          stroke="var(--bloom-line)"
          strokeWidth=".35"
          strokeOpacity=".5"
        />
      </g>
    </>
  );
}

export function Sakura({ variant = "hero" }: { variant?: "hero" | "ambient" | "corner" }) {
  /* Two instances of this drawing can share a document, so the ids cannot be
     literals — the second copy's <use> would resolve against the first copy's
     defs. */
  const p = variant === "corner" ? "wc" : variant === "ambient" ? "wa" : "wu";
  return (
    <div className={`sakura sakura-${variant}`} aria-hidden="true">
      <span className="sakura-anchor">
        <svg
          className="sakura-branch"
          viewBox="0 -50 1170 420"
          preserveAspectRatio="xMidYMin meet"
          role="presentation"
        >
          <defs>
            {/* Near-black where the limb is thick, warming out toward the twigs. */}
            <linearGradient id={`${p}Bark`} gradientUnits="userSpaceOnUse"
              x1="420" y1="0" x2="990" y2="420">
              <stop offset="0" stopColor="var(--bark)" />
              <stop offset=".55" stopColor="var(--bark)" />
              <stop offset="1" stopColor="var(--bark-soft)" />
            </linearGradient>

            <BlossomDefs p={p} />
          </defs>

          {/* Colour wash first — it has to sit under the wood and the flowers. */}
          <g className="sakura-wash">
            {WASH.map((w, i) => (
              <circle key={`${w.x}-${w.y}-${i}`} cx={w.x} cy={w.y} r={w.r} fill={`url(#${p}Wash)`} />
            ))}
          </g>

          <g className="sakura-wood">
            <g fill={`url(#${p}Bark)`}>
              {WOOD.map((d) => <path key={d.slice(0, 24)} d={d} />)}
            </g>
            <g fill="none" stroke="var(--bark-grain)" strokeWidth=".9" strokeLinecap="round">
              {GRAIN.map((g) => <path key={g.d.slice(0, 24)} d={g.d} strokeOpacity={g.o} />)}
            </g>
          </g>

          {BUDS.map((b) => (
            <use
              key={`bud-${b.x}-${b.y}-${b.a}`}
              href={`#${p}BudShape`}
              transform={`translate(${b.x} ${b.y}) rotate(${b.a}) scale(${b.s})`}
            />
          ))}

          {FLOWERS.map((f) => (
            <use
              key={`fl-${f.x}-${f.y}-${f.a}`}
              href={`#${p}Bloom${f.t}`}
              transform={`translate(${f.x} ${f.y}) rotate(${f.a}) scale(${f.s})`}
            />
          ))}
        </svg>
      </span>
    </div>
  );
}
