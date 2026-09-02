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
      id: "edu-job-vacancies",
      title: "promo.eduJob.title",
      body: "promo.eduJob.body",
      cta: "promo.eduJob.cta",
      href: "/imkoniyatlar",
      sponsor: "promo.sponsor.eduJob",
      tone: "plum",
    },
    {
      id: "invest-hub-grants",
      title: "promo.investHub.title",
      body: "promo.investHub.body",
      cta: "promo.investHub.cta",
      href: "/imkoniyatlar",
      sponsor: "promo.sponsor.investHub",
      tone: "sand",
    },
  ],
  "home-mid": [
    {
      id: "tijorat-markazi",
      title: "promo.commerce.title",
      body: "promo.commerce.body",
      cta: "promo.commerce.cta",
      href: "/dasturlar",
      sponsor: "promo.sponsor.commerce",
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
