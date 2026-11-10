"use client";

/**
 * The vacancy marketplace: real listings from the job board, found in a few
 * seconds.
 *
 * One search field, WomanUP's own quick picks (no experience, internship,
 * remote, part-time, junior), and the filters the board can answer — in a
 * column on a wide screen, behind one "Filters" button on a phone. Every
 * choice lives in the address, so a shared link, the back button and the
 * landing's shortcuts all land on the same results. The server does the
 * searching and the sorting; the browser arranges.
 *
 * Nothing here is invented: an empty answer is an empty state, a board that
 * is down is an error state with the reason, and every card says where its
 * listing came from.
 */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { ApiError } from "@/services/api";
import { portal, type Vacancy, type VacancyMeta, type VacancyPage } from "@/services/portal";
import { ErrorNote } from "@/components/ui";
import { FilterSheet } from "@/components/jobs/Filters";
import { Reveal } from "@/components/motion/Reveal";
import { VacancyFilterControls } from "@/components/vacancies/Filters";
import { VacancyCard, VacancyCardSkeleton } from "@/components/vacancies/VacancyCard";
import {
  activeFilterCount,
  categoryKey,
  employmentKey,
  experienceKey,
  fill,
  pickKey,
  searchParamsFor,
  sortKey,
  stateFromParams,
  workFormatKey,
  type VacancyFilterState,
} from "@/components/vacancies/format";
import { regionKey } from "@/utils/format";

const PAGE = 20;
const PICKS = ["no_experience", "internship", "remote", "part_time", "junior"] as const;
const SORTS = ["relevance", "recent", "salary"] as const;

type Failure = "error" | "unavailable" | "unconfigured";

function VacanciesView() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const state = useMemo(() => stateFromParams(new URLSearchParams(query.toString())), [query]);

  const [text, setText] = useState(state.q);
  const [meta, setMeta] = useState<VacancyMeta | null>(null);
  const [data, setData] = useState<VacancyPage | null>(null);
  const [items, setItems] = useState<Vacancy[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [failed, setFailed] = useState<Failure | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    portal.vacancies
      .meta()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  const update = useCallback(
    (patch: Record<string, string | string[] | null>) => {
      const next = new URLSearchParams(query.toString());
      for (const [key, value] of Object.entries(patch)) {
        next.delete(key);
        if (Array.isArray(value)) value.forEach((entry) => next.append(key, entry));
        else if (value) next.set(key, value);
      }
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, query, router],
  );

  useEffect(() => {
    setText((prev) => (prev.trim() === state.q ? prev : state.q));
  }, [state.q]);
  useEffect(() => {
    if (text.trim() === state.q) return;
    const timer = setTimeout(() => update({ q: text.trim() || null }), 350);
    return () => clearTimeout(timer);
  }, [text, state.q, update]);

  const load = useCallback(
    (nextPage: number) => {
      const append = nextPage > 1;
      if (append) setMore(true);
      else setLoading(true);
      setFailed(null);
      portal.vacancies
        .search(searchParamsFor(state, nextPage, PAGE))
        .then((result) => {
          setData(result);
          setItems((prev) => (append ? [...prev, ...result.items] : result.items));
          setPage(nextPage);
        })
        .catch((cause: unknown) => {
          const reason =
            cause instanceof ApiError
              ? (cause.detail as { reason?: string } | undefined)?.reason
              : undefined;
          setFailed(
            reason === "provider_unconfigured"
              ? "unconfigured"
              : reason === "provider_unavailable"
                ? "unavailable"
                : "error",
          );
        })
        .finally(() => {
          setLoading(false);
          setMore(false);
        });
    },
    [state],
  );
  useEffect(() => load(1), [load]);

  const filters: VacancyFilterState = state;
  const filtersOn = activeFilterCount(filters);
  const label = meta?.provider.label ?? "hh.uz";

  const change = useCallback(
    (next: Partial<VacancyFilterState>) =>
      update({
        ...("region" in next ? { region: next.region ?? null } : {}),
        ...("category" in next ? { category: next.category ?? null } : {}),
        ...("salaryFrom" in next ? { salary_from: next.salaryFrom ?? null } : {}),
        ...("onlyWithSalary" in next ? { with_salary: next.onlyWithSalary ? "1" : null } : {}),
        ...("experience" in next ? { experience: next.experience ?? null } : {}),
        ...("employment" in next ? { employment: next.employment ?? null } : {}),
        ...("workFormat" in next ? { work_format: next.workFormat ?? null } : {}),
      }),
    [update],
  );

  function togglePick(pick: string) {
    const picks = state.picks.includes(pick)
      ? state.picks.filter((entry) => entry !== pick)
      : [...state.picks, pick];
    update({ pick: picks });
  }

  function clearAll() {
    setText("");
    router.replace(pathname, { scroll: false });
  }

  const categoryName = (id: string) => {
    const key = categoryKey(id);
    const named = t(key);
    return named === key ? (meta?.categories.find((group) => group.id === id)?.name ?? id) : named;
  };
  const anything = Boolean(filtersOn || state.q || state.picks.length || state.sort);

  return (
    <main className="wrap page jb-page vc-page">
      <header className="jb-hero">
        <h1 className="jb-h1">{t("vac.title")}</h1>
        <p className="jb-lead">{t("vac.lead")}</p>

        <form
          role="search"
          className="jb-search"
          onSubmit={(event) => {
            event.preventDefault();
            update({ q: text.trim() || null });
          }}
        >
          <label htmlFor="vc-q" className="sr-only">
            {t("job.search")}
          </label>
          <svg className="jb-search-ico" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <circle cx="8.8" cy="8.8" r="5.8" />
            <path d="M13.2 13.2L17 17" />
          </svg>
          <input
            id="vc-q"
            type="search"
            className="jb-search-input"
            placeholder={t("vac.searchHint")}
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

        <div className="vc-picks" role="group" aria-label={t("vac.picks")}>
          {PICKS.map((pick) => (
            <button
              key={pick}
              type="button"
              className="jb-kind-pill vc-pick"
              aria-pressed={state.picks.includes(pick)}
              onClick={() => togglePick(pick)}
            >
              {t(pickKey(pick))}
            </button>
          ))}
        </div>

        <p className="vc-source">
          {fill(t("vac.sourceNote"), { label })}{" "}
          {meta && (
            <a href={meta.provider.site_url} target="_blank" rel="noopener noreferrer nofollow">
              {meta.provider.site_url.replace(/^https?:\/\//, "")}
            </a>
          )}
        </p>
      </header>

      <div className="jb-layout">
        <aside className="jb-side" aria-label={t("job.filters")}>
          <h2 className="jb-side-title">{t("job.filters")}</h2>
          <VacancyFilterControls meta={meta} value={filters} onChange={change} idPrefix="side" />
          {anything && (
            <button type="button" className="btn btn-outline jb-clear" onClick={clearAll}>
              {t("job.clearAll")}
            </button>
          )}
        </aside>

        <section className="jb-results" aria-labelledby="vc-count">
          <div className="jb-results-head vc-results-head">
            <p className="jb-count" id="vc-count" role="status">
              {data && !failed
                ? data.total === 1
                  ? t("vac.countOne")
                  : fill(t("vac.count"), { n: data.total })
                : ""}
            </p>
            <div className="vc-tools">
              <label className="vc-sort">
                <span className="sr-only">{t("job.sort")}</span>
                <select
                  className="jb-select"
                  value={state.sort ?? "relevance"}
                  onChange={(event) =>
                    update({ sort: event.target.value === "relevance" ? null : event.target.value })
                  }
                >
                  {SORTS.map((sort) => (
                    <option key={sort} value={sort}>
                      {t(sortKey(sort))}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn btn-outline jb-filters-btn" onClick={() => setSheet(true)}>
                <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="M3 5h14M6 10h8M8.5 15h3" />
                </svg>
                {filtersOn ? fill(t("job.filtersOn"), { n: filtersOn }) : t("job.filters")}
              </button>
            </div>
          </div>

          {filtersOn > 0 && (
            <ul className="jb-active" aria-label={t("job.filters")}>
              {state.region && (
                <Pill label={t(regionKey(state.region))} onRemove={() => change({ region: null })} />
              )}
              {state.category && (
                <Pill label={categoryName(state.category)} onRemove={() => change({ category: null })} />
              )}
              {state.salaryFrom && (
                <Pill
                  label={`${t("vac.salaryFrom").split(" (")[0]}: ${Number(state.salaryFrom).toLocaleString("uz-UZ")}`}
                  onRemove={() => change({ salaryFrom: null })}
                />
              )}
              {state.onlyWithSalary && (
                <Pill label={t("vac.withSalary")} onRemove={() => change({ onlyWithSalary: false })} />
              )}
              {state.experience && (
                <Pill label={t(experienceKey(state.experience))} onRemove={() => change({ experience: null })} />
              )}
              {state.employment && (
                <Pill label={t(employmentKey(state.employment))} onRemove={() => change({ employment: null })} />
              )}
              {state.workFormat && (
                <Pill label={t(workFormatKey(state.workFormat))} onRemove={() => change({ workFormat: null })} />
              )}
            </ul>
          )}

          {loading ? (
            <ul className="vc-list" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <VacancyCardSkeleton key={index} />
              ))}
            </ul>
          ) : failed ? (
            <div className="stack" style={{ gap: 12 }}>
              <ErrorNote
                message={t(
                  failed === "unconfigured"
                    ? "vac.unconfigured"
                    : failed === "unavailable"
                      ? "vac.unavailable"
                      : "vac.error",
                )}
              />
              <button type="button" className="btn btn-outline" onClick={() => load(1)}>
                {t("lms.err.retry")}
              </button>
            </div>
          ) : items.length === 0 ? (
            <section className="jb-empty" aria-labelledby="vc-empty-h">
              <h2 id="vc-empty-h" className="jb-empty-title">
                {t("vac.empty")}
              </h2>
              <p className="jb-empty-try">{t("vac.emptyHint")}</p>
              {anything && (
                <button type="button" className="btn btn-primary" onClick={clearAll}>
                  {t("job.empty.broaden")}
                </button>
              )}
            </section>
          ) : (
            <>
              <Reveal as="ul" className="vc-list" stagger>
                {items.map((item) => (
                  <VacancyCard key={item.id} item={item} />
                ))}
              </Reveal>
              {data && page < data.pages && (
                <button
                  type="button"
                  className="btn btn-outline jb-more"
                  onClick={() => load(page + 1)}
                  disabled={more}
                >
                  {t("common.more")}
                </button>
              )}
              <p className="vc-source vc-source-foot">
                {fill(t("vac.source"), { label })}
                {" · "}
                <Link href="/imkoniyatlar">{t("nav.opportunities")}</Link>
              </p>
            </>
          )}
        </section>
      </div>

      <FilterSheet open={sheet} onClose={() => setSheet(false)} total={data?.total ?? 0} onClear={clearAll}>
        <VacancyFilterControls meta={meta} value={filters} onChange={change} idPrefix="sheet" />
      </FilterSheet>
    </main>
  );
}

function Pill({ label, onRemove }: { label: string; onRemove: () => void }) {
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

export default function VacanciesPage() {
  return (
    <Suspense
      fallback={
        <main className="wrap page jb-page">
          <ul className="vc-list" aria-busy="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <VacancyCardSkeleton key={index} />
            ))}
          </ul>
        </main>
      }
    >
      <VacanciesView />
    </Suspense>
  );
}
