"use client";

/**
 * Applications to an organisation's listings, newest first.
 *
 * Each shows the candidate exactly as she agreed to be shown — or, when she
 * withdrew or stopped sharing, says so instead of showing anything. A status
 * moves forward only (sent → under review → accepted or rejected), and only
 * to the steps the server lists in `next`; each move asks once, because she
 * sees it on her own page. The note is the organisation's own and is never
 * shown to her.
 */

import { useId, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { ApiError } from "@/services/api";
import {
  portal,
  type ApplicationStatus,
  type OrgApplication,
  type OrgListing,
} from "@/services/portal";
import { fill, statusKey } from "@/components/jobs/format";
import { ConfirmDialog } from "@/components/org/ConfirmDialog";
import { CandidateView } from "./CandidateView";
import { problemMessage } from "./model";

export function Applications({
  orgId,
  listings,
  applications,
  listingFilter,
  onFilter,
  onChange,
}: {
  orgId: string;
  listings: OrgListing[];
  applications: OrgApplication[];
  listingFilter: string;
  onFilter: (listingId: string) => void;
  onChange: (next: OrgApplication) => void;
}) {
  const { t, tx } = useI18n();
  const id = useId();

  return (
    <div className="ws-stack">
      <p className="ws-note">{t("ws.privacy")}</p>
      <label className="ws-field ws-filter" htmlFor={`${id}-listing`}>
        <span>{t("ws.filter.listing")}</span>
        <select
          id={`${id}-listing`}
          className="input"
          value={listingFilter}
          onChange={(event) => onFilter(event.target.value)}
        >
          <option value="">{t("ws.filter.all")}</option>
          {listings.map((listing) => (
            <option key={listing.id} value={listing.id}>
              {tx(listing.title_i18n)}
            </option>
          ))}
        </select>
      </label>

      {applications.length === 0 ? (
        <p className="ws-empty">{t("ws.noApps")}</p>
      ) : (
        <ul className="ws-list">
          {applications.map((application) => (
            <ApplicationRow key={application.id} orgId={orgId} application={application} onChange={onChange} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ApplicationRow({
  orgId,
  application,
  onChange,
}: {
  orgId: string;
  application: OrgApplication;
  onChange: (next: OrgApplication) => void;
}) {
  const { t, tx, locale } = useI18n();
  const id = useId();
  const [target, setTarget] = useState<ApplicationStatus | "">("");
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const date = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : locale === "ru" ? "ru-RU" : "uz-UZ") : "—";

  async function move() {
    if (!target) return;
    setBusy(true);
    setProblem(null);
    try {
      onChange(await portal.setApplicationStatus(orgId, application.id, target, note.trim() || undefined));
      setAsking(false);
      setTarget("");
      setNote("");
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

  return (
    <li className="aw-card ws-app">
      <div className="ws-app-head">
        <div>
          <p className="ws-app-title">{tx(application.listing.title_i18n)}</p>
          <p className="ws-sub">
            {t("ws.submitted")}: {date(application.submitted_at)}
          </p>
        </div>
        <span className={`ws-pill is-${application.status}`}>{t(statusKey(application.status))}</span>
      </div>

      {application.profile ? (
        <CandidateView profile={application.profile} />
      ) : application.hidden ? (
        <p className="ws-note">{t(`ws.hidden.${application.hidden}` as MessageKey)}</p>
      ) : null}

      {application.next.length > 0 ? (
        <div className="ws-move">
          <label className="ws-field" htmlFor={`${id}-to`}>
            <span>{t("ws.moveTo")}</span>
            <select
              id={`${id}-to`}
              className="input"
              value={target}
              onChange={(event) => setTarget(event.target.value as ApplicationStatus)}
            >
              <option value="">—</option>
              {application.next.map((status) => (
                <option key={status} value={status}>
                  {t(statusKey(status))}
                </option>
              ))}
            </select>
          </label>
          <label className="ws-field ws-move-note" htmlFor={`${id}-note`}>
            <span>{t("ws.note")}</span>
            <input
              id={`${id}-note`}
              className="input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
            />
          </label>
          <button
            type="button"
            className="btn btn-outline"
            disabled={!target}
            onClick={() => {
              setProblem(null);
              setAsking(true);
            }}
          >
            {t("ws.confirm")}
          </button>
        </div>
      ) : (
        application.status !== "withdrawn" && <p className="ws-sub">{t("ws.statusDone")}</p>
      )}

      <ConfirmDialog
        open={asking}
        title={t("ws.moveTo")}
        confirm={t("ws.confirm")}
        busy={busy}
        error={problem}
        onConfirm={move}
        onCancel={() => setAsking(false)}
      >
        {target && <p>{fill(t("ws.moveAsk"), { status: t(statusKey(target)) })}</p>}
      </ConfirmDialog>
    </li>
  );
}
