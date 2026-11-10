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
  const [authed, setAuthed] = useState<boolean | null>(null);
  // Organisations are the administrators' alone; the server refuses anyone else.
  const [isAdmin, setIsAdmin] = useState(false);
  // A regional coordinator's region is decided by the server, not picked here.
  // The national analytics — traffic, funnels, errors — have no region to
  // scope to, so they are for the same two roles that may pick one.
  const [canPickRegion, setCanPickRegion] = useState(false);
  const [tab, setTab] = useState<Tab>("results");

  useEffect(() => {
    const token = getAccessToken();
    setAuthed(Boolean(token));
    if (!token) return;

    // A learner who lands here by typing the address is sent back to her own
    // cabinet rather than shown a dashboard of zeros and a load error. The
    // server refuses her either way; this only spares her the broken page.
    const roles = getRoles();
    const national = roles.includes("admin") || roles.includes("moderator");
    setIsAdmin(roles.includes("admin"));
    setCanPickRegion(national);
    // The administrator's first screen is the one that answers "is anyone
    // here": the analytics. A coordinator opens on her region's results.
    if (national) setTab("analytics");
    if (!roles.some((role) => role !== "user" && role !== "mother")) {
      router.replace("/kabinet");
      return;
    }
    // An organisation's person has no panel: her screen is the workspace.
    if (staffHome() === "/hamkor") router.replace("/hamkor");
  }, [router]);

  // The staff door, not the learner's: a coordinator sent to /login could
  // never get in from there.
  if (authed === false) {
    return (
      <main className="wrap page">
        <NeedsAuth href="/admin/login" hint={t("ad.signInHint")} />
      </main>
    );
  }
  if (authed === null) return <main className="wrap page"><Loading rows={4} /></main>;

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
