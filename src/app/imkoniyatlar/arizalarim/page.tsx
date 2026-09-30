"use client";

/**
 * My applications: where each one stands, what she saved, and who may receive
 * her short profile.
 *
 * Only the statuses the platform records — sent, under review, accepted,
 * rejected, withdrawn — drawn as three plain steps with the date each was
 * reached. Nothing is predicted. Withdrawing asks once, in words, and says
 * honestly that the partner platform is not told yet.
 *
 * The permissions section is where consent given on an apply page can be
 * taken back: one button per platform, each appending a new consent row.
 * Below it, the same for organisations on WomanUP: their invitations, the
 * ones that can read her profile, and whether they may find her at all.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { getAccessToken } from "@/services/api";
import {
  portal,
  type ApplicationRecord,
  type OpportunityCard,
} from "@/services/portal";
import { ErrorNote, Loading, NeedsAuth } from "@/components/ui";
import { regionKey, sourceKey, typeKey } from "@/utils/format";
import { JobCard } from "@/components/jobs/JobCard";
import { listingHref } from "@/components/events/format";
import { OrganisationsSection } from "@/components/org/HerSide";
import { TRACK, fill, reachedAt, statusKey, trackPosition } from "@/components/jobs/format";

const PARTNERS: { key: string; scope: string }[] = [
  { key: "edu_job", scope: "share_edu_job" },
  { key: "invest_hub", scope: "share_invest_hub" },
  { key: "commerce", scope: "share_commerce" },
];

export default function MyApplicationsPage() {
  const { t } = useI18n();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[] | null>(null);
  const [saved, setSaved] = useState<OpportunityCard[] | null>(null);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    Promise.all([portal.myApplications(), portal.mySaved(), portal.consentStatus()])
      .then(([apps, kept, given]) => {
        setApplications(apps);
        setSaved(kept);
        setConsents(given);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    const signedIn = Boolean(getAccessToken());
    setAuthed(signedIn);
    if (signedIn) load();
  }, [load]);

  // Arriving from "Saved (n)" or an invitation link lands on that section
  // once it has rendered.
  useEffect(() => {
    const hash = window.location.hash;
    if (saved && (hash === "#saqlangan" || hash === "#takliflar")) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
    }
  }, [saved]);

  if (authed === false) {
    return (
      <main className="wrap page jb-page">
        <NeedsAuth />
      </main>
    );
  }

  return (
    <main className="wrap page jb-page jb-mine">
      <Link href="/imkoniyatlar" className="jb-back">
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M12.5 5l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t("job.back")}
      </Link>
      <header className="jb-hero">
        <h1 className="jb-h1">{t("job.mine.title")}</h1>
        <p className="jb-lead">{t("job.mine.lead")}</p>
      </header>

      {failed ? (
        <div className="stack" style={{ gap: 12 }}>
          <ErrorNote message={t("job.mine.loadError")} />
          <button type="button" className="btn btn-outline" onClick={load}>
            {t("lms.err.retry")}
          </button>
        </div>
      ) : applications === null ? (
        <Loading rows={3} />
      ) : (
        <>
          <section className="jb-section" aria-labelledby="jb-apps-h">
            <h2 id="jb-apps-h" className="jb-h2">
              {t("job.mine.title")}
            </h2>
            {applications.length === 0 ? (
              <div className="jb-empty">
                <p className="jb-empty-title">{t("job.mine.empty")}</p>
                <Link href="/imkoniyatlar" className="btn btn-primary">
                  {t("job.mine.browse")}
                </Link>
              </div>
            ) : (
              <ul className="jb-apps">
                {applications.map((application) => (
                  <ApplicationItem
                    key={application.id}
                    application={application}
                    onChange={(next) =>
                      setApplications((prev) =>
                        (prev ?? []).map((item) => (item.id === next.id ? next : item)),
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="jb-section" id="saqlangan" aria-labelledby="jb-saved-h">
            <h2 id="jb-saved-h" className="jb-h2">
              {t("job.mine.saved")}
            </h2>
            {saved && saved.length ? (
              <ul className="jb-list">
                {saved.map((item) => (
                  <JobCard key={item.id} item={item} signedIn />
                ))}
              </ul>
            ) : (
              <p className="jb-muted">{t("job.mine.savedEmpty")}</p>
            )}
          </section>

          <Permissions consents={consents} onChange={setConsents} />
          <OrganisationsSection />
        </>
      )}
    </main>
  );
}

function ApplicationItem({
  application,
  onChange,
}: {
  application: ApplicationRecord;
  onChange: (next: ApplicationRecord) => void;
}) {
  const { t, tx, locale } = useI18n();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const listing = application.opportunity;
  const position = trackPosition(application.status);
  const date = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : locale === "ru" ? "ru-RU" : "uz-UZ") : "";

  async function withdraw() {
    setBusy(true);
    setFailed(false);
    try {
      onChange(await portal.withdrawApplication(application.id));
      setAsking(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="jb-app">
      <div className="jb-app-head">
        <div className="jb-app-text">
          {listing ? (
            <Link href={listingHref(listing)} className="jb-app-title">
              {tx(listing.title_i18n)}
            </Link>
          ) : null}
          <p className="jb-app-meta">
            {listing && <span>{t(typeKey(listing.type))}</span>}
            {listing?.organisation && <span>{listing.organisation}</span>}
            {listing && <span>{listing.region ? t(regionKey(listing.region)) : t("op.wholeCountry")}</span>}
            {/* An organisation's listing is already named by its organisation. */}
            {listing && listing.source !== "internal" && listing.source !== "organization" && (
              <span>{t(sourceKey(listing.source))}</span>
            )}
          </p>
        </div>
        <span className={`jb-status is-${application.status}`}>{t(statusKey(application.status))}</span>
      </div>

      {position >= 0 ? (
        <ol className="jb-track" aria-label={t("job.mine.progress")}>
          {TRACK.map((step, index) => {
            const done = index <= position;
            const at =
              index === 0
                ? application.submitted_at
                : index === 1
                  ? reachedAt(application, "in_review")
                  : application.resolved_at;
            return (
              <li key={step} className={done ? "is-done" : ""} aria-current={index === position ? "step" : undefined}>
                <span className="jb-track-dot" aria-hidden="true" />
                <span className="jb-track-label">
                  {index === 2 && position === 2
                    ? t(statusKey(application.status))
                    : t(`job.mine.step.${step}`)}
                </span>
                {done && at && <span className="jb-track-date">{date(at)}</span>}
              </li>
            );
          })}
        </ol>
      ) : (
        application.submitted_at && (
          <p className="jb-muted">{fill(t("job.mine.sent"), { date: date(application.submitted_at) })}</p>
        )
      )}

      {application.can_withdraw &&
        (asking ? (
          <div className="jb-withdraw" role="group" aria-label={t("job.mine.withdraw")}>
            <p>{t("job.mine.withdrawAsk")}</p>
            <p className="jb-muted">{t("job.mine.withdrawNote")}</p>
            <div className="jb-actions">
              <button type="button" className="btn pf-btn-danger" onClick={withdraw} disabled={busy}>
                {t("job.mine.withdrawYes")}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setAsking(false)} disabled={busy}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-outline jb-withdraw-btn" onClick={() => setAsking(true)}>
            {t("job.mine.withdraw")}
          </button>
        ))}
      {failed && (
        <p className="pf-error" role="alert">
          {t("job.mine.withdrawErr")}
        </p>
      )}
    </li>
  );
}

function Permissions({
  consents,
  onChange,
}: {
  consents: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);

  async function withdraw(scope: string) {
    setBusy(scope);
    try {
      await portal.setConsent(scope, false);
      onChange(await portal.consentStatus());
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="jb-section" aria-labelledby="jb-perm-h">
      <h2 id="jb-perm-h" className="jb-h2">
        {t("job.mine.consents")}
      </h2>
      <p className="jb-muted">{t("job.mine.consentsLead")}</p>
      <ul className="jb-perms">
        {PARTNERS.map(({ key, scope }) => {
          const given = consents[key] === true;
          return (
            <li key={key} className="jb-perm">
              <span className="jb-perm-name">{t(sourceKey(key))}</span>
              <span className={`jb-perm-state ${given ? "is-on" : "is-off"}`}>
                {t(given ? "job.mine.consentOn" : "job.mine.consentOff")}
              </span>
              {given && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => withdraw(scope)}
                  disabled={busy === scope}
                >
                  {t("job.mine.consentWithdraw")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="jb-note">{t("job.mine.consentNote")}</p>
    </section>
  );
}
