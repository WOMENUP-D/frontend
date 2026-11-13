"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getRoles, staffHome } from "@/services/api";
import { AdminUsers } from "./AdminUsers";
import { AdminAudit } from "./AdminAudit";
import { AdminOrgs } from "./AdminOrgs";
import { Results } from "@/components/results/Results";
import { Analytics } from "@/components/analytics/Analytics";
import { Loading, NeedsAuth } from "@/components/ui";
import { useI18n } from "@/i18n";

type Tab = "analytics" | "results" | "users" | "orgs" | "audit";

export default function AdminPage() {
  const { t } = useI18n();
  const router = useRouter();
  /* Who is looking is settled before anything renders: the session gate has
     already resumed the token, so the roles are known on the first render.
     A learner used to see the panel for a moment — and its first request
     went out — before the redirect (C-24). */
  const [access] = useState(() => {
    const token = getAccessToken();
    const roles = token ? getRoles() : [];
    const staff = roles.some((role) => role !== "user" && role !== "mother");
    return {
      authed: Boolean(token),
      staff,
      // An organisation's person has no panel: her screen is the workspace.
      orgOnly: staff && staffHome() === "/hamkor",
      // Organisations are the administrators' alone; the server refuses anyone else.
      isAdmin: roles.includes("admin"),
      // A regional coordinator's region is decided by the server, not picked
      // here. The national analytics have no region to scope to, so they are
      // for the same two roles that may pick one.
      national: roles.includes("admin") || roles.includes("moderator"),
    };
  });
  const authed = access.authed;
  const isAdmin = access.isAdmin;
  const canPickRegion = access.national;
  // The administrator's first screen answers "is anyone here": the analytics.
  // A coordinator opens on her region's results.
  const [tab, setTab] = useState<Tab>(access.national ? "analytics" : "results");
  const redirect = authed && (!access.staff ? "/kabinet" : access.orgOnly ? "/hamkor" : null);

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  // The staff door, not the learner's: a coordinator sent to /login could
  // never get in from there.
  if (authed === false) {
    return (
      <main className="wrap page">
        <NeedsAuth href="/admin/login" hint={t("ad.signInHint")} />
      </main>
    );
  }
  if (redirect) return <main className="wrap page"><Loading rows={4} /></main>;

  const link = (value: Tab, label: string) => (
    <button
      type="button"
      className={tab === value ? "aw-link on" : "aw-link"}
      aria-current={tab === value ? "page" : undefined}
      onClick={() => setTab(value)}
    >
      {label}
    </button>
  );

  return (
    <main className="aw">
      <nav className="aw-side" aria-label={t("ad.title")}>
        <div className="aw-brandline">
          <strong>{t("ad.title")}</strong>
          <span className="faint">{t("ad.subtitle")}</span>
        </div>

        <div className="aw-group">
          <span>{t("aw.sectionOverview")}</span>
          {canPickRegion && link("analytics", t("an.tab"))}
          {link("results", t("res.tab"))}
        </div>

        <div className="aw-group">
          <span>{t("aw.sectionPeople")}</span>
          {link("users", t("ap.tabUsers"))}
          {isAdmin && link("orgs", t("adm.org.tab"))}
        </div>

        <div className="aw-group">
          <span>{t("aw.sectionSystem")}</span>
          {link("audit", t("ap.tabAudit"))}
        </div>
      </nav>

      <div className="aw-main">
        {tab === "users" ? (
          <>
            <div className="aw-head">
              <h1 className="aw-h1">{t("ap.tabUsers")}</h1>
            </div>
            <AdminUsers canPickRegion={canPickRegion} />
          </>
        ) : tab === "orgs" ? (
          <>
            <div className="aw-head">
              <h1 className="aw-h1">{t("adm.org.tab")}</h1>
            </div>
            <AdminOrgs />
          </>
        ) : tab === "audit" ? (
          <>
            <div className="aw-head">
              <h1 className="aw-h1">{t("ap.tabAudit")}</h1>
            </div>
            <AdminAudit />
          </>
        ) : tab === "analytics" && canPickRegion ? (
          <Analytics />
        ) : (
          <Results canPickRegion={canPickRegion} />
        )}
      </div>
    </main>
  );
}
