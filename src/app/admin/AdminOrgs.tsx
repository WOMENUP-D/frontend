"use client";

/**
 * Organisations, for WomanUP's administrators: connect one, check who it is,
 * suspend it, and say who acts for it.
 *
 * A member is added by the email of an account that already exists — nobody
 * is invited into WomanUP from here — and gets the role its kind needs
 * (PARTNER, or TRAINER for an education provider) if they do not hold it.
 * Suspending takes every listing down; reinstating does not put them back.
 * Every action is written to the audit log on the server.
 */

import { useCallback, useEffect, useId, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { ApiError } from "@/services/api";
import {
  portal,
  type OrgMember,
  type OrgMemberRole,
  type OrganizationAdmin,
  type OrganizationKind,
} from "@/services/portal";
import { Loading } from "@/components/ui";
import { fill } from "@/components/jobs/format";
import { ConfirmDialog } from "@/components/org/ConfirmDialog";
import { VerifiedMark } from "@/components/org/Parts";

const KINDS: OrganizationKind[] = ["employer", "education_provider", "investor", "ngo", "government"];

export function AdminOrgs() {
  const { t } = useI18n();
  const id = useId();
  const [orgs, setOrgs] = useState<OrganizationAdmin[] | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<OrganizationKind>("employer");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(() => {
    portal
      .adminOrganizations()
      .then(setOrgs)
      .catch(() => setProblem(t("ws.loadError")));
  }, [t]);

  useEffect(load, [load]);

  const replace = (next: OrganizationAdmin) =>
    setOrgs((prev) => (prev ?? []).map((item) => (item.id === next.id ? next : item)));

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) return;
    setBusy(true);
    setProblem(null);
    try {
      const made = await portal.adminCreateOrganization(name.trim(), kind);
      setOrgs((prev) => [made, ...(prev ?? [])]);
      setName("");
    } catch {
      setProblem(t("adm.org.err"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ws-stack">
      <form className="aw-card ws-form" onSubmit={create} aria-labelledby={`${id}-h`}>
        <h2 id={`${id}-h`} className="ws-form-title">
          {t("adm.org.create")}
        </h2>
        <div className="ws-grid ws-grid-3">
          <label className="ws-field" htmlFor={`${id}-name`}>
            <span>{t("adm.org.name")}</span>
            <input
              id={`${id}-name`}
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={200}
              required
            />
          </label>
          <label className="ws-field" htmlFor={`${id}-kind`}>
            <span>{t("adm.org.kind")}</span>
            <select
              id={`${id}-kind`}
              className="input"
              value={kind}
              onChange={(event) => setKind(event.target.value as OrganizationKind)}
            >
              {KINDS.map((value) => (
                <option key={value} value={value}>
                  {t(`org.kind.${value}` as MessageKey)}
                </option>
              ))}
            </select>
          </label>
          <div className="ws-field ws-field-end">
            <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length < 2}>
              {t("adm.org.create")}
            </button>
          </div>
        </div>
        {problem && (
          <p className="pf-error" role="alert">
            {problem}
          </p>
        )}
      </form>

      {orgs === null ? (
        <Loading rows={2} />
      ) : orgs.length === 0 ? (
        <p className="ws-empty">{t("adm.org.none")}</p>
      ) : (
        <ul className="ws-list">
          {orgs.map((org) => (
            <OrgRow key={org.id} org={org} onChange={replace} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrgRow({ org, onChange }: { org: OrganizationAdmin; onChange: (next: OrganizationAdmin) => void }) {
  const { t } = useI18n();
  const id = useId();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgMemberRole>("member");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [removing, setRemoving] = useState<OrgMember | null>(null);

  async function run(action: () => Promise<OrganizationAdmin | void>, done?: () => void) {
    setBusy(true);
    setProblem(null);
    try {
      const next = await action();
      if (next) onChange(next);
      done?.();
    } catch (cause) {
      const reason =
        cause instanceof ApiError ? (cause.detail as { reason?: string } | undefined)?.reason : undefined;
      setProblem(t(reason === "user_not_found" ? "adm.org.userNotFound" : "adm.org.err"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="aw-card ws-app">
      <div className="ws-app-head">
        <div>
          <p className="ws-app-title">{org.name}</p>
          <p className="ws-sub ws-meta">
            <span>{t(`org.kind.${org.kind}` as MessageKey)}</span>
            <span>{fill(t("adm.org.listings"), { n: org.listings })}</span>
          </p>
        </div>
        <p className="ws-pills">
          <span className={`ws-pill ${org.is_verified ? "is-verified" : "is-unverified"}`}>
            {org.is_verified && <VerifiedMark />}
            {t(org.is_verified ? "ws.verified" : "ws.unverified")}
          </span>
          <span className={`ws-pill ${org.is_active ? "is-open" : "is-closed"}`}>
            {t(org.is_active ? "adm.org.active" : "adm.org.suspended")}
          </span>
        </p>
      </div>

      <div className="ws-form-actions">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={busy}
          onClick={() => run(() => portal.adminSetOrganization(org.id, { is_verified: !org.is_verified }))}
        >
          {t(org.is_verified ? "adm.org.unverify" : "adm.org.verify")}
        </button>
        {org.is_active ? (
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setSuspending(true)}>
            {t("adm.org.suspend")}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busy}
            onClick={() => run(() => portal.adminSetOrganization(org.id, { is_active: true }))}
          >
            {t("adm.org.reinstate")}
          </button>
        )}
      </div>

      <div>
        <h3 className="ws-section-title">{t("ws.members")}</h3>
        {org.members.length > 0 && (
          <ul className="ws-members">
            {org.members.map((member) => (
              <li key={member.user_id}>
                <span>
                  {member.first_name ?? member.email ?? "—"}
                  {member.first_name && member.email && <span className="ws-sub"> {member.email}</span>}
                </span>
                <span className="ws-sub">{t(`ws.role.${member.role}` as MessageKey)}</span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={busy}
                  onClick={() => setRemoving(member)}
                >
                  {t("adm.org.remove")}
                  <span className="sr-only">: {member.first_name ?? member.email ?? ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="ws-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (email.trim().length < 3) return;
            void run(() => portal.adminAddMember(org.id, email.trim(), role), () => setEmail(""));
          }}
        >
          <label className="ws-field" htmlFor={`${id}-email`}>
            <span>{t("adm.org.addMember")}</span>
            <input
              id={`${id}-email`}
              className="input"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby={`${id}-hint`}
            />
          </label>
          <label className="ws-field" htmlFor={`${id}-role`}>
            <span>{t("adm.org.role")}</span>
            <select
              id={`${id}-role`}
              className="input"
              value={role}
              onChange={(event) => setRole(event.target.value as OrgMemberRole)}
            >
              <option value="member">{t("ws.role.member")}</option>
              <option value="owner">{t("ws.role.owner")}</option>
            </select>
          </label>
          <button type="submit" className="btn btn-outline" disabled={busy || email.trim().length < 3}>
            {t("adm.org.add")}
          </button>
        </form>
        <p id={`${id}-hint`} className="ws-hint">
          {t("adm.org.memberHint")}
        </p>
      </div>

      {problem && (
        <p className="pf-error" role="alert">
          {problem}
        </p>
      )}

      <ConfirmDialog
        open={suspending}
        title={`${t("adm.org.suspend")}: ${org.name}`}
        confirm={t("adm.org.suspend")}
        tone="danger"
        busy={busy}
        onConfirm={() =>
          run(
            () => portal.adminSetOrganization(org.id, { is_active: false }),
            () => setSuspending(false),
          )
        }
        onCancel={() => setSuspending(false)}
      >
        <p>{t("adm.org.suspendAsk")}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={removing !== null}
        title={t("adm.org.remove")}
        confirm={t("adm.org.remove")}
        tone="danger"
        busy={busy}
        onConfirm={() =>
          removing &&
          run(
            async () => {
              await portal.adminRemoveMember(org.id, removing.user_id);
              const all = await portal.adminOrganizations();
              return all.find((item) => item.id === org.id);
            },
            () => setRemoving(null),
          )
        }
        onCancel={() => setRemoving(null)}
      >
        {removing && (
          <p>{fill(t("adm.org.removeAsk"), { name: removing.first_name ?? removing.email ?? "" })}</p>
        )}
      </ConfirmDialog>
    </li>
  );
}
