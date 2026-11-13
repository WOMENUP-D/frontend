/**
 * The four families, self-hosted through next/font (QA H-05).
 *
 * They used to arrive through a render-blocking `@import` of Google's CSS at
 * the top of globals.css: app CSS, then the font CSS from a third-party host,
 * then the files — three round trips before the first word was drawn. Now the
 * files are part of the build, served from our own origin, preloaded where it
 * matters, and given metric-matched fallbacks so the swap does not shift the
 * page. The CSS custom properties below are read by `--font-*` in globals.css.
 *
 * Cyrillic subsets are included: Russian and Uzbek Cyrillic are first-class
 * locales here, not fallbacks.
 */
import { IBM_Plex_Mono, IBM_Plex_Sans, Playfair_Display, Source_Serif_4 } from "next/font/google";

// next/font needs every option as a literal, so the subsets are repeated.
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--nf-plex-sans",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--nf-plex-mono",
});

export const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
  variable: "--nf-playfair",
});

export const sourceSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  axes: ["opsz"],
  display: "swap",
  preload: false,
  variable: "--nf-source-serif",
});

export const fontVariables = [plexSans, plexMono, playfair, sourceSerif]
  .map((font) => font.variable)
  .join(" ");
