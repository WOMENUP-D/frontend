/**
 * What fills the promotion slots on the portal.
 *
 * Everything here is first-party: the copy, the link and the artwork are ours
 * or a named partner's, they are chosen on the server side of our own product,
 * and nothing about the woman reading the page leaves the browser to decide
 * what she sees. That is not a stylistic preference — the portal's standing
 * rule is that nothing leaves the platform without a matching consent record,
 * and a third-party ad tag is a tracker on every page load with no consent
 * behind it. A network can be added later (see `resolveSlot`), but it has to
 * arrive with a consent gate in front of it, not as a script tag.
 *
 * The slot ids are layout positions, not campaigns, so the same creative can be
 * moved between them and a slot can be emptied without touching the page.
 */

import type { MessageKey } from "@/i18n/messages";

export type SlotId = "home-top" | "home-mid";

export interface Promo {
  id: string;
  /** i18n keys — promo copy is UI copy and is written in all three languages. */
  title: MessageKey;
  body: MessageKey;
  cta: MessageKey;
  href: string;
  /** The promotion leaves WomanUP for the partner's own site. Rendered as a
   *  plain link that opens in a new tab, never as a client-side route. */
  external?: boolean;
  /** Whose promotion it is, shown to the reader. An unlabelled promotion in the
   *  middle of a state portal reads as editorial, which it is not. */
  sponsor: MessageKey;
  /** Picks the slot's tint. Kept symbolic so the palette stays in the CSS. */
  tone: "plum" | "sand" | "rose";
}

/** The current book of first-party promotions, in priority order per slot. */
const BOOK: Record<SlotId, Promo[]> = {
  "home-top": [
    {
      id: "tijoratmarkazi",
      title: "promo.tijorat.title",
      body: "promo.tijorat.body",
      cta: "promo.tijorat.cta",
      href: "https://tijoratmarkazi.uz",
      external: true,
      sponsor: "promo.sponsor.tijorat",
      tone: "plum",
    },
    {
      id: "wbip",
      title: "promo.wbip.title",
      body: "promo.wbip.body",
      cta: "promo.wbip.cta",
      // The bare domain serves a certificate for another host; `www` is
      // the address the site itself answers on.
      href: "https://www.wbip.uz",
      external: true,
      sponsor: "promo.sponsor.wbip",
      tone: "sand",
    },
  ],
  "home-mid": [
    {
      id: "hh-vacancies",
      title: "promo.jobs.title",
      body: "promo.jobs.body",
      cta: "promo.jobs.cta",
      href: "/vakansiyalar",
      sponsor: "promo.sponsor.jobs",
      tone: "rose",
    },
  ],
};

/**
 * What to show in a slot.
 *
 * This is the seam. Today it answers from `BOOK`; the day a network is wired in,
 * it becomes the one place that decides between a first-party promotion and a
 * bought one, and the page and the layout do not change. Whatever is added here
 * must not reach outside the platform before a consent record exists for it.
 */
export function resolveSlot(slot: SlotId): Promo[] {
  return BOOK[slot] ?? [];
}
