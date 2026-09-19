"use client";

/**
 * Finding candidates, and the invitations sent to them.
 *
 * Only women who turned on "Organisations can find me", are 18 or over and
 * whose account is active appear here — the server decides, not this page.
 * Each is a pseudonym that is different for every organisation, with what she
 * has shown rather than what she has said: skills with how they are held,
 * certificates, practical tasks passed. No name, no photo, no age, no id.
 *
 * An invitation is the only way from a pseudonym to a person: she sees it on
 * her own page, and only if she accepts does the organisation see the fields
 * she agreed to share.
 */

import { useId, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { ApiError } from "@/services/api";
import {
  portal,
  type CandidateCard,
  type OrgInvitation,
  type OrgListing,
} from "@/services/portal";
import { REGIONS, regionKey } from "@/utils/format";
import { fill } from "@/components/jobs/format";
import { ConfirmDialog } from "@/components/org/ConfirmDialog";
import { CandidateView, SkillList } from "./CandidateView";
import { problemMessage, shortRef } from "./model";

export function Candidates({
  orgId,
  listings,
  onInvited,
}: {
  orgId: string;
  listings: OrgListing[];
  onInvited: (invitation: OrgInvitation) => void;
}) {
  const { t, tx } = useI18n();
  const id = useId();
  const [skill, setSkill] = useState("");
  const [region, setRegion] = useState("");
  const [results, setResults] = useState<CandidateCard[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inviting, setInviting] = useState<CandidateCard | null>(null);
  const [listingId, setListingId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    setSearching(true);
    setFailed(false);
    try {
      setResults(await portal.orgCandidates(orgId, { skill: skill.trim() || undefined, region: region || undefined }));
    } catch {
      setFailed(true);
    } finally {
      setSearching(false);
    }
  }

  async function invite() {
    if (!inviting) return;
    setBusy(true);
    setProblem(null);
    try {
      const sent = await portal.inviteCandidate(orgId, {
        ref: inviting.ref,
        opportunity_id: listingId || null,
        message: message.trim() || null,
      });
      setResults((prev) =>
        (prev ?? []).map((card) => (card.ref === inviting.ref ? { ...card, invitation: sent.status } : card)),
      );
      onInvited(sent);
      setInviting(null);
      setMessage("");
      setListingId("");
    } catch (cause) {
      const text = problemMessage(
        cause instanceof ApiError ? cause.detail : null,
        cause instanceof ApiError ? cause.status : undefined,
      );
      setProblem(fill(t(text.key), text.values));
    } finally {
      setBusy(false);
    }
  }

  const open = listings.filter((listing) => listing.is_open);

  return (
    <div className="ws-stack">
      <p className="ws-note">{t("ws.discovery")}</p>
      <form className="ws-search" role="search" onSubmit={search}>
        <label className="ws-field" htmlFor={`${id}-skill`}>
          <span>{t("ws.skillFilter")}</span>
          <input id={`${id}-skill`} className="input" value={skill} onChange={(event) => setSkill(event.target.value)} />
        </label>
        <label className="ws-field" htmlFor={`${id}-region`}>
          <span>{t("ws.regionFilter")}</span>
          <select id={`${id}-region`} className="input" value={region} onChange={(event) => setRegion(event.target.value)}>
            <option value="">{t("ws.f.anyRegion")}</option>
            {REGIONS.map((value) => (
              <option key={value} value={value}>
                {t(regionKey(value))}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={searching}>
          {t("ws.search")}
        </button>
      </form>

      {failed && (
        <p className="pf-error" role="alert">
          {t("ws.loadError")}
        </p>
      )}
      {results !== null &&
        (results.length === 0 ? (
          <p className="ws-empty" role="status">
            {t("ws.noCandidates")}
          </p>
        ) : (
          <ul className="ws-cards" aria-live="polite">
            {results.map((card) => (
              <li key={card.ref} className="aw-card ws-candidate">
                <div className="ws-app-head">
                  <p className="ws-app-title">{fill(t("ws.candidate"), { ref: shortRef(card.ref) })}</p>
                  {card.invitation && (
                    <span className={`ws-pill is-inv-${card.invitation}`}>
                      {t(`ws.inv.${card.invitation}` as MessageKey)}
                    </span>
                  )}
                </div>
                <dl className="ws-profile">
                  <div>
                    <dt>{t("ws.p.region")}</dt>
                    <dd>{card.region ? t(regionKey(card.region)) : "—"}</dd>
                  </div>
                  <div>
                    <dt>{t("ws.p.education")}</dt>
                    <dd>{card.education_level ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>{t("ws.p.experience")}</dt>
                    <dd>{card.years_of_experience ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>{t("ws.p.certificates")}</dt>
                    <dd>{card.certificates}</dd>
                  </div>
                  <div>
                    <dt>{t("ws.p.passed")}</dt>
                    <dd>{card.passed_tasks}</dd>
                  </div>
                  <div className="ws-profile-wide">
                    <dt>{t("ws.p.skills")}</dt>
                    <dd>
                      <SkillList skills={card.skills} />
                    </dd>
                  </div>
                </dl>
                {!card.invitation && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setProblem(null);
                      setInviting(card);
                    }}
                  >
                    {t("ws.invite")}
                    <span className="sr-only">: {shortRef(card.ref)}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        ))}

      <ConfirmDialog
        open={inviting !== null}
        title={t("ws.inviteTitle")}
        confirm={t("ws.invite")}
        busy={busy}
        error={problem}
        onConfirm={invite}
        onCancel={() => setInviting(null)}
      >
        <p>{t("ws.inviteBody")}</p>
        <label className="ws-field" htmlFor={`${id}-for`}>
          <span>{t("ws.inviteFor")}</span>
          <select id={`${id}-for`} className="input" value={listingId} onChange={(event) => setListingId(event.target.value)}>
            <option value="">{t("ws.noListing")}</option>
            {open.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {tx(listing.title_i18n)}
              </option>
            ))}
          </select>
        </label>
        <label className="ws-field" htmlFor={`${id}-msg`}>
          <span>{t("ws.inviteMessage")}</span>
          <textarea
            id={`${id}-msg`}
            className="input"
            rows={3}
            maxLength={500}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
      </ConfirmDialog>
    </div>
  );
}

export function Invitations({
  invitations,
  listings,
}: {
  invitations: OrgInvitation[];
  listings: OrgListing[];
}) {
  const { t, tx, locale } = useI18n();
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : locale === "ru" ? "ru-RU" : "uz-UZ");
  const title = (listingId: string | null) => {
    const listing = listings.find((item) => item.id === listingId);
    return listing ? tx(listing.title_i18n) : t("ws.noListing");
  };

  if (invitations.length === 0) return <p className="ws-empty">{t("ws.noInvitations")}</p>;

  return (
    <ul className="ws-list">
      {invitations.map((invitation) => (
        <li key={invitation.id} className="aw-card ws-app">
          <div className="ws-app-head">
            <div>
              <p className="ws-app-title">{fill(t("ws.candidate"), { ref: shortRef(invitation.ref) })}</p>
              <p className="ws-sub ws-meta">
                <span>{title(invitation.opportunity_id)}</span>
                <span>{date(invitation.created_at)}</span>
              </p>
            </div>
            <span className={`ws-pill is-inv-${invitation.status}`}>
              {t(`ws.inv.${invitation.status}` as MessageKey)}
            </span>
          </div>
          {invitation.message && <p className="ws-quote">{invitation.message}</p>}
          {invitation.profile && <CandidateView profile={invitation.profile} />}
        </li>
      ))}
    </ul>
  );
}
