"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getAccessToken } from "@/services/api";
import { portal, type Opportunity, type OpportunityMatch } from "@/services/portal";
import { EdRow, EdRows, Empty, ErrorNote, Loading } from "@/components/ui";
import { useI18n } from "@/i18n";
import { daysLeft, money, regionKey, sourceKey, typeKey } from "@/utils/format";

const SOURCE_BADGE: Record<string, string> = {
  edu_job: "badge", invest_hub: "badge badge-gold",
  commerce: "badge badge-gold", internal: "badge badge-grey",
};

function reward(value: Record<string, unknown>, locale: string): string | null {
  if (typeof value.salary_from === "number") {
    const to = typeof value.salary_to === "number" ? ` – ${money(value.salary_to, "UZS", locale)}` : "";
    return `${money(value.salary_from, "UZS", locale)}${to}`;
  }
  if (typeof value.amount === "number") return `${money(value.amount, "UZS", locale)} +`;
  if (typeof value.stipend === "number") return money(value.stipend, "UZS", locale);
  const first = Object.values(value)[0];
  return typeof first === "string" ? first : null;
}

/** ?type=vacancy — where the counters on the landing page land. A number a
 *  visitor just read is a promise; clicking it has to show her exactly the
 *  rows it counted, not the whole catalogue. */
function OpportunitiesView() {
  const { t, tx, locale } = useI18n();
  const query = useSearchParams();
  const typeFilter = query.get("type");
  const regionFilter = query.get("region");

  /** Filters compose: narrowing by region must not silently drop the type the
   *  visitor arrived with, and clearing one must not clear the other. */
  function href(patch: { type?: string | null; region?: string | null }): string {
    const next = new URLSearchParams();
    const type = patch.type !== undefined ? patch.type : typeFilter;
    const region = patch.region !== undefined ? patch.region : regionFilter;
    if (type) next.set("type", type);
    if (region) next.set("region", region);
    const q = next.toString();
    return q ? `/imkoniyatlar?${q}` : "/imkoniyatlar";
  }

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [matches, setMatches] = useState<OpportunityMatch[]>([]);
  const [all, setAll] = useState<Opportunity[]>([]);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    setAuthed(Boolean(token));
    if (!token) {
      // The catalogue itself is public — the API says so, the nav offers this
      // page to visitors, and a vacancy with a salary on it is the most
      // convincing thing the portal can show someone who has not signed up.
      // Only matching, consent and applying wait for an account.
      portal
        .opportunitiesPublic({ size: 50, type: typeFilter ?? undefined })
        .then((page) => setAll(page.items))
        .catch(() => setAll([]))
        .finally(() => setLoading(false));
      return;
    }

    Promise.all([
      portal.recommended().catch(() => []),
      // Same page size and same type filter as the visitor's view: a signed-in
      // user was seeing 20 of the 24 listings a visitor could see, and the
      // region counts below are only honest over the whole filtered set.
      portal
        .opportunitiesPublic({ size: 50, type: typeFilter ?? undefined })
        .then((p) => p.items)
        .catch(() => []),
      portal.consentStatus().catch(() => ({})),
      portal.myApplications().catch(() => []),
    ]).then(([m, a, c, apps]) => {
      setMatches(m); setAll(a); setConsents(c);
      setApplied(new Set((apps as { opportunity_id: string }[]).map((x) => x.opportunity_id)));
      setLoading(false);
    });
  }, [typeFilter]);

  async function grant(scope: string) {
    try {
      await portal.setConsent(scope, true);
      setConsents(await portal.consentStatus());
      setNote(t("op.okConsent"));
    } catch { setError(t("op.errConsent")); }
  }

  async function apply(opportunity: Opportunity) {
    setError(null); setNote(null);
    try {
      await portal.apply(opportunity.id);
      setApplied((prev) => new Set(prev).add(opportunity.id));
      setNote(t("op.okApplied"));
    } catch (err) {
      const message = err && typeof err === "object" && "status" in err && err.status === 403
        ? t("op.errNoConsent")
        : t("op.errApply");
      setError(message);
    }
  }

  if (loading) return <main className="wrap page"><Loading rows={4} /></main>;

  const consentRows = [
    ["edu_job", "share_edu_job", t("src.edu_job"), t("op.hintEduJob")],
    ["invest_hub", "share_invest_hub", t("src.invest_hub"), t("op.hintInvest")],
    ["commerce", "share_commerce", t("src.commerce"), t("op.hintCommerce")],
  ];

  const recommendedIds = new Set(matches.map((m) => m.id));
  const inType = (o: Opportunity) => !typeFilter || o.type === typeFilter;
  const inRegion = (o: Opportunity) => !regionFilter || o.region === regionFilter;
  const inFilter = (o: Opportunity) => inType(o) && inRegion(o);
  const shownMatches = matches.filter(inFilter);
  const others = all.filter((o) => !recommendedIds.has(o.id) && inFilter(o));

  const regionCounts = new Map<string, number>();
  for (const item of all) {
    if (!item.region || !inType(item)) continue;
    regionCounts.set(item.region, (regionCounts.get(item.region) ?? 0) + 1);
  }
  const regions = [...regionCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  function Row({
    item, match, index,
  }: { item: Opportunity; match?: OpportunityMatch; index: number }) {
    const left = daysLeft(item.deadline);
    const has = applied.has(item.id);
    const allowed = item.source === "internal" || consents[item.source] === true;
    const pay = reward(item.reward, locale);

    return (
      <EdRow
        index={index}
        arrow={false}
        title={tx(item.title_i18n)}
        badges={
          <>
            <span className={SOURCE_BADGE[item.source] ?? "badge"}>
              {t(sourceKey(item.source))}
            </span>
            <span className="badge badge-grey">{t(typeKey(item.type))}</span>
            {left !== null && left <= 20 && (
              <span className="badge badge-red">{left} {t("op.daysLeft")}</span>
            )}
          </>
        }
        meta={
          <>
            {item.organisation ?? "—"} ·{" "}
            {item.region ? t(regionKey(item.region)) : t("op.wholeCountry")}
            {pay && <> · <strong style={{ color: "var(--success)" }}>{pay}</strong></>}
            {match && match.missing_skills.length > 0 && (
              <> · {t("op.missing")} {match.missing_skills.join(", ")}</>
            )}
          </>
        }
        side={
          <>
            {match && (
              <span className="faint" style={{ whiteSpace: "nowrap" }}>
                {t("op.match")} {Math.round(match.match_score * 100)}%
              </span>
            )}
            {authed ? (
              <button
                className={
                  has ? "btn btn-ghost btn-sm"
                    : allowed ? "btn btn-primary btn-sm"
                    : "btn btn-outline btn-sm"
                }
                onClick={() => apply(item)}
                disabled={has}
                title={allowed ? undefined : t("op.consentFirst")}
              >
                {has ? `✓ ${t("op.applied")}` : allowed ? t("op.apply") : t("op.consentNeeded")}
              </button>
            ) : (
              /* A visitor reads the listing in full; the account is asked for
                 at the one step that actually needs one. */
              <Link href="/login" className="btn btn-outline btn-sm">
                {t("op.signInToApply")}
              </Link>
            )}
          </>
        }
      />
    );
  }

  return (
    <main className="wrap page stack" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: 6 }}>
        <span className="eyebrow">{t("nav.opportunities")}</span>
        <h1>{t("op.title")}</h1>
        <p className="muted" style={{ maxWidth: 640 }}>{t("op.subtitle")}</p>
        {(typeFilter || regionFilter) && (
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            {typeFilter && <span className="badge">{t(typeKey(typeFilter))}</span>}
            {regionFilter && <span className="badge">{t(regionKey(regionFilter))}</span>}
            <Link href="/imkoniyatlar" className="btn btn-soft btn-sm">
              {t("op.clearFilter")}
            </Link>
          </div>
        )}
      </div>

      {note && <div className="notice notice-green">{note}</div>}
      {error && <ErrorNote message={error} />}

      {regions.length > 1 && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="eyebrow">{t("op.byRegion")}</span>
          <div className="row" style={{ gap: 7, flexWrap: "wrap" }}>
            {regions.map(([region, count]) => (
              <Link
                key={region}
                href={href({ region: region === regionFilter ? null : region })}
                className={
                  region === regionFilter
                    ? "stat-pill stat-pill-link stat-pill-hot"
                    : "stat-pill stat-pill-link"
                }
              >
                {t(regionKey(region))} <strong>{count}</strong>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!authed && (
        <div className="notice spread" style={{ gap: 14, flexWrap: "wrap" }}>
          <span>{t("op.guestNote")}</span>
          <Link href="/login" className="btn btn-primary btn-sm">
            {t("op.guestCta")}
          </Link>
        </div>
      )}

      {/* Consent gate — no data leaves the platform without it. Nothing to
          consent to before there is an account to consent on behalf of. */}
      {authed && (
      <div className="card stack">
        <div className="stack" style={{ gap: 4 }}>
          <h2 style={{ fontSize: "1.12rem" }}>{t("op.consentTitle")}</h2>
          <p className="muted small">
            {t("op.consentLead")}
          </p>
        </div>

        <div className="grid grid-3">
          {consentRows.map(([key, scope, title, hint]) => {
            const given = consents[key] === true;
            return (
              <div key={key} className="card card-tint stack" style={{ gap: 8, padding: 15 }}>
                <div className="spread">
                  <strong className="small">{title}</strong>
                  <span className={given ? "badge badge-green" : "badge badge-grey"}>
                    {t(given ? "op.given" : "op.notGiven")}
                  </span>
                </div>
                <p className="faint">{hint}</p>
                {!given && (
                  <button className="btn btn-outline btn-sm" onClick={() => grant(scope)}>
                    {t("op.grant")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {shownMatches.length > 0 && (
        <div className="stack">
          <h2 style={{ fontSize: "1.15rem" }}>{t("op.recommended")}</h2>
          <EdRows>
            {shownMatches.slice(0, 6).map((match, index) => (
              <Row key={match.id} item={match} match={match} index={index + 1} />
            ))}
          </EdRows>
        </div>
      )}

      <div className="stack">
        <h2 style={{ fontSize: "1.15rem" }}>{t("op.allTitle")}</h2>
        {others.length === 0 && shownMatches.length === 0 ? (
          <Empty title={t("op.none")} />
        ) : (
          <EdRows>
            {others.map((item, index) => (
              <Row key={item.id} item={item} index={index + 1} />
            ))}
          </EdRows>
        )}
      </div>
    </main>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<main className="wrap page"><Loading rows={4} /></main>}>
      <OpportunitiesView />
    </Suspense>
  );
}
