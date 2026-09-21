"use client";

/**
 * An event, understood at a glance: What, When, Where, For whom — then one
 * "Learn more". The date leaf is the card's one bold element, because "when"
 * is the question an event answers first; every other line is quiet.
 *
 * What she has done about it (registered, a reminder, happening now, closed)
 * is one badge at most. Nothing else is metadata on the card: topics, the
 * organiser's description and the reasons live on the event's page — except
 * on "Recommended for you", where the reasons are the point and sit behind
 * "Why it may suit you".
 */

import Link from "next/link";
import { useI18n, type MessageKey } from "@/i18n";
import type { EventCard as Event } from "@/services/portal";
import { dimensionKey, typeKey } from "@/utils/format";
import { fill } from "@/components/jobs/format";
import { Badge, Icon } from "@/components/ds";
import { Expandable, StateLine } from "@/components/org/Parts";
import { forWhom, leaf, reasonLine, whenLine } from "./format";

export function DateLeaf({ iso, size = "md" }: { iso: string; size?: "md" | "lg" }) {
  const { locale } = useI18n();
  const parts = leaf(iso, locale);
  return (
    <span className={`ev-leaf is-${size}`} aria-hidden="true">
      <span className="ev-leaf-month">{parts.month}</span>
      <span className="ev-leaf-day">{parts.day}</span>
      <span className="ev-leaf-weekday">{parts.weekday}</span>
    </span>
  );
}

export function placeOf(
  item: Pick<Event, "format" | "venue" | "region">,
  t: (key: MessageKey) => string,
): { icon: string; text: string } {
  if (item.format === "online") return { icon: "globe", text: t("ev.online") };
  const region = item.region ? t(`reg.${item.region}` as MessageKey) : "";
  // "Farg‘ona" and "Farg'ona" are one word: compare without the apostrophe.
  const plain = (text: string) => text.toLocaleLowerCase().replace(/[ʻʼ'‘’`]/g, "");
  const named = Boolean(region && item.venue && plain(item.venue).includes(plain(region)));
  const text = [item.venue, named ? "" : region].filter(Boolean).join(", ");
  return { icon: "pin", text: text || t("ev.placeUnknown") };
}

type State = { tone: "live" | "good" | "accent" | "muted"; key: MessageKey; icon: string };

/** The one state worth a badge, strongest first. */
function stateOf(item: Event): State | null {
  if (item.happening) return { tone: "live", key: "ev.happening", icon: "spark" };
  if (item.application_status && item.application_status !== "withdrawn") {
    return { tone: "good", key: "ev.registered", icon: "check" };
  }
  if (item.reminder_at) return { tone: "accent", key: "ev.reminded", icon: "bell" };
  if (!item.is_open) return { tone: "muted", key: "ev.regClosed", icon: "clock" };
  return null;
}

export function EventCard({
  item,
  showReasons = false,
  headingLevel = 3,
}: {
  item: Event;
  showReasons?: boolean;
  headingLevel?: 2 | 3;
}) {
  const { t, tx, locale } = useI18n();
  const title = tx(item.title_i18n);
  const place = placeOf(item, t);
  const who = forWhom(item);
  const state = stateOf(item);
  const blocked =
    item.eligibility && !item.eligibility.may_apply && item.eligibility.reason !== "closed";
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const reasons = item.reasons
    .map((reason) => reasonLine(reason, tx, (d) => t(dimensionKey(d))))
    .filter((line): line is NonNullable<typeof line> => line !== null);

  return (
    <article className={`ev-card${item.is_open || item.happening ? "" : " is-closed"}`}>
      <DateLeaf iso={item.starts_at} />
      <div className="ev-card-body">
        <p className="ev-kind">
          <Icon name={item.type} />
          {t(typeKey(item.type))}
          {state && (
            <Badge tone={state.tone} icon={state.icon}>
              {t(state.key)}
            </Badge>
          )}
        </p>
        <Heading className="ev-card-title">
          <Link href={`/tadbirlar/${item.id}`} className="ev-card-link">
            {title}
          </Link>
        </Heading>
        <dl className="ev-facts">
          <div>
            <dt className="sr-only">{t("ev.when")}</dt>
            <dd>
              <Icon name="clock" />
              {whenLine(item.starts_at, item.ends_at, locale)}
            </dd>
          </div>
          <div>
            <dt className="sr-only">{t("ev.where")}</dt>
            <dd>
              <Icon name={place.icon} />
              {place.text}
            </dd>
          </div>
          <div>
            <dt className="sr-only">{t("ev.forWhom")}</dt>
            <dd>
              <Icon name="people" />
              {fill(t(who.key), who.values)}
              {blocked && <span className="ev-not-you"> — {t("ev.notForYou")}</span>}
            </dd>
          </div>
        </dl>
        {showReasons && reasons.length > 0 && (
          <Expandable title={t("ev.why")} count={reasons.length}>
            <ul className="ev-reasons">
              {reasons.map((line, index) => (
                <li key={index}>
                  <StateLine tone="good">{fill(t(line.key), line.values)}</StateLine>
                </li>
              ))}
            </ul>
          </Expandable>
        )}
        <Link href={`/tadbirlar/${item.id}`} className="ds-cta is-secondary ev-card-cta">
          <span>{t("ev.more")}</span>
          <span className="sr-only">: {title}</span>
        </Link>
      </div>
    </article>
  );
}
