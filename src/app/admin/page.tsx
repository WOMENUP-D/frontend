"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getAccessToken, getRoles } from "@/services/api";
import { portal, type AdminFilters, type TrafficReport } from "@/services/portal";
import { AdminUsers } from "./AdminUsers";
import { AdminAudit } from "./AdminAudit";
import { EdRow, EdRows, Empty, ErrorNote, Loading, NeedsAuth } from "@/components/ui";
import { useI18n } from "@/i18n";
import { kpiKey, regionKey } from "@/utils/format";

interface Overview {
  total_registered: number;
  active_users: number;
  onboarding_completed: number;
  programs_completed: number;
  employed_via_edu_job: number;
  businesses_via_invest_hub: number;
  sellers_via_commerce: number;
  mentor_sessions: number;
  at_risk_users: number;
  avg_development_score: number;
  coverage_by_region: Array<{ region: string; registered: number; active: number }>;
}

interface Kpi {
  generated_at: string;
  kpis: Array<{
    key: string; label: string; value: number;
    numerator: number | null; denominator: number | null; target: number | null;
  }>;
}

export default function AdminPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [regions, setRegions] = useState<Array<{ region: string; users: number }>>([]);
  const [traffic, setTraffic] = useState<TrafficReport | null>(null);
  const [tab, setTab] = useState<"overview" | "traffic" | "users" | "audit">("overview");
  const [filters, setFilters] = useState<AdminFilters>({});
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    setAuthed(Boolean(token));
    if (!token) { setLoading(false); return; }

    // A learner who lands here by typing the address is sent back to her own
    // cabinet rather than shown a dashboard of zeros and a load error. The
    // server refuses her either way; this only spares her the broken page.
    const roles = getRoles();
    if (!roles.some((role) => role !== "user" && role !== "mother")) {
      router.replace("/kabinet");
      return;
    }

    Promise.all([
      portal.dashboard(filters),
      portal.kpi(filters),
      portal.regionStats(),
      portal.traffic(days),
    ])
      .then(([o, k, r, tr]) => {
        setOverview(o as Overview);
        setKpi(k as Kpi);
        setRegions(r);
        setTraffic(tr);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setError(t("ad.errLoad"));
      })
      .finally(() => setLoading(false));
  }, [filters, days]);

  if (authed === false) return <main className="wrap page"><NeedsAuth /></main>;
  if (loading) return <main className="wrap page"><Loading rows={4} /></main>;

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

  const tiles = overview ? [
    [t("ad.registered"), overview.total_registered],
    [t("ad.active"), overview.active_users],
    [t("ad.onboarded"), overview.onboarding_completed],
    [t("ad.coursesDone"), overview.programs_completed],
    [t("ad.employed"), overview.employed_via_edu_job],
    [t("ad.business"), overview.businesses_via_invest_hub],
    [t("ad.sellers"), overview.sellers_via_commerce],
    [t("ad.atRisk"), overview.at_risk_users],
  ] as const : [];

  const maxRegion = Math.max(1, ...regions.map((r) => r.users));

  const kpiOf = (key: string) => kpi?.kpis.find((k) => k.key === key);

  /** Registration → diagnostic → plan → programme → application → outcome.
   *  Each stage is read as a share of the whole cohort, so the drop-off between
   *  two rows is the thing a coordinator is looking for. */
  const funnel = overview
    ? ([
        [t("aw.total"), overview.total_registered],
        [t("aw.onboarded"), overview.onboarding_completed],
        [t("aw.assessed"), kpiOf("assessment_completion")?.numerator ?? 0],
        [t("aw.plans"), kpiOf("plan_adoption")?.numerator ?? 0],
        [t("aw.enrolled"), kpiOf("program_completion")?.denominator ?? 0],
        [t("aw.applied"), kpiOf("opportunity_conversion")?.denominator ?? 0],
        [
          t("aw.results"),
          overview.employed_via_edu_job +
            overview.businesses_via_invest_hub +
            overview.sellers_via_commerce,
        ],
      ] as Array<[string, number]>)
    : [];
  const cohort = Math.max(1, overview?.total_registered ?? 1);

  return (
    <main className="aw">
      <nav className="aw-side">
        <div className="aw-brandline">
          <strong>{t("ad.title")}</strong>
          <span className="faint">{t("ad.subtitle")}</span>
        </div>

        <div className="aw-group">
          <span>{t("aw.sectionOverview")}</span>
          <button
            className={tab === "overview" ? "aw-link on" : "aw-link"}
            onClick={() => setTab("overview")}
          >
            {t("ap.tabOverview")}
          </button>
          <button
            className={tab === "traffic" ? "aw-link on" : "aw-link"}
            onClick={() => setTab("traffic")}
          >
            {t("ap.tabTraffic")}
          </button>
        </div>

        <div className="aw-group">
          <span>{t("aw.sectionPeople")}</span>
          <button
            className={tab === "users" ? "aw-link on" : "aw-link"}
            onClick={() => setTab("users")}
          >
            {t("ap.tabUsers")}
          </button>
        </div>

        <div className="aw-group">
          <span>{t("aw.sectionSystem")}</span>
          <button
            className={tab === "audit" ? "aw-link on" : "aw-link"}
            onClick={() => setTab("audit")}
          >
            {t("ap.tabAudit")}
          </button>
        </div>
      </nav>

      <div className="aw-main">
        {error && <ErrorNote message={error} />}

        {tab === "users" ? (
          <>
            <div className="aw-head">
              <h1 className="aw-h1">{t("ap.tabUsers")}</h1>
              <span className="faint">
                {overview?.total_registered ?? 0} {t("aw.people")}
              </span>
            </div>
            <AdminUsers />
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
            {traffic && <TrafficPanel data={traffic} />}
          </>
        ) : (
          <>
            <div className="aw-head">
              <h1 className="aw-h1">{t("ap.tabOverview")}</h1>
            </div>
            {/* Its own row: inside the flex head the filter grid collapses to a
                single column and leaves a hole under the title. */}
            <div style={{ marginBottom: 18 }}>
              <FilterBar value={filters} onChange={setFilters} />
            </div>

            {/* The audience, in the order a coordinator asks about it. */}
            <div className="aw-metrics">
              {(
                [
                  [t("aw.total"), overview?.total_registered ?? 0, null, false],
                  [
                    t("aw.active30"),
                    overview?.active_users ?? 0,
                    `${Math.round(((overview?.active_users ?? 0) / cohort) * 100)}% ${t("aw.ofTotal")}`,
                    false,
                  ],
                  [
                    t("aw.onboarded"),
                    overview?.onboarding_completed ?? 0,
                    `${Math.round(((overview?.onboarding_completed ?? 0) / cohort) * 100)}% ${t("aw.ofTotal")}`,
                    false,
                  ],
                  [t("aw.assessed"), kpiOf("assessment_completion")?.numerator ?? 0, null, false],
                  [t("aw.completed"), overview?.programs_completed ?? 0, null, false],
                  [
                    t("aw.results"),
                    (overview?.employed_via_edu_job ?? 0) +
                      (overview?.businesses_via_invest_hub ?? 0) +
                      (overview?.sellers_via_commerce ?? 0),
                    null,
                    true,
                  ],
                  [t("aw.atRisk"), overview?.at_risk_users ?? 0, null, false],
                  [t("ad.avgScore"), overview?.avg_development_score ?? 0, null, true],
                ] as Array<[string, number, string | null, boolean]>
              ).map(([label, value, note, accent]) => (
                <div key={label} className={accent ? "aw-metric aw-metric-accent" : "aw-metric"}>
                  <span className="aw-metric-value">{value}</span>
                  <span className="aw-metric-label">{label}</span>
                  {note && <span className="aw-metric-note">{note}</span>}
                </div>
              ))}
            </div>

            <div className="aw-cols">
              <div className="aw-card">
                <div className="aw-card-title">{t("aw.funnel")}</div>
                <div className="aw-funnel">
                  {funnel.map(([label, value]) => (
                    <div key={label} className="aw-stage">
                      <span className="aw-stage-label">{label}</span>
                      <span className="aw-stage-value">{value}</span>
                      <span className="aw-stage-bar">
                        <span style={{ width: `${Math.min(100, (value / cohort) * 100)}%` }} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="aw-card">
                <div className="aw-card-title">{t("aw.geography")}</div>
                <div className="aw-funnel">
                  {regions.slice(0, 10).map((row) => (
                    <div key={row.region} className="aw-stage">
                      <span className="aw-stage-label">{t(regionKey(row.region))}</span>
                      <span className="aw-stage-value">{row.users}</span>
                      <span className="aw-stage-bar">
                        <span style={{ width: `${(row.users / maxRegion) * 100}%` }} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="aw-card" style={{ marginTop: 12 }}>
              <div className="aw-card-title">{t("ad.kpiTitle")}</div>
              <div className="aw-metrics" style={{ marginBottom: 0 }}>
                {kpi?.kpis.map((item) => (
                  <div key={item.key} className="aw-metric">
                    <span className="aw-metric-value">{item.value}%</span>
                    <span className="aw-metric-label">{t(kpiKey(item.key))}</span>
                    <span className="aw-metric-note">
                      {item.numerator} / {item.denominator}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/** Section 09 lists these filters; the dashboard and KPI endpoints already
 *  accept them, so wiring them here costs one query parameter each. */
function FilterBar({
  value,
  onChange,
}: {
  value: AdminFilters;
  onChange: (next: AdminFilters) => void;
}) {
  const { t } = useI18n();
  const REGIONS = [
    "tashkent_city", "tashkent_region", "andijan", "bukhara", "fergana",
    "jizzakh", "karakalpakstan", "kashkadarya", "khorezm", "namangan",
    "navoi", "samarkand", "sirdarya", "surkhandarya",
  ];
  const dirty = Object.values(value).some(Boolean);

  return (
    <div className="filter-bar">
      <label className="field">
        <span className="label">{t("ap.dateFrom")}</span>
        <input
          type="date"
          className="input"
          value={value.date_from ?? ""}
          onChange={(e) => onChange({ ...value, date_from: e.target.value || undefined })}
        />
      </label>
      <label className="field">
        <span className="label">{t("ap.dateTo")}</span>
        <input
          type="date"
          className="input"
          value={value.date_to ?? ""}
          onChange={(e) => onChange({ ...value, date_to: e.target.value || undefined })}
        />
      </label>
      <label className="field">
        <span className="label">{t("ap.colRegion")}</span>
        <select
          className="input"
          value={value.region ?? ""}
          onChange={(e) => onChange({ ...value, region: e.target.value || undefined })}
        >
          <option value="">{t("ap.allRegions")}</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{t(regionKey(r))}</option>
          ))}
        </select>
      </label>
      {dirty && (
        <button className="btn btn-ghost btn-sm" onClick={() => onChange({})}>
          {t("ap.reset")}
        </button>
      )}
    </div>
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
