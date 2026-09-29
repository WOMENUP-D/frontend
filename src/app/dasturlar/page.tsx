"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/services/api";
import { portal, type Program } from "@/services/portal";
import { Empty, ErrorNote, Loading } from "@/components/ui";
import Link from "next/link";
import { useI18n, type MessageKey } from "@/i18n";
import { categoryKey, formatKey, pluralKey } from "@/utils/format";
import { Shelf } from "@/components/Shelf";
import { PartnerCourses } from "@/components/PartnerCourses";

const CATEGORIES = [
  "", "vocational_skills", "financial_literacy", "entrepreneurship",
  "parenting", "health", "leadership", "legal_literacy",
  "international", "digital_safety",
];

/* The bar on each card is a length compared against the longest thing on
   offer, so the scale has to be the catalogue's own maximum rather than a
   round number — twelve weeks is the English course, and it is what "long"
   means here. */
const MAX_WEEKS = 12;

/** Enough to fill a screen twice over, small enough to arrive on a phone. */
const PAGE_SIZE = 24;

/** Whose site a course lives on, read off its address rather than stored twice. */
function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function ProgramsPage() {
  const { t, tx, locale } = useI18n();
  const [programs, setPrograms] = useState<Program[]>([]);
  /* How many the catalogue holds for this filter, and how many pages of them
     have been asked for. Before this the page showed the first fifty and said
     "50 found" — with 794 in the catalogue that is both a small lie and 744
     courses nobody could reach. */
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  // What is actually asked of the server. Typing "бухгалтерия" fired eleven
  // requests and the list flickered under her hands on every one of them.
  const [query, setQuery] = useState("");
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  /* Whether the catalogue holds anything at all, asked once and without
     filters. With an empty catalogue every category answers "nothing found —
     try another filter", and no filter can end that loop. */
  const [catalogueHasAny, setCatalogueHasAny] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
    /* The key, not the sentence. Translating at the moment the request fails
     froze whatever language was current then — and the locale is restored from
     storage in an effect, so a request that failed first put an Uzbek sentence
     on a Russian page. Kept as a key, it is translated on every render and
     follows the language switch. */
  const [error, setError] = useState<MessageKey | null>(null);
  const [authed, setAuthed] = useState(false);
  /* The grid stays the default: it carries the figures people compare on.
     The shelf is the second reading — the catalogue as a body of work. */
  const [shelf, setShelf] = useState(false);

  useEffect(() => { setAuthed(Boolean(getAccessToken())); }, []);

  /* The six direction cards on the landing page each name a category, so the
     catalogue has to arrive already filtered — otherwise every one of them
     lands on the same undifferentiated list and the choice she just made is
     thrown away. Read from the address itself rather than through
     `useSearchParams`, which would push this page behind a Suspense boundary
     for one string available on mount. */
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("category");
    if (wanted && CATEGORIES.includes(wanted)) setCategory(wanted);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    portal
      .programs("?size=1")
      .then((page) => setCatalogueHasAny((page.total ?? page.items.length) > 0))
      .catch(() => setCatalogueHasAny(null));
  }, []);

  /** One page of the catalogue for the filters as they stand. */
  function pageQuery(number: number) {
    const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(number) });
    if (category) params.set("category", category);
    if (query) params.set("search", query);
    return `?${params}`;
  }

  useEffect(() => {
    setLoading(true);
    setPage(1);
    portal.programs(pageQuery(1))
      .then((result) => {
        setPrograms(result.items);
        setTotal(result.total);
      })
      .catch(() => setError("pr.errLoad"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, query]);

  /** The next page, appended — the list she is reading does not jump. */
  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const result = await portal.programs(pageQuery(next));
      setPrograms((current) => [...current, ...result.items]);
      setTotal(result.total);
      setPage(next);
    } catch {
      setError("pr.errLoad");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!getAccessToken()) return;
    portal.myEnrollments()
      .then((rows) => setEnrolled(
        new Set((rows as { program_id: string }[]).map((r) => r.program_id))
      ))
      .catch(() => undefined);
  }, []);

  async function enroll(program: Program) {
    try {
      await portal.enroll(program.id);
      setEnrolled((prev) => new Set(prev).add(program.id));
    } catch { setError("pr.errEnroll"); }
  }

  return (
    <main className="wrap page">
      {/* Search sits in the middle of the page with the results directly under
          it, so a woman looking for "бухгалтерия" reads down instead of across
          into a column she has to find first. */}
      <header className="cat-head stack">
        <span className="eyebrow">{t("nav.programs")}</span>
        <h1 className="cat-title">{t("pr.title")}</h1>
        <p className="muted">{t("pr.subtitle")}</p>

        <input
          className="input input-lg cat-search"
          placeholder={t("pr.search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          type="search"
          aria-label={t("pr.search")}
        />

        {/* The row scrolls sideways on a phone, so the chosen category can sit
            off-screen — after arriving from a direction card it always did. */}
        <div className="cat-filters cat-scroll">
          {CATEGORIES.map((key) => (
            <button
              key={key || "all"}
              ref={(node) => {
                if (node && category === key) {
                  node.scrollIntoView({ block: "nearest", inline: "center" });
                }
              }}
              onClick={() => setCategory(key)}
              className={category === key ? "chip chip-on" : "chip"}
              aria-pressed={category === key}
            >
              {key ? t(categoryKey(key)) : t("common.all")}
            </button>
          ))}
        </div>
      </header>

      <div className="cat-results stack" style={{ gap: 14 }}>
          {error && <ErrorNote message={t(error)} />}
          {loading && <Loading rows={3} />}

          {/* One message at a time, and only when it is true.
              A failed request used to print both "could not load the
              programmes" and "nothing found — try another filter", which are
              different things. And "try another filter" is only advice worth
              giving when a filter is on: with an empty catalogue it sent a
              reader round a loop that no tap could end, so the page goes
              straight to the courses below instead. */}
          {!loading && !error && programs.length === 0 && (category || query)
            && catalogueHasAny !== false && (
              <Empty title={t("pr.notFound")} hint={t("pr.notFoundHint")} />
            )}

          {!loading && programs.length > 0 && (
            <div className="cat-bar">
              <span className="faint cat-count">
                {t("pr.found").replace("{n}", String(total || programs.length))}
              </span>
              <div className="cat-view" role="group" aria-label={t("shelf.view")}>
                <button
                  type="button"
                  aria-pressed={!shelf}
                  onClick={() => setShelf(false)}
                >
                  {t("shelf.grid")}
                </button>
                <button
                  type="button"
                  aria-pressed={shelf}
                  onClick={() => setShelf(true)}
                >
                  {t("shelf.shelf")}
                </button>
              </div>
            </div>
          )}

          {/* An empty grid is still a grid: it held a row of blank space between
              the filters and what is actually on the page. */}
          {programs.length > 0 && (shelf ? <Shelf programs={programs} /> : (
          <div className="prog-grid">
            {programs.map((program) => {
              const isEnrolled = enrolled.has(program.id);
              const outcomes = program.learning_outcomes?.length ?? 0;
              return (
                <article key={program.id} className="prog-card" data-cat={program.category}>
                  {/* The category names itself in its own colour, which is the
                      same colour running along the top edge — so the grid can
                      be sorted by eye before a single title is read. */}
                  <span className="prog-cat">{t(categoryKey(program.category))}</span>

                  {/* The title is the link, so the whole card does not have to be
                      one — an enrol button inside a clickable card is a trap.
                      A course that is not ours links to where it actually is:
                      there is no page of ours to send her to, and finding that
                      out after the tap is worse than reading it before. */}
                  <h3 className="prog-title">
                    {program.external_url ? (
                      <a
                        href={program.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${tx(program.title_i18n)} — ${t("pc.opens")} ${hostOf(program.external_url)}`}
                      >
                        {tx(program.title_i18n)}
                      </a>
                    ) : (
                      <Link href={`/dasturlar/${program.id}`}>{tx(program.title_i18n)}</Link>
                    )}
                  </h3>
                  <p className="prog-goal">{tx(program.goal_i18n)}</p>

                  {/* Length as a shape and as figures. The bar is scaled against
                      the longest programme on offer, so "two weeks" and "twelve
                      weeks" differ before the numbers are read. */}
                  <div className="prog-meter">
                    {program.duration_weeks != null && (
                      <div className="prog-track">
                        <div
                          className="prog-fill"
                          style={{ width: `${Math.min(100, Math.round((program.duration_weeks / MAX_WEEKS) * 100))}%` }}
                        />
                      </div>
                    )}
                    <div className="prog-figs">
                      {program.duration_weeks != null && (
                        <span><b>{program.duration_weeks}</b> {t("common.weeks")}</span>
                      )}
                      {program.duration_hours != null && (
                        <span><b>{program.duration_hours}</b> {t("common.hours")}</span>
                      )}
                      {outcomes > 0 && (
                        <span><b>{outcomes}</b> {t(pluralKey("pr.outcome", outcomes, locale) as MessageKey)}</span>
                      )}
                    </div>
                  </div>

                  <div className="prog-foot">
                    <span className="prog-marks">
                      <span className="prog-fmt">{t(formatKey(program.format))}</span>
                      {program.has_certificate && (
                        <span className="prog-fmt prog-cert">{t("pr.certificate")}</span>
                      )}
                    </span>
                    <div className="prog-actions">
                      {program.external_url ? (
                        /* No "details" and no "enrol": we hold neither. What we
                           can honestly offer is the address it lives at. */
                        <a
                          className="btn btn-outline btn-sm"
                          href={program.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {hostOf(program.external_url)}
                          <span aria-hidden="true"> ↗</span>
                        </a>
                      ) : (
                        <Link className="btn btn-outline btn-sm" href={`/dasturlar/${program.id}`}>
                          {t("pr.details")}
                        </Link>
                      )}
                      {authed && !program.external_url && (
                        <button
                          className={isEnrolled ? "btn btn-ghost btn-sm" : "btn btn-primary btn-sm"}
                          onClick={() => enroll(program)}
                          disabled={isEnrolled}
                        >
                          {isEnrolled ? `✓ ${t("pr.enrolled")}` : t("pr.enroll")}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          ))}

          {!loading && programs.length > 0 && programs.length < total && (
            <div className="prog-more">
              <button className="btn btn-outline" onClick={loadMore} disabled={loadingMore}>
                {t(loadingMore ? "common.loading" : "pr.more")}
              </button>
              <span className="faint small">
                {t("pr.shown")
                  .replace("{n}", String(programs.length))
                  .replace("{total}", String(total))}
              </span>
            </div>
          )}

          <PartnerCourses />
      </div>
    </main>
  );
}
