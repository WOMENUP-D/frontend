"use client";

/**
 * One business listing, read in plain words.
 *
 * What kind of help it is — "Grant" and, under it, what a grant is. Who offers
 * it. What she would receive, exactly as the listing records it, and the
 * terms that come with it (a share, a rate, a commission) — or "not stated",
 * never an estimate. Whether she may apply, as a word with a shape.
 * And "Why you're seeing this": the reasons the server found in her own
 * records, closed until she asks.
 *
 * Only the title is a link, so the reasons can open without leaving the page.
 */

import Link from "next/link";
import { useI18n } from "@/i18n";
import type { OpportunityCard } from "@/services/portal";
import { money, regionKey, typeKey } from "@/utils/format";
import { Clock, Pin, SaveButton } from "@/components/jobs/JobCard";
import { deadlineLine, fill, rewardText } from "@/components/jobs/format";
import { Expandable, OrgLine, StateLine } from "@/components/org/Parts";
import {
  APPLY_STATE_KEY,
  applyState,
  kindMeaningKey,
  orderedReasons,
  reasonLine,
  rewardTerms,
} from "./format";

const TONE = { can: "good", check: "wait", cannot: "stop", closed: "off" } as const;

export function BusinessCard({ item }: { item: OpportunityCard }) {
  const { t, tx, locale } = useI18n();
  const title = tx(item.title_i18n);
  const meaning = kindMeaningKey(item.type);
  const receive = rewardText(item.reward, (amount) => money(amount, "UZS", locale));
  const terms = rewardTerms(item.reward, (amount) => money(amount, "UZS", locale));
  const state = applyState(item.eligibility, item.is_open);
  const deadline = deadlineLine(item);
  const reasons = orderedReasons(item.fit?.reasons ?? [])
    .map((reason) => reasonLine(reason, tx))
    .filter((line): line is NonNullable<typeof line> => line !== null);

  return (
    <li className="bz-card">
      <div className="jb-card-top">
        <span className="jb-kind">{t(typeKey(item.type))}</span>
        <SaveButton id={item.id} title={title} saved={item.saved} />
      </div>

      <h2 className="jb-title">
        <Link href={`/imkoniyatlar/${item.id}`} className="bz-link">
          {title}
        </Link>
      </h2>
      {meaning && <p className="bz-meaning">{t(meaning)}</p>}
      <OrgLine org={item.organization} fallback={item.organisation} />

      <div className="bz-receive">
        <span className="bz-receive-label">{t("biz.receive")}</span>
        {receive && <span className="bz-receive-value">{receive}</span>}
        {terms.length > 0 && (
          <ul className="bz-terms">
            {terms.map((term) => (
              <li key={term.key}>{fill(t(term.key), term.values)}</li>
            ))}
          </ul>
        )}
        {!receive && terms.length === 0 && <span className="bz-receive-none">{t("biz.receiveNone")}</span>}
      </div>

      <div className="bz-facts">
        <StateLine tone={TONE[state]}>{t(APPLY_STATE_KEY[state])}</StateLine>
        <span className="bz-fact">
          <Clock />
          {fill(t(deadline.key), deadline.values)}
        </span>
        <span className="bz-fact">
          <Pin />
          {item.region ? t(regionKey(item.region)) : t("op.wholeCountry")}
        </span>
      </div>

      {reasons.length > 0 && (
        <Expandable title={t("biz.why")} count={reasons.length}>
          <ul className="bz-reasons">
            {reasons.map((line, index) => (
              <li key={index}>
                <StateLine tone="good">{fill(t(line.key), line.values)}</StateLine>
              </li>
            ))}
          </ul>
        </Expandable>
      )}

      <Link href={`/imkoniyatlar/${item.id}`} className="btn btn-outline bz-cta">
        {t("biz.details")}
        <span className="sr-only">: {title}</span>
      </Link>
    </li>
  );
}
