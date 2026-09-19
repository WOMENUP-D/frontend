"use client";

/**
 * Her side of organisations, on the "My applications" page: who has invited
 * her, who can read her profile, and whether organisations may find her.
 *
 * * Invitations — accepting asks once, listing exactly what the organisation
 *   will then see; declining needs no confirmation, since it shares nothing.
 * * Sharing — every organisation that can read her profile, each with "Stop
 *   sharing". Stopping appends a withdrawal; the organisation's view of her
 *   applications goes blank at once.
 * * Discovery — off unless she turns it on. On, organisations can find her by
 *   skill under a pseudonym; they learn who she is only if she accepts.
 *
 * Every answer is recorded on the server; this page only asks and reports.
 */

import { useCallback, useEffect, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import {
  portal,
  type MyInvitation,
  type OrganizationBrief,
} from "@/services/portal";
import { fill } from "@/components/jobs/format";
import { ConfirmDialog } from "./ConfirmDialog";
import { OrgLine, StateLine } from "./Parts";

const INVITE_TONE = {
  pending: "wait",
  accepted: "good",
  declined: "off",
  withdrawn: "off",
} as const;

export function OrganisationsSection() {
  const { t, tx, locale } = useI18n();
  const [invitations, setInvitations] = useState<MyInvitation[] | null>(null);
  const [sharing, setSharing] = useState<OrganizationBrief[] | null>(null);
  const [discovery, setDiscovery] = useState<boolean | null>(null);
  const [accepting, setAccepting] = useState<MyInvitation | null>(null);
  const [stopping, setStopping] = useState<OrganizationBrief | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([portal.myInvitations(), portal.mySharing(), portal.consents()])
      .then(([mine, shared, consents]) => {
        setInvitations(mine);
        setSharing(shared);
        setDiscovery(consents.candidate_discovery === true);
      })
      .catch(() => {
        setInvitations((prev) => prev ?? []);
        setSharing((prev) => prev ?? []);
      });
  }, []);

  useEffect(load, [load]);

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : locale === "ru" ? "ru-RU" : "uz-UZ");

  async function answer(invitation: MyInvitation, accept: boolean) {
    setBusy(true);
    setProblem(null);
    try {
      const next = await portal.answerInvitation(invitation.id, accept);
      setInvitations((prev) => (prev ?? []).map((item) => (item.id === next.id ? next : item)));
      setAccepting(null);
      if (accept) setSharing(await portal.mySharing());
    } catch {
      setProblem(t("inv.err"));
    } finally {
      setBusy(false);
    }
  }

  async function stop(org: OrganizationBrief) {
    setBusy(true);
    setProblem(null);
    try {
      await portal.stopSharing(org.id);
      setSharing((prev) => (prev ?? []).filter((item) => item.id !== org.id));
      setStopping(null);
    } catch {
      setProblem(t("inv.err"));
    } finally {
      setBusy(false);
    }
  }

  async function toggleDiscovery() {
    if (discovery === null) return;
    setBusy(true);
    try {
      await portal.setConsent("candidate_discovery", !discovery);
      setDiscovery(!discovery);
    } catch {
      /* Left as it was: the switch still says the truth. */
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="jb-section" id="takliflar" aria-labelledby="og-inv-h">
        <h2 id="og-inv-h" className="jb-h2">
          {t("inv.title")}
        </h2>
        {invitations === null ? null : invitations.length === 0 ? (
          <p className="jb-muted">{t("inv.none")}</p>
        ) : (
          <ul className="jb-apps">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="jb-app og-invite">
                <div className="jb-app-head">
                  <div className="jb-app-text">
                    <OrgLine org={invitation.organization} withHint />
                    {invitation.opportunity && (
                      <p className="jb-app-meta">
                        {fill(t("inv.about"), { title: tx(invitation.opportunity.title_i18n) })}
                      </p>
                    )}
                  </div>
                  <StateLine tone={INVITE_TONE[invitation.status]}>
                    {t(`inv.st.${invitation.status}` as MessageKey)}
                  </StateLine>
                </div>
                {invitation.message && <blockquote className="og-message">{invitation.message}</blockquote>}
                <p className="jb-muted og-date">{date(invitation.created_at)}</p>
                {invitation.status === "pending" && (
                  <div className="jb-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setProblem(null);
                        setAccepting(invitation);
                      }}
                      disabled={busy}
                    >
                      {t("inv.accept")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => answer(invitation, false)}
                      disabled={busy}
                    >
                      {t("inv.decline")}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="jb-section" aria-labelledby="og-share-h">
        <h2 id="og-share-h" className="jb-h2">
          {t("share.title")}
        </h2>
        {sharing === null ? null : sharing.length === 0 ? (
          <p className="jb-muted">{t("share.none")}</p>
        ) : (
          <ul className="jb-perms">
            {sharing.map((org) => (
              <li key={org.id} className="jb-perm">
                <span className="jb-perm-name">
                  <OrgLine org={org} />
                </span>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setProblem(null);
                    setStopping(org);
                  }}
                >
                  {t("share.stop")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="jb-section" aria-labelledby="og-disc-h">
        <h2 id="og-disc-h" className="jb-h2">
          {t("disc.title")}
        </h2>
        <p className="og-disc-body">{t("disc.body")}</p>
        <p className="jb-muted">{t("disc.adults")}</p>
        {discovery !== null && (
          <div className="og-disc">
            <StateLine tone={discovery ? "good" : "off"}>{t(discovery ? "disc.on" : "disc.off")}</StateLine>
            <button
              type="button"
              className="btn btn-outline"
              onClick={toggleDiscovery}
              disabled={busy}
            >
              {t(discovery ? "disc.turnOff" : "disc.turnOn")}
            </button>
          </div>
        )}
      </section>

      {problem && !accepting && !stopping && (
        <p className="pf-error" role="alert">
          {problem}
        </p>
      )}

      <ConfirmDialog
        open={accepting !== null}
        title={t("inv.confirmTitle")}
        confirm={t("inv.accept")}
        busy={busy}
        error={accepting ? problem : null}
        onConfirm={() => accepting && answer(accepting, true)}
        onCancel={() => setAccepting(null)}
      >
        {accepting && (
          <>
            <p>{fill(t("inv.confirmBody"), { org: accepting.organization.name })}</p>
            <ul className="jb-fields">
              {accepting.fields.map((field) => (
                <li key={field}>{t(`job.field.${field}` as MessageKey)}</li>
              ))}
            </ul>
            <p className="jb-muted">{t("job.apply.orgNotSent")}</p>
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={stopping !== null}
        title={t("share.stop")}
        confirm={t("share.stopYes")}
        tone="danger"
        busy={busy}
        error={stopping ? problem : null}
        onConfirm={() => stopping && stop(stopping)}
        onCancel={() => setStopping(null)}
      >
        {stopping && <p>{fill(t("share.stopAsk"), { org: stopping.name })}</p>}
      </ConfirmDialog>
    </>
  );
}
