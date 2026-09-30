"use client";

/**
 * One listing in the catalogue, readable in a few seconds.
 *
 * What it is and who offers it, where, until when, what it asks for — and,
 * for a woman who is signed in, how much of that she already has, whether it
 * is on her career direction, and where her application stands. One kind label
 * and at most one status label: nothing else is a badge.
 *
 * The title's link covers the card, so the whole card is one tap target. The
 * save button sits above that link, so it can be pressed on its own.
 */

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n";
import { portal, type OpportunityCard, type SkillRef } from "@/services/portal";
import { regionKey, typeKey } from "@/utils/format";
import { Meter } from "@/components/guide/Parts";
import { OrgLine } from "@/components/org/Parts";
import { deadlineLine, fill, statusKey } from "./format";
import { listingHref } from "@/components/events/format";

const MAX_SKILLS = 4;

export function JobCard({ item, signedIn }: { item: OpportunityCard; signedIn: boolean }) {
  const { t, tx } = useI18n();
  const title = tx(item.title_i18n);
  const deadline = deadlineLine(item);
  const fit = item.fit;
  const have = new Set(
    (fit?.reasons ?? [])
      .filter((reason) => reason.kind === "skill" && reason.skill)
      .map((reason) => reason.skill!.slug ?? reason.skill!.label),
  );
  const career = fit?.reasons.find((reason) => reason.kind === "career");
  const shown = item.skills.slice(0, MAX_SKILLS);
  const blocked =
    item.eligibility &&
    !item.eligibility.may_apply &&
    item.eligibility.reason !== "closed";

  return (
    <li className={`jb-card${item.is_open ? "" : " is-closed"}`}>
      <div className="jb-card-top">
        <span className="jb-kind">{t(typeKey(item.type))}</span>
        {item.application_status && (
          <span className={`jb-status is-${item.application_status}`}>
            {t(statusKey(item.application_status))}
          </span>
        )}
        {signedIn && <SaveButton id={item.id} title={title} saved={item.saved} />}
      </div>

      <h2 className="jb-title">
        <Link href={listingHref(item)} className="jb-link">
          {title}
        </Link>
      </h2>
      <OrgLine org={item.organization} fallback={item.organisation} />

      <ul className="jb-facts">
        <li>
          <Pin />
          {item.region ? t(regionKey(item.region)) : t("op.wholeCountry")}
        </li>
        <li className={item.is_open ? "" : "is-closed"}>
          <Clock />
          {fill(t(deadline.key), deadline.values)}
        </li>
      </ul>

      {shown.length > 0 && (
        <ul className="jb-skills" aria-label={t("job.req.skills")}>
          {shown.map((skill) => (
            <SkillTag key={skill.slug ?? skill.label} skill={skill} have={have} signedIn={signedIn} />
          ))}
          {item.skills.length > MAX_SKILLS && (
            <li className="jb-skill is-more">
              {fill(t("job.moreSkills"), { n: item.skills.length - MAX_SKILLS })}
            </li>
          )}
        </ul>
      )}

      {fit && fit.total > 0 && (
        <Meter
          value={fit.have}
          max={fit.total}
          text={fill(t("job.have"), { have: fit.have, total: fit.total })}
        />
      )}
      {career && (
        <p className="jb-career">
          <Star />
          {fill(t("job.onCareer"), { career: tx(career.career_title_i18n) })}
        </p>
      )}
      {blocked && <p className="jb-blocked">{t("job.cantApply")}</p>}

      <span className="jb-cta" aria-hidden="true">
        {t("job.details")}
        <svg width="18" height="18" viewBox="0 0 20 20" focusable="false">
          <path d="M7.5 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </li>
  );
}

function SkillTag({
  skill,
  have,
  signedIn,
}: {
  skill: SkillRef;
  have: Set<string>;
  signedIn: boolean;
}) {
  const { t, tx } = useI18n();
  const name = tx(skill.name_i18n) || skill.label;
  const held = have.has(skill.slug ?? skill.label);
  if (!signedIn) return <li className="jb-skill">{name}</li>;
  return (
    <li className={`jb-skill ${held ? "is-have" : "is-need"}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {held ? (
          <>
            <circle cx="8" cy="8" r="7" />
            <path d="M4.8 8.2l2.2 2.2 4.3-4.6" />
          </>
        ) : (
          <circle cx="8" cy="8" r="6" />
        )}
      </svg>
      {name}
      <span className="sr-only">{held ? ` — ${t("car.skill.have")}` : ` — ${t("job.fit.missing")}`}</span>
    </li>
  );
}

/** Keep a listing. A real toggle: pressed state for assistive technology, a
 *  word that changes with it, and the listing's title in its name. */
export function SaveButton({
  id,
  title,
  saved: initial,
  onChange,
}: {
  id: string;
  title: string;
  saved: boolean;
  onChange?: (saved: boolean) => void;
}) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !saved;
    try {
      if (next) await portal.saveOpportunity(id);
      else await portal.unsaveOpportunity(id);
      setSaved(next);
      onChange?.(next);
    } catch {
      /* Left as it was: the word on the button is still the truth. */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`jb-save${saved ? " is-saved" : ""}`}
      aria-pressed={saved}
      aria-label={fill(t(saved ? "job.unsaveLabel" : "job.saveLabel"), { title })}
      onClick={toggle}
      disabled={busy}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M5.5 3.5h9a1 1 0 011 1v12.2l-5.5-3.6-5.5 3.6V4.5a1 1 0 011-1z" />
      </svg>
      <span>{t(saved ? "job.saved" : "job.save")}</span>
    </button>
  );
}

export function Pin() {
  return (
    <svg className="jb-ico" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 18s5.5-5.2 5.5-9.3a5.5 5.5 0 10-11 0C4.5 12.8 10 18 10 18z" />
      <circle cx="10" cy="8.7" r="2" />
    </svg>
  );
}

export function Clock() {
  return (
    <svg className="jb-ico" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="7.2" />
      <path d="M10 6.2V10l2.6 1.6" />
    </svg>
  );
}

export function Star() {
  return (
    <svg className="jb-ico" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M10 3l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.8 5.8 16l.8-4.7L3.2 8l4.7-.7z" />
    </svg>
  );
}
