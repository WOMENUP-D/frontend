"use client";

/**
 * Upcoming events on one line down the page, grouped by month: the order is
 * the information. Each month is a heading, so a screen reader can jump
 * between them, and each event is the same card the rest of the page uses.
 */

import { useI18n } from "@/i18n";
import type { EventCard as Event } from "@/services/portal";
import { EventCard } from "./EventCard";
import { byMonth, monthTitle } from "./format";

export function Timeline({ items }: { items: Event[] }) {
  const { locale } = useI18n();
  return (
    <div className="ev-timeline">
      {byMonth(items).map((group) => (
        <section key={group.key} className="ev-month" aria-labelledby={`ev-m-${group.key}`}>
          <h2 id={`ev-m-${group.key}`} className="ev-month-title">
            {monthTitle(group.year, group.month, locale)}
          </h2>
          <ol className="ev-month-list">
            {group.items.map((item) => (
              <li key={item.id}>
                <EventCard item={item} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
