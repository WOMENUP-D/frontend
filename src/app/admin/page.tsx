"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getAccessToken, getRoles, staffHome } from "@/services/api";
import { portal, type TrafficReport } from "@/services/portal";
import { AdminUsers } from "./AdminUsers";
import { AdminAudit } from "./AdminAudit";
import { AdminOrgs } from "./AdminOrgs";
import { Results } from "@/components/results/Results";
import { Empty, ErrorNote, Loading, NeedsAuth } from "@/components/ui";
import { useI18n } from "@/i18n";

type Tab = "results" | "traffic" | "users" | "orgs" | "audit";

export default function AdminPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [traffic, setTraffic] = useState<TrafficReport | null>(null);
  const [tab, setTab] = useState<Tab>("results");
  // Organisations are the administrators' alone; the server refuses anyone else.
  const [isAdmin, setIsAdmin] = useState(false);
  // A regional coordinator's region is decided by the server, not picked here.
  const [canPickRegion, setCanPickRegion] = useState(false);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    setAuthed(Boolean(token));
    if (!token) return;

    // A learner who lands here by typing the address is sent back to her own
    // cabinet rather than shown a dashboard of zeros and a load error. The
    // server refuses her either way; this only spares her the broken page.
    const roles = getRoles();
    setIsAdmin(roles.includes("admin"));
    setCanPickRegion(roles.includes("admin") || roles.includes("moderator"));
    if (!roles.some((role) => role !== "user" && role !== "mother")) {
      router.replace("/kabinet");
      return;
    }
    // An organisation's person has no panel: her screen is the workspace.
    if (staffHome() === "/hamkor") router.replace("/hamkor");
  }, [router]);

  useEffect(() => {
    if (tab !== "traffic" || !authed) return;
    setError(null);
    portal
      .traffic(days)
      .then(setTraffic)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setError(t("ad.errLoad"));
      });
  }, [tab, days, authed, t]);

  if (authed === false) return <main className="wrap page"><NeedsAuth /></main>;
  if (authed === null) return <main className="wrap page"><Loading rows={4} /></main>;

  if (forbidden) {
    return (
      <main className="wrap page">
        <Empty
          title={t("ad.forbidden")}
          hint={t("ad.forbiddenHint")}
        />
      </main>
    );
  }

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
          {link("results", t("res.tab"))}
          {link("traffic", t("ap.tabTraffic"))}
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
            <AdminUsers />
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
        ) : tab === "traffic" ? (
          <>
            <div className="aw-head">
              <h1 className="aw-h1">{t("ap.tabTraffic")}</h1>
              <PeriodPicker days={days} onChange={setDays} />
            </div>
            {error && <ErrorNote message={error} />}
            {traffic ? <TrafficPanel data={traffic} /> : !error && <Loading rows={3} />}
          </>
        ) : (
          <Results canPickRegion={canPickRegion} />
        )}
      </div>
    </main>
  );
}

function PeriodPicker({ days, onChange }: { days: number; onChange: (n: number) => void }) {
  const { t } = useI18n();
  return (
    <div className="row" style={{ gap: 8 }}>
      <span className="faint">{t("ap.period")}</span>
      {([[7, "ap.days7"], [30, "ap.days30"], [90, "ap.days90"]] as const).map(([n, label]) => (
        <button
          key={n}
          type="button"
          className={days === n ? "chip chip-on" : "chip"}
          onClick={() => onChange(n)}
        >
          {t(label)}
        </button>
      ))}
    </div>
  );
}


/**
 * Site traffic.
 *
 * Every other number on this dashboard counts people who already registered.
 * This one counts everybody who arrived — which is the only way to see how many
 * never got as far as an account.
 */
function TrafficPanel({ data }: { data: TrafficReport }) {
  const { t } = useI18n();
  const peak = Math.max(1, ...data.by_day.map((d) => d.visitors));
  const maxPath = Math.max(1, ...data.top_paths.map((p) => p.views));

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="spread" style={{ marginBottom: 2 }}>
        <span className="eyebrow">{t("tr.title")}</span>
        <span className="faint">{t("tr.note")}</span>
      </div>

      <div className="traffic-tiles">
        {[
          [t("tr.today"), data.visitors_today, `${data.views_today} ${t("tr.viewsOf")}`],
          [t("tr.week"), data.visitors_7d, t("tr.visitorsOf")],
          [t("tr.month"), data.visitors_30d, `${data.views_30d} ${t("tr.viewsOf")}`],
          [t("tr.signedIn"), `${data.signed_in_share}%`, t("tr.month").toLowerCase()],
          [t("tr.returning"), `${data.returning_share}%`, t("tr.month").toLowerCase()],
        ].map(([label, value, note]) => (
          <div key={String(label)} className="traffic-tile">
            <span className="faint">{label}</span>
            <strong className="figure">{value}</strong>
            <span className="faint">{note}</span>
          </div>
        ))}
      </div>

      {data.by_day.length > 0 ? (
        <div className="stack" style={{ gap: 8 }}>
          <span className="faint">{t("tr.byDay")}</span>
          <div className="traffic-chart" role="img" aria-label={t("tr.byDay")}>
            {data.by_day.map((point) => (
              <span
                key={point.day}
                className="traffic-bar"
                style={{ height: `${Math.max(4, (point.visitors / peak) * 100)}%` }}
                title={`${point.day} · ${point.visitors} / ${point.views}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="muted small">{t("tr.empty")}</p>
      )}

      {data.top_paths.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="faint">{t("tr.topPages")}</span>
          {data.top_paths.map((row) => (
            <div key={row.path} className="traffic-path">
              <code className="small">{row.path}</code>
              <span className="traffic-path-bar">
                <span style={{ width: `${(row.views / maxPath) * 100}%` }} />
              </span>
              <span className="small figure">{row.views}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
