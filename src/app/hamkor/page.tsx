"use client";

/**
 * An organisation's workspace: its listings, the applications to them,
 * candidates who chose to be findable, invitations, and its public profile.
 *
 * The same flat, tabular shell as the coordinators' panel — this is somebody's
 * work, read for an hour at a time — and deliberately not the women's pages.
 *
 * Everything here is decided on the server: which organisations she belongs
 * to (a membership row, an active organisation and a PARTNER or TRAINER role
 * held in the database, not claimed by a token), what each candidate's
 * profile shows, which status can follow which. The page arranges answers.
 * The chosen organisation and tab live in the address, so a reload or a
 * shared link lands in the same place.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { ApiError, getAccessToken } from "@/services/api";
import {
  portal,
  type OrgApplication,
  type OrgInvitation,
  type OrgListing,
  type OrgMember,
  type OrganizationRead,
} from "@/services/portal";
import { Empty, ErrorNote, Loading, NeedsAuth } from "@/components/ui";
import { VerifiedMark } from "@/components/org/Parts";
import { Listings, Metrics } from "@/components/workspace/Listings";
import { Applications } from "@/components/workspace/Applications";
import { Candidates, Invitations } from "@/components/workspace/Candidates";
import { Profile } from "@/components/workspace/Profile";

const TABS = ["listings", "applications", "candidates", "invitations", "profile"] as const;
type Tab = (typeof TABS)[number];

interface Workspace {
  listings: OrgListing[];
  applications: OrgApplication[];
  invitations: OrgInvitation[];
  members: OrgMember[];
}

function WorkspaceView() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const tabParam = query.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as Tab) : "listings";

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [orgs, setOrgs] = useState<OrganizationRead[] | null>(null);
  const [data, setData] = useState<Workspace | null>(null);
  const [failed, setFailed] = useState(false);
  const [listingFilter, setListingFilter] = useState("");

  const org = useMemo(
    () => orgs?.find((item) => item.id === query.get("org")) ?? orgs?.[0] ?? null,
    [orgs, query],
  );

  const go = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(query.toString());
      for (const [key, value] of Object.entries(patch)) next.set(key, value);
      router.replace(`${pathname}?${next}`, { scroll: false });
    },
    [pathname, query, router],
  );

  useEffect(() => {
    const signedIn = Boolean(getAccessToken());
    setAuthed(signedIn);
    if (!signedIn) return;
    portal
      .myOrganizations()
      .then(setOrgs)
      // A session that could not be refreshed is a sign-in question, not a
      // load error.
      .catch((cause) => {
        if (cause instanceof ApiError && cause.status === 401) setAuthed(false);
        else setFailed(true);
      });
  }, []);

  const load = useCallback((orgId: string) => {
    setData(null);
    setFailed(false);
    Promise.all([
      portal.orgListings(orgId),
      portal.orgApplications(orgId),
      portal.orgInvitations(orgId),
      portal.orgMembers(orgId),
    ])
      .then(([listings, applications, invitations, members]) =>
        setData({ listings, applications, invitations, members }),
      )
      .catch(() => setFailed(true));
  }, []);

  const orgId = org?.id;
  useEffect(() => {
    if (orgId) {
      setListingFilter("");
      load(orgId);
    }
  }, [orgId, load]);

  if (authed === false) {
    return (
      <main className="wrap page">
        <NeedsAuth />
      </main>
    );
  }
  if (failed && !orgs) {
    return (
      <main className="wrap page">
        <ErrorNote message={t("ws.loadError")} />
      </main>
    );
  }
  if (!orgs) {
    return (
      <main className="wrap page" aria-busy="true">
        <Loading rows={3} />
      </main>
    );
  }
  if (!org) {
    return (
      <main className="wrap page">
        <Empty title={t("ws.none")} hint={t("ws.noneHint")} />
      </main>
    );
  }

  const tabLabel = (value: Tab) => t(`ws.tab.${value}` as MessageKey);
  const applications = data
    ? listingFilter
      ? data.applications.filter((item) => item.listing.id === listingFilter)
      : data.applications
    : [];

  return (
    <main className="aw ws">
      <nav className="aw-side" aria-label={t("ws.title")}>
        <div className="aw-brandline">
          <strong>{t("ws.title")}</strong>
          <span className="faint">{org.name}</span>
        </div>
        <div className="aw-group">
          {TABS.map((value) => (
            <button
              key={value}
              type="button"
              className={tab === value ? "aw-link on" : "aw-link"}
              aria-current={tab === value ? "page" : undefined}
              onClick={() => go({ tab: value })}
            >
              {tabLabel(value)}
            </button>
          ))}
        </div>
      </nav>

      <div className="aw-main">
        <div className="ws-orgbar">
          <p className="ws-orgname">
            {org.name}
            <span className={`ws-pill ${org.is_verified ? "is-verified" : "is-unverified"}`}>
              {org.is_verified && <VerifiedMark />}
              {t(org.is_verified ? "ws.verified" : "ws.unverified")}
            </span>
            <span className="ws-pill">{t(org.is_public ? "ws.public" : "ws.private")}</span>
            {org.my_role && <span className="ws-sub">{t(`ws.role.${org.my_role}` as MessageKey)}</span>}
          </p>
          {orgs.length > 1 && (
            <label className="ws-field ws-switch">
              <span>{t("ws.switch")}</span>
              <select className="input" value={org.id} onChange={(event) => go({ org: event.target.value })}>
                {orgs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="aw-head">
          <h1 className="aw-h1">{tabLabel(tab)}</h1>
        </div>

        {failed ? (
          <div className="ws-stack">
            <ErrorNote message={t("ws.loadError")} />
            <button type="button" className="btn btn-outline" onClick={() => load(org.id)}>
              {t("lms.err.retry")}
            </button>
          </div>
        ) : !data ? (
          <Loading rows={3} />
        ) : tab === "listings" ? (
          <>
            <Metrics
              items={[
                { label: t("ws.m.open"), value: data.listings.filter((item) => item.is_open).length },
                { label: t("ws.m.apps"), value: data.applications.length },
                {
                  label: t("ws.m.new"),
                  value: data.applications.filter((item) => item.status === "submitted").length,
                },
                {
                  label: t("ws.m.invites"),
                  value: data.invitations.filter((item) => item.status === "pending").length,
                },
              ]}
            />
            <Listings
              org={org}
              listings={data.listings}
              onChange={(listings) => setData({ ...data, listings })}
            />
          </>
        ) : tab === "applications" ? (
          <Applications
            orgId={org.id}
            listings={data.listings}
            applications={applications}
            listingFilter={listingFilter}
            onFilter={setListingFilter}
            onChange={(next) =>
              setData({
                ...data,
                applications: data.applications.map((item) => (item.id === next.id ? next : item)),
              })
            }
          />
        ) : tab === "candidates" ? (
          <Candidates
            orgId={org.id}
            listings={data.listings}
            onInvited={(sent) => setData({ ...data, invitations: [sent, ...data.invitations] })}
          />
        ) : tab === "invitations" ? (
          <Invitations invitations={data.invitations} listings={data.listings} />
        ) : (
          <Profile
            key={org.id}
            org={org}
            members={data.members}
            onSaved={(next) =>
              setOrgs((prev) => (prev ?? []).map((item) => (item.id === next.id ? { ...next, my_role: item.my_role } : item)))
            }
          />
        )}
      </div>
    </main>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <main className="wrap page">
          <Loading rows={3} />
        </main>
      }
    >
      <WorkspaceView />
    </Suspense>
  );
}
