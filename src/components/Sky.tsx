/**
 * What is in the sky: the moon after dark, the sun by day.
 *
 * It used to live inside the corner branch, at fifty pixels across and an arm's
 * length from the primary button — which made it a large graphic sitting next to
 * the content rather than a body in the sky. So it moved: small, high and far to
 * the left, on the fixed background layer beside the branch, painting behind
 * every piece of the interface at all times.
 *
 * Distance is carried by three things and none of them is size alone — the edge
 * is feathered rather than cut, and the light around it falls off through three
 * widening stops into an atmospheric haze with no boundary of its own. That last
 * layer is what puts air between the viewer and the sky.
 *
 * The moon is drawn, not photographed. It was a 48×48 PNG, which was fine at the
 * fifty pixels it started at and fell apart the moment it was asked to be a
 * feature of the page: at ninety-odd CSS pixels on a 2× display the artwork is
 * being enlarged nearly four times and the craters turn to porridge. A disc with
 * craters is a couple of dozen circles, so drawing it costs less than the file
 * did and it is sharp at any size anyone ever picks.
 *
 * The craters are placed with the same deterministic PRNG the branches use, so
 * the markup is identical on the server and the client. They are also
 * foreshortened: a crater's radial axis is squashed by its distance from the
 * centre, which is what stops a flat scatter of circles reading as a sticker and
 * makes it read as a sphere.
 *
 * Nothing hangs in the sky by day. There was a sun; it is gone, and with it the
 * whole layer rather than just the disc — the haze around it has no edge of its
 * own, so on its own it is a bright smudge in the corner rather than weather.
 *
 * Background texture only: aria-hidden, pointer-events:none, z-index -1.
 */

import { prng } from "./Sakura";

const rand = prng(20260827);

/** Radius of the disc in viewBox units; the box is 100 wide. */
const R = 47;

interface Crater { x: number; y: number; rx: number; ry: number; a: number; o: number }

/** Craters, thrown at the visible face and squashed toward the limb.
 *
 *  `sqrt(rand())` for the radius spreads them by *area* — sampling the radius
 *  uniformly would pile them in the middle, which is the giveaway of a scatter
 *  that has never been looked at. */
const CRATERS: Crater[] = Array.from({ length: 34 }, () => {
  const t = rand() * Math.PI * 2;
  const d = R * Math.sqrt(rand()) * 0.93;
  // 1 at the centre, 0 at the limb: how much of a circle you still see when it
  // has rotated away from you.
  const proj = Math.sqrt(Math.max(0, 1 - (d / R) ** 2));
  const s = 1.5 + rand() * 4.4;
  return {
    x: +(50 + d * Math.cos(t)).toFixed(2),
    y: +(50 + d * Math.sin(t)).toFixed(2),
    rx: +Math.max(0.5, s * proj).toFixed(2),
    ry: +s.toFixed(2),
    a: +((t * 180) / Math.PI).toFixed(1),
    o: +(0.1 + rand() * 0.22).toFixed(2),
  };
});

/** The maria — the big dark plains that give a full moon its face. Fewer,
 *  larger and much softer than the craters, and laid down underneath them. */
const MARIA: Crater[] = Array.from({ length: 6 }, () => {
  const t = rand() * Math.PI * 2;
  const d = R * Math.sqrt(rand()) * 0.62;
  const proj = Math.sqrt(Math.max(0, 1 - (d / R) ** 2));
  const s = 9 + rand() * 8;
  return {
    x: +(50 + d * Math.cos(t)).toFixed(2),
    y: +(50 + d * Math.sin(t)).toFixed(2),
    rx: +Math.max(2, s * proj).toFixed(2),
    ry: +s.toFixed(2),
    a: +((t * 180) / Math.PI).toFixed(1),
    o: +(0.16 + rand() * 0.14).toFixed(2),
  };
});

export function Sky() {
  return (
    <div className="sky-layer" aria-hidden="true">
      <span className="sky-haze" />
      <svg className="sky-moon" viewBox="0 0 100 100" role="presentation">
        <defs>
          {/* Lit from the front, so it is bright across the face and only loses
              light at the very rim — a full moon has no terminator to draw. */}
          <radialGradient id="moonBody" cx="44%" cy="40%" r="68%">
            <stop offset="0%" stopColor="var(--moon-lit)" />
            <stop offset="62%" stopColor="var(--moon-lit)" />
            <stop offset="100%" stopColor="var(--moon-limb)" />
          </radialGradient>
          {/* Clips the maria and craters to the disc so the soft-edged ones do
              not bleed past the rim. */}
          <clipPath id="moonDisc">
            <circle cx="50" cy="50" r={R} />
          </clipPath>
          <filter id="moonSoft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>

        <circle cx="50" cy="50" r={R} fill="url(#moonBody)" />

        <g clipPath="url(#moonDisc)">
          <g filter="url(#moonSoft)" fill="var(--moon-mare)">
            {MARIA.map((m) => (
              <ellipse key={`m-${m.x}-${m.y}`} cx={m.x} cy={m.y} rx={m.rx} ry={m.ry}
                transform={`rotate(${m.a} ${m.x} ${m.y})`} fillOpacity={m.o} />
            ))}
          </g>
          <g fill="var(--moon-crater)">
            {CRATERS.map((c) => (
              <ellipse key={`c-${c.x}-${c.y}`} cx={c.x} cy={c.y} rx={c.rx} ry={c.ry}
                transform={`rotate(${c.a} ${c.x} ${c.y})`} fillOpacity={c.o} />
            ))}
          </g>
          {/* A hair of shadow inside the rim. Without it the disc is flat: the
              gradient alone lightens the edge evenly all the way round, and a
              sphere does not do that. */}
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--moon-limb)"
            strokeWidth="6" strokeOpacity=".5" filter="url(#moonSoft)" />
        </g>
      </svg>

    </div>
  );
}
