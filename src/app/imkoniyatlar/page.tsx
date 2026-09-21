"use client";

/**
 * Jobs and opportunities: find one that fits, in a few seconds.
 *
 * One large search field, one row of kinds (vacancy, internship, grant…), and
 * the few filters the data can answer — region, skill, closed listings, and her
 * order. On a phone those sit behind one "Filters" button that opens a panel
 * with "Clear all" and "Show results"; on a wide screen they stay in a column
 * beside the results. Nothing is ranked or filtered in the browser: the server
 * does both, and counts every option with the other filters applied.
 *
 * Filters live in the address, so the landing page's counters (`?type=`), the
 * back button and a shared link all land on the same results.
 *
 * Open to visitors. Signed in, every card also says how much of it she has,
 * whether it is on her career direction, and where her application stands.
 */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { getAccessToken } from "@/services/api";
import {
  portal,
  type OpportunityCard,
  type OpportunityDiscover,
  type SkillGap,
} from "@/services/portal";
import { ErrorNote, Loading } from "@/components/ui";
import { regionKey, typeKey } from "@/utils/format";
import { JobCard } from "@/components/jobs/JobCard";
import { FilterControls, FilterSheet, type FilterValue } from "@/components/jobs/Filters";
import { activeFilters, fill } from "@/components/jobs/format";

const PAGE = 20;

function OpportunitiesView() {
  const { t, tx } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();

  const type = query.get("type");
  const region = query.get("region");
  const skill = query.get("skill");
  const q = query.get("q") ?? "";
  const closed = query.get("closed") === "1";
  const business = query.get("business") === "1";
  const sortParam = query.get("sort");
  const sort = sortParam === "match" || sortParam === "deadline" ? sortParam : null;

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [text, setText] = useState(q);
  const [data, setData] = useState<OpportunityDiscover | null>(null);
  const [items, setItems] = useState<OpportunityCard[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sheet, setSheet] = useState(false);

  useEffect(() => setAuthed(Boolean(getAccessToken())), []);

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(query.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, query, router],
  );

  // The box follows the address when it changes from outside — the back
  // button, a link — but not while she is typing into it.
  useEffect(() => {
    setText((prev) => (prev.trim() === q ? prev : q));
  }, [q]);

  // A word typed is committed after a short pause, so each keystroke is not a
  // request and the address does not churn.
  useEffect(() => {
    if (text.trim() === q) return;
    const timer = setTimeout(() => update({ q: text.trim() || null }), 350);
    return () => clearTimeout(timer);
  }, [text, q, update]);

  const load = useCallback(
    (nextPage: number) => {
      const append = nextPage > 1;
      if (append) setMore(true);
      else setLoading(true);
      setFailed(false);
      portal
        .discover({
          type,
          region,
          skill,
          search: q || null,
          include_closed: closed,
          business,
          sort,
          page: nextPage,
          size: PAGE,
        })
        .then((result) => {
          setData(result);
          setItems((prev) => (append ? [...prev, ...result.items] : result.items));
          setPage(nextPage);
        })
        .catch(() => setFailed(true))
        .finally(() => {
          setLoading(false);
          setMore(false);
        });
    },
    [type, region, skill, q, closed, business, sort],
  );

  useEffect(() => load(1), [load]);

  const signedIn = Boolean(data?.signed_in);
  const facets = data?.facets ?? { types: {}, regions: {}, skills: [] };
  const value: FilterValue = { region, skill, closed, sort };
  const filtersOn = activeFilters({ region, skill, closed });

  function change(next: Partial<FilterValue>) {
    update({
      ...("region" in next ? { region: next.region ?? null } : {}),
      ...("skill" in next ? { skill: next.skill ?? null } : {}),
      ...("closed" in next ? { closed: next.closed ? "1" : null } : {}),
      ...("sort" in next ? { sort: next.sort ?? null } : {}),
    });
  }

  function clearAll() {
    setText("");
    router.replace(pathname, { scroll: false });
  }

  const skillName = (key: string) => {
    const found = facets.skills.find((entry) => (entry.skill.slug ?? entry.skill.label) === key);
    return found ? tx(found.skill.name_i18n) || found.skill.label : key;
  };
  // Jobs and internships lead — they are what most women come here for — and
  // every other kind follows by how many listings it has.
  const LEAD = ["vacancy", "internship"];
  const kinds = Object.entries(facets.types).sort(
    (a, b) =>
      (LEAD.includes(a[0]) ? LEAD.indexOf(a[0]) : 9) -
        (LEAD.includes(b[0]) ? LEAD.indexOf(b[0]) : 9) || b[1] - a[1],
  );
  const allCount = kinds.reduce((sum, [, count]) => sum + count, 0);

  return (
    <main className="wrap page jb-page">
      <header className="jb-hero">
        <h1 className="jb-h1">{t("job.title")}</h1>
        <p className="jb-lead">{t("job.lead")}</p>

        <form
          role="search"
          className="jb-search"
          onSubmit={(event) => {
            event.preventDefault();
            update({ q: text.trim() || null });
          }}
        >
          <label htmlFor="jb-q" className="sr-only">
            {t("job.search")}
          </label>
          <svg className="jb-search-ico" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <circle cx="8.8" cy="8.8" r="5.8" />
            <path d="M13.2 13.2L17 17" />
          </svg>
          <input
            id="jb-q"
            type="search"
            className="jb-search-input"
            placeholder={t("job.searchHint")}
            value={text}
            onChange={(event) => setText(event.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          {text && (
            <button
              type="button"
              className="jb-search-clear"
              aria-label={t("job.searchClear")}
              onClick={() => {
                setText("");
                update({ q: null });
              }}
            >
              ×
            </button>
          )}
        </form>

        <nav className="jb-mine-links" aria-label={t("job.mine.title")}>
          {signedIn && data && (
            <>
              <Link href="/imkoniyatlar/arizalarim">
                {fill(t("job.myApplications"), { n: data.applications })}
              </Link>
              <Link href="/imkoniyatlar/arizalarim#saqlangan">
                {fill(t("job.mySaved"), { n: data.saved })}
              </Link>
            </>
          )}
          <Link href="/imkoniyatlar/biznes">{t("biz.entry")}</Link>
          <Link href="/tadbirlar">{t("nav.events")}</Link>
        </nav>
      </header>

      {authed === false && (
        <p className="jb-guest">
          {t("job.guest")}{" "}
          <Link href="/login" className="jb-inline-link">
            {t("car.signInCta")}
          </Link>
        </p>
      )}

      {kinds.length > 0 && (
        <div className="jb-kinds" role="group" aria-label={t("job.kinds")}>
          <button
            type="button"
            className="jb-kind-pill"
            aria-pressed={!type}
            onClick={() => update({ type: null })}
          >
            {t("common.all")} <span className="jb-kind-n">{allCount}</span>
          </button>
          {kinds.map(([kind, count]) => (
            <button
              key={kind}
              type="button"
              className="jb-kind-pill"
              aria-pressed={type === kind}
              onClick={() => update({ type: type === kind ? null : kind })}
            >
              {t(typeKey(kind))} <span className="jb-kind-n">{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="jb-layout">
        <aside className="jb-side" aria-label={t("job.filters")}>
          <h2 className="jb-side-title">{t("job.filters")}</h2>
          <FilterControls
            facets={facets}
            value={value}
            signedIn={signedIn}
            onChange={change}
            idPrefix="side"
          />
          {(filtersOn > 0 || type || q || business) && (
            <button type="button" className="btn btn-outline jb-clear" onClick={clearAll}>
              {t("job.clearAll")}
            </button>
          )}
        </aside>

        <section className="jb-results" aria-labelledby="jb-count">
          <div className="jb-results-head">
            <p className="jb-count" id="jb-count" role="status">
              {data ? (data.total === 1 ? t("job.countOne") : fill(t("job.count"), { n: data.total })) : ""}
            </p>
            <button type="button" className="btn btn-outline jb-filters-btn" onClick={() => setSheet(true)}>
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path d="M3 5h14M6 10h8M8.5 15h3" />
              </svg>
              {filtersOn ? fill(t("job.filtersOn"), { n: filtersOn }) : t("job.filters")}
            </button>
          </div>

          {(region || skill || closed || business) && (
            <ul className="jb-active" aria-label={t("job.filters")}>
              {business && <ActivePill label={t("biz.filter")} onRemove={() => update({ business: null })} />}
              {region && (
                <ActivePill label={t(regionKey(region))} onRemove={() => update({ region: null })} />
              )}
              {skill && <ActivePill label={skillName(skill)} onRemove={() => update({ skill: null })} />}
              {closed && <ActivePill label={t("job.closed")} onRemove={() => update({ closed: null })} />}
            </ul>
          )}

          {loading ? (
            <Loading rows={3} />
          ) : failed ? (
            <div className="stack" style={{ gap: 12 }}>
              <ErrorNote message={t("job.loadError")} />
              <button type="button" className="btn btn-outline" onClick={() => load(1)}>
                {t("lms.err.retry")}
              </button>
            </div>
          ) : items.length === 0 ? (
            <EmptyResults
              signedIn={signedIn}
              canBroaden={Boolean(filtersOn || type || q || business)}
              onBroaden={clearAll}
            />
          ) : (
            <>
              <ul className="jb-list">
                {items.map((item) => (
                  <JobCard key={item.id} item={item} signedIn={signedIn} />
                ))}
              </ul>
              {data && items.length < data.total && (
                <button
                  type="button"
                  className="btn btn-outline jb-more"
                  onClick={() => load(page + 1)}
                  disabled={more}
                >
                  {t("news.more")}
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <FilterSheet open={sheet} onClose={() => setSheet(false)} total={data?.total ?? 0} onClear={clearAll}>
        <FilterControls
          facets={facets}
          value={value}
          signedIn={signedIn}
          onChange={change}
          idPrefix="sheet"
        />
      </FilterSheet>
    </main>
  );
}

function ActivePill({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { t } = useI18n();
  return (
    <li>
      <button
        type="button"
        className="jb-active-pill"
        onClick={onRemove}
        aria-label={fill(t("job.remove"), { what: label })}
      >
        {label}
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}

/**
 * Nothing matched. Never an invented listing: the ways forward are real —
 * wider filters, a skill the live listings ask for with the course that
 * teaches it, the course she already started — or simply "check later".
 */
function EmptyResults({
  signedIn,
  canBroaden,
  onBroaden,
}: {
  signedIn: boolean;
  canBroaden: boolean;
  onBroaden: () => void;
}) {
  const { t, tx } = useI18n();
  const [gap, setGap] = useState<SkillGap | null>(null);
  const [course, setCourse] = useState<{ id: string; title_i18n: Record<string, string> } | null>(
    null,
  );

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    portal
      .mySkills()
      .then((profile) => live && setGap(profile.improve.find((item) => item.opportunities > 0 && item.program_id) ?? null))
      .catch(() => {});
    portal
      .recommendations()
      .then((recs) => {
        const step = recs.next_steps.find((item) => item.kind === "continue_program" && item.program);
        if (live && step?.program) setCourse({ id: step.program.id, title_i18n: step.program.title_i18n });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [signedIn]);

  return (
    <section className="jb-empty" aria-labelledby="jb-empty-h">
      <h2 id="jb-empty-h" className="jb-empty-title">
        {t("job.empty")}
      </h2>
      <p className="jb-empty-try">{t("job.empty.try")}</p>
      <ul className="jb-empty-list">
        {canBroaden && (
          <li>
            <button type="button" className="btn btn-primary" onClick={onBroaden}>
              {t("job.empty.broaden")}
            </button>
          </li>
        )}
        {gap && gap.program_id && (
          <li>
            <Link href={`/dasturlar/${gap.program_id}`} className="jb-empty-link">
              {fill(t("job.empty.skill"), { skill: tx(gap.skill.name_i18n) || gap.skill.label })}
              {" — "}
              {tx(gap.program_title_i18n)}
            </Link>
          </li>
        )}
        {course && (
          <li>
            <Link href={`/dasturlar/${course.id}`} className="jb-empty-link">
              {fill(t("job.empty.course"), { course: tx(course.title_i18n) })}
            </Link>
          </li>
        )}
        <li className="jb-empty-later">{t("job.empty.later")}</li>
      </ul>
    </section>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <main className="wrap page">
          <Loading rows={4} />
        </main>
      }
    >
      <OpportunitiesView />
    </Suspense>
  );
}
