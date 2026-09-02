"use client";

import { usePathname } from "next/navigation";
import { Sakura } from "./Sakura";
import { Sky } from "./Sky";

/**
 * The scene behind the page.
 *
 * It used to be a reduced version of itself everywhere except the landing page:
 * one faded branch in the top-right corner, no sky and no second limb. That
 * made the portal read as two different products — a garden at the front door
 * and a plain form behind it — and the moment a woman signed in, the thing that
 * made the place hers disappeared.
 *
 * So it is now the same three layers the landing page has: the canopy, the body
 * in the sky, and the limb entering from the left. All three are fixed to the
 * viewport and sit at z-index -1, so they cost the page nothing in layout and
 * scroll under the content rather than with it.
 *
 * Two exceptions, both deliberate. The landing page draws its own copy against
 * its hero, so rendering here as well would stack two canopies on one screen.
 * And the management screens stay bare: a coordinator reading a table of
 * regional figures is working, and a branch behind the numbers is something to
 * read past.
 */
export function AmbientSakura() {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/admin")) return null;
  return (
    <>
      <Sakura />
      <Sky />
      <Sakura variant="corner" />
    </>
  );
}
