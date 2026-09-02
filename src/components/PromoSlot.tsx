"use client";

/**
 * A promotion slot: a labelled, first-party banner in a fixed layout position.
 *
 * Two rules it is built to keep. It is always attributed — `sponsor` is drawn,
 * never optional, because an unlabelled promotion inside a state portal reads as
 * editorial and is a different thing to a reader than an advertisement. And it
 * renders nothing at all when its slot is empty, so an unsold position closes up
 * instead of leaving the hole this page was accused of having.
 */

import Link from "next/link";
import { useI18n } from "@/i18n";
import { resolveSlot, type SlotId } from "@/services/promos";

export function PromoSlot({ slot }: { slot: SlotId }) {
  const { t } = useI18n();
  const items = resolveSlot(slot);
  if (items.length === 0) return null;

  return (
    <div className={`promo-slot promo-slot-${items.length > 1 ? "pair" : "solo"}`}>
      {items.map((p) => (
        <Link key={p.id} href={p.href} className={`promo promo-${p.tone}`}>
          <span className="promo-label">{t(p.sponsor)}</span>
          <span className="promo-title">{t(p.title)}</span>
          <span className="promo-body">{t(p.body)}</span>
          <span className="promo-cta">
            {t(p.cta)} <span aria-hidden="true">→</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
