"use client";

/**
 * An organisation's listings: the figures that matter at a glance, a table of
 * what it has published, and one form for a new listing or a change.
 *
 * Closing a listing asks once — it stops applications but leaves the listing
 * readable, which is what "close" means everywhere else on WomanUP. There is no
 * delete: an application points at the listing it was made to.
 */

import { useEffect, useId, useState } from "react";
import { useI18n } from "@/i18n";
import { ApiError } from "@/services/api";
import { portal, type OrgListing, type OrganizationRead } from "@/services/portal";
import { REGIONS, regionKey, typeKey } from "@/utils/format";
import { fill } from "@/components/jobs/format";
import { ConfirmDialog } from "@/components/org/ConfirmDialog";
import {
  AMOUNT_KINDS,
  EVENT_KINDS,
  EVENT_ONLY,
  LISTING_TYPES,
  PAY_KINDS,
  draftFrom,
  draftProblem,
  emptyDraft,
  localDate,
  problemMessage,
  toPayload,
  type ListingDraft,
} from "./model";

export function Metrics({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="aw-metrics">
      {items.map((item) => (
        <div key={item.label} className="aw-metric">
          <span className="aw-metric-value">{item.value}</span>
          <span className="aw-metric-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Listings({
  org,
  listings,
  onChange,
}: {
  org: OrganizationRead;
  listings: OrgListing[];
  onChange: (next: OrgListing[]) => void;
}) {
  const { t, tx, locale } = useI18n();
  const [editing, setEditing] = useState<OrgListing | "new" | null>(null);
  const [closing, setClosing] = useState<OrgListing | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const date = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : locale === "ru" ? "ru-RU" : "uz-UZ") : "—";

  async function close(listing: OrgListing) {
    setBusy(true);
    setProblem(null);
    try {
      const next = await portal.closeListing(org.id, listing.id);
      onChange(listings.map((item) => (item.id === next.id ? next : item)));
      setClosing(null);
    } catch (cause) {
      const message = problemMessage(cause instanceof ApiError ? cause.detail : null, cause instanceof ApiError ? cause.status : undefined);
      setProblem(fill(t(message.key), message.values));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ws-stack">
      <div className="ws-toolbar">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setEditing("new")}
          disabled={editing !== null}
        >
          {t("ws.new")}
        </button>
      </div>

      {editing !== null && (
        <ListingForm
          orgId={org.id}
          listing={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(saved) => {
            onChange(
              editing === "new"
                ? [saved, ...listings]
                : listings.map((item) => (item.id === saved.id ? saved : item)),
            );
            setEditing(null);
          }}
        />
      )}

      {listings.length === 0 ? (
        <p className="ws-empty">{t("ws.noListings")}</p>
      ) : (
        <div className="ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th scope="col">{t("ws.col.title")}</th>
                <th scope="col">{t("ws.col.type")}</th>
                <th scope="col">{t("ws.col.deadline")}</th>
                <th scope="col">{t("ws.col.status")}</th>
                <th scope="col" className="is-num">{t("ws.col.apps")}</th>
                <th scope="col">
                  <span className="sr-only">{t("ws.col.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id}>
                  <th scope="row" data-label={t("ws.col.title")}>
                    {tx(listing.title_i18n)}
                    {listing.region && <span className="ws-sub">{t(regionKey(listing.region))}</span>}
                  </th>
                  <td data-label={t("ws.col.type")}>{t(typeKey(listing.type))}</td>
                  <td data-label={t(listing.starts_at ? "ws.col.starts" : "ws.col.deadline")}>
                    {date(listing.starts_at ?? listing.deadline)}
                  </td>
                  <td data-label={t("ws.col.status")}>
                    <span className={`ws-pill ${listing.is_open ? "is-open" : "is-closed"}`}>
                      {t(listing.is_open ? "ws.open" : "ws.closed")}
                    </span>
                  </td>
                  <td data-label={t("ws.col.apps")} className="is-num">
                    {listing.applications}
                  </td>
                  <td className="ws-actions-cell">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditing(listing)}
                      disabled={editing !== null}
                    >
                      {t("ws.edit")}
                      <span className="sr-only">: {tx(listing.title_i18n)}</span>
                    </button>
                    {listing.is_open && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setProblem(null);
                          setClosing(listing);
                        }}
                      >
                        {t("ws.close")}
                        <span className="sr-only">: {tx(listing.title_i18n)}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={closing !== null}
        title={closing ? `${t("ws.close")}: ${tx(closing.title_i18n)}` : t("ws.close")}
        confirm={t("ws.closeYes")}
        tone="danger"
        busy={busy}
        error={problem}
        onConfirm={() => closing && close(closing)}
        onCancel={() => setClosing(null)}
      >
        <p>{t("ws.closeAsk")}</p>
      </ConfirmDialog>
    </div>
  );
}

function ListingForm({
  orgId,
  listing,
  onCancel,
  onSaved,
}: {
  orgId: string;
  listing: OrgListing | null;
  onCancel: () => void;
  onSaved: (saved: OrgListing) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const [draft, setDraft] = useState<ListingDraft>(() => (listing ? draftFrom(listing) : emptyDraft()));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [today, setToday] = useState("");

  // The date is read in the browser, after the first render, so the page and
  // the server never disagree about which day it is.
  useEffect(() => setToday(localDate(new Date().toISOString())), []);

  const set = (key: keyof ListingDraft) => (event: { target: { value: string } }) =>
    setDraft((prev) => ({ ...prev, [key]: event.target.value }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const local = draftProblem(draft, today);
    if (local) {
      setProblem(t(`ws.err.${local}` as "ws.err.title"));
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const payload = toPayload(draft, listing);
      const saved = listing
        ? await portal.updateListing(orgId, listing.id, {
            title_i18n: payload.title_i18n,
            description_i18n: payload.description_i18n,
            region: payload.region,
            skills: payload.skills,
            reward: payload.reward,
            eligibility: payload.eligibility,
            deadline: payload.deadline,
            starts_at: payload.starts_at,
            ends_at: payload.ends_at,
            format: payload.format,
            venue: payload.venue,
          })
        : await portal.createListing(orgId, payload);
      onSaved(saved);
    } catch (cause) {
      const message = problemMessage(
        cause instanceof ApiError ? cause.detail : null,
        cause instanceof ApiError ? cause.status : undefined,
      );
      setProblem(fill(t(message.key), message.values));
    } finally {
      setBusy(false);
    }
  }

  const field = (name: string) => `${id}-${name}`;
  const pays = PAY_KINDS.includes(draft.type);
  const gives = AMOUNT_KINDS.includes(draft.type);

  return (
    <form className="aw-card ws-form" onSubmit={save} aria-labelledby={field("h")} noValidate>
      <h2 id={field("h")} className="ws-form-title">
        {listing ? t("ws.edit") : t("ws.new")}
      </h2>

      <div className="ws-grid">
        <label className="ws-field" htmlFor={field("type")}>
          <span>{t("ws.f.type")}</span>
          <select
            id={field("type")}
            className="input"
            value={draft.type}
            onChange={set("type")}
            disabled={Boolean(listing)}
          >
            {LISTING_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(typeKey(type))}
              </option>
            ))}
          </select>
        </label>
        <label className="ws-field" htmlFor={field("region")}>
          <span>{t("ws.f.region")}</span>
          <select id={field("region")} className="input" value={draft.region} onChange={set("region")}>
            <option value="">{t("ws.f.anyRegion")}</option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {t(regionKey(region))}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ws-grid ws-grid-3">
        <label className="ws-field" htmlFor={field("tuz")}>
          <span>{t("ws.f.titleUz")}</span>
          <input id={field("tuz")} className="input" value={draft.titleUz} onChange={set("titleUz")} maxLength={300} />
        </label>
        <label className="ws-field" htmlFor={field("tru")}>
          <span>{t("ws.f.titleRu")}</span>
          <input id={field("tru")} className="input" value={draft.titleRu} onChange={set("titleRu")} maxLength={300} lang="ru" />
        </label>
        <label className="ws-field" htmlFor={field("ten")}>
          <span>{t("ws.f.titleEn")}</span>
          <input id={field("ten")} className="input" value={draft.titleEn} onChange={set("titleEn")} maxLength={300} lang="en" />
        </label>
      </div>

      <label className="ws-field" htmlFor={field("desc")}>
        <span>{t("ws.f.description")}</span>
        <textarea
          id={field("desc")}
          className="input"
          rows={5}
          value={draft.description}
          onChange={set("description")}
          maxLength={4000}
        />
      </label>

      <div className="ws-field">
        {/* The hint sits outside the label, so the field's name stays short
            and the hint is read as its description. */}
        <label htmlFor={field("skills")}>{t("ws.f.skills")}</label>
        <input
          id={field("skills")}
          className="input"
          value={draft.skills}
          onChange={set("skills")}
          aria-describedby={field("skills-hint")}
        />
        <small id={field("skills-hint")} className="ws-hint">
          {t("ws.f.skillsHint")}
        </small>
      </div>

      <div className="ws-grid ws-grid-3">
        {pays && (
          <>
            <label className="ws-field" htmlFor={field("sfrom")}>
              <span>{t("ws.f.salaryFrom")}</span>
              <input id={field("sfrom")} className="input" inputMode="numeric" value={draft.salaryFrom} onChange={set("salaryFrom")} />
            </label>
            <label className="ws-field" htmlFor={field("sto")}>
              <span>{t("ws.f.salaryTo")}</span>
              <input id={field("sto")} className="input" inputMode="numeric" value={draft.salaryTo} onChange={set("salaryTo")} />
            </label>
          </>
        )}
        {gives && (
          <label className="ws-field" htmlFor={field("amount")}>
            <span>{t("ws.f.amount")}</span>
            <input id={field("amount")} className="input" inputMode="numeric" value={draft.amount} onChange={set("amount")} />
          </label>
        )}
        <label className="ws-field" htmlFor={field("deadline")}>
          <span>{t("ws.f.deadline")}</span>
          <input
            id={field("deadline")}
            className="input"
            type="date"
            min={today || undefined}
            value={draft.deadline}
            onChange={set("deadline")}
          />
        </label>
      </div>
      {!pays && !gives && <p className="ws-hint">{t("ws.pay.none")}</p>}

      {EVENT_KINDS.includes(draft.type) && (
        <fieldset className="ws-event">
          <legend>{t("nav.events")}</legend>
          <p className="ws-hint">{t("ws.f.eventHint")}</p>
          <div className="ws-grid ws-grid-3">
            <label className="ws-field" htmlFor={field("starts")}>
              <span>{t("ws.f.startsAt")}</span>
              <input
                id={field("starts")}
                className="input"
                type="datetime-local"
                value={draft.startsAt}
                onChange={set("startsAt")}
                required={EVENT_ONLY.includes(draft.type)}
              />
            </label>
            <label className="ws-field" htmlFor={field("ends")}>
              <span>{t("ws.f.endsAt")}</span>
              <input
                id={field("ends")}
                className="input"
                type="datetime-local"
                value={draft.endsAt}
                min={draft.startsAt || undefined}
                onChange={set("endsAt")}
              />
            </label>
            <label className="ws-field" htmlFor={field("format")}>
              <span>{t("ws.f.format")}</span>
              <select id={field("format")} className="input" value={draft.format} onChange={set("format")}>
                <option value="">{t("ws.f.formatNone")}</option>
                <option value="offline">{t("ev.format.offline")}</option>
                <option value="online">{t("ev.format.online")}</option>
              </select>
            </label>
          </div>
          {draft.format !== "online" && (
            <label className="ws-field" htmlFor={field("venue")}>
              <span>{t("ws.f.venue")}</span>
              <input id={field("venue")} className="input" value={draft.venue} onChange={set("venue")} maxLength={300} />
            </label>
          )}
        </fieldset>
      )}

      <div className="ws-grid ws-grid-3">
        <label className="ws-field" htmlFor={field("amin")}>
          <span>{t("ws.f.ageMin")}</span>
          <input id={field("amin")} className="input" inputMode="numeric" value={draft.ageMin} onChange={set("ageMin")} />
        </label>
        <label className="ws-field" htmlFor={field("amax")}>
          <span>{t("ws.f.ageMax")}</span>
          <input id={field("amax")} className="input" inputMode="numeric" value={draft.ageMax} onChange={set("ageMax")} />
        </label>
      </div>

      {problem && (
        <p className="pf-error" role="alert">
          {problem}
        </p>
      )}
      <div className="ws-form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {t("ws.f.save")}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
          {t("ws.f.cancel")}
        </button>
      </div>
    </form>
  );
}
