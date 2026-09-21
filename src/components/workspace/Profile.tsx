"use client";

/**
 * The organisation's public profile, and who works in it.
 *
 * Only the owner edits it; a member reads the same fields. Everything here is
 * public once "Make the page public" is on — which is why there is no field
 * for anything about a person. The logo must be an https address; the server
 * refuses anything else.
 */

import Link from "next/link";
import { useId, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { ApiError } from "@/services/api";
import { portal, type OrgMember, type OrganizationRead } from "@/services/portal";
import { REGIONS, regionKey } from "@/utils/format";
import { fill } from "@/components/jobs/format";
import { problemMessage } from "./model";

const DESCRIPTIONS: readonly ["uz" | "ru" | "en", MessageKey][] = [
  ["uz", "ws.f.descUz"],
  ["ru", "ws.f.descRu"],
  ["en", "ws.f.descEn"],
];

export function Profile({
  org,
  members,
  onSaved,
}: {
  org: OrganizationRead;
  members: OrgMember[];
  onSaved: (next: OrganizationRead) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const owner = org.my_role === "owner";
  const [form, setForm] = useState({
    uz: org.description_i18n.uz ?? "",
    ru: org.description_i18n.ru ?? "",
    en: org.description_i18n.en ?? "",
    industry: org.industry ?? "",
    region: org.region ?? "",
    city: org.city ?? "",
    website: org.website ?? "",
    logo: org.logo_url ?? "",
    isPublic: org.is_public,
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    const description: Record<string, string> = {};
    for (const language of ["uz", "ru", "en"] as const) {
      if (form[language].trim()) description[language] = form[language].trim();
    }
    try {
      const next = await portal.updateOrganization(org.id, {
        description_i18n: description,
        industry: form.industry.trim() || null,
        region: form.region || null,
        city: form.city.trim() || null,
        website: form.website.trim() || null,
        logo_url: form.logo.trim() || null,
        is_public: form.isPublic,
      });
      onSaved(next);
      setStatus({ ok: true, text: t("ws.saved") });
    } catch (cause) {
      const message = problemMessage(
        cause instanceof ApiError ? cause.detail : null,
        cause instanceof ApiError ? cause.status : undefined,
      );
      setStatus({ ok: false, text: fill(t("ws.saveError"), { reason: fill(t(message.key), message.values) }) });
    } finally {
      setBusy(false);
    }
  }

  const field = (name: string) => `${id}-${name}`;

  return (
    <div className="ws-stack">
      {!owner && <p className="ws-note">{t("ws.profileOwnerOnly")}</p>}
      {org.is_public && (
        <p>
          <Link href={`/tashkilot/${org.slug}`} className="jb-inline-link">
            {t("ws.viewPublic")}
          </Link>
        </p>
      )}

      <form className="aw-card ws-form" onSubmit={save} noValidate>
        <fieldset className="ws-fieldset" disabled={!owner || busy}>
          <div className="ws-grid ws-grid-3">
            <label className="ws-field" htmlFor={field("industry")}>
              <span>{t("ws.f.industry")}</span>
              <input id={field("industry")} className="input" value={form.industry} onChange={set("industry")} maxLength={120} />
            </label>
            <label className="ws-field" htmlFor={field("region")}>
              <span>{t("ws.f.region")}</span>
              <select id={field("region")} className="input" value={form.region} onChange={set("region")}>
                <option value="">—</option>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {t(regionKey(region))}
                  </option>
                ))}
              </select>
            </label>
            <label className="ws-field" htmlFor={field("city")}>
              <span>{t("ws.f.city")}</span>
              <input id={field("city")} className="input" value={form.city} onChange={set("city")} maxLength={120} />
            </label>
          </div>
          <div className="ws-grid">
            <label className="ws-field" htmlFor={field("website")}>
              <span>{t("ws.f.website")}</span>
              <input
                id={field("website")}
                className="input"
                type="url"
                inputMode="url"
                value={form.website}
                onChange={set("website")}
                maxLength={300}
              />
            </label>
            <label className="ws-field" htmlFor={field("logo")}>
              <span>{t("ws.f.logo")}</span>
              <input
                id={field("logo")}
                className="input"
                type="url"
                inputMode="url"
                value={form.logo}
                onChange={set("logo")}
                maxLength={500}
              />
            </label>
          </div>
          {DESCRIPTIONS.map(([language, label]) => (
            <label key={language} className="ws-field" htmlFor={field(`d-${language}`)}>
              <span>{t(label)}</span>
              <textarea
                id={field(`d-${language}`)}
                className="input"
                rows={4}
                lang={language === "uz" ? "uz-Latn" : language}
                value={form[language]}
                onChange={set(language)}
                maxLength={4000}
              />
            </label>
          ))}
          <label className="jb-check ws-check">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(event) => setForm((prev) => ({ ...prev, isPublic: event.target.checked }))}
            />
            <span>{t("ws.f.public")}</span>
          </label>
        </fieldset>
        {status && (
          <p className={status.ok ? "ws-ok" : "pf-error"} role={status.ok ? "status" : "alert"}>
            {status.text}
          </p>
        )}
        {owner && (
          <div className="ws-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t("ws.f.saveProfile")}
            </button>
          </div>
        )}
      </form>

      <section className="aw-card" aria-labelledby={field("members")}>
        <h2 id={field("members")} className="ws-section-title">
          {t("ws.members")}
        </h2>
        <ul className="ws-members">
          {members.map((member) => (
            <li key={member.user_id}>
              <span>{member.first_name ?? "—"}</span>
              <span className="ws-sub">{t(`ws.role.${member.role}` as MessageKey)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
