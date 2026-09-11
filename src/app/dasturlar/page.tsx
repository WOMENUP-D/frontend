"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/services/api";
import { portal, type Program } from "@/services/portal";
import { Empty, ErrorNote, Loading } from "@/components/ui";
import Link from "next/link";
import { useI18n, type MessageKey } from "@/i18n";
import { categoryKey, formatKey, pluralKey } from "@/utils/format";
import { Shelf } from "@/components/Shelf";

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

export default function ProgramsPage() {
  const { t, tx, locale } = useI18n();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  // What is actually asked of the server. Typing "бухгалтерия" fired eleven
  // requests and the list flickered under her hands on every one of them.
  const [query, setQuery] = useState("");
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    setLoading(true);
    const params = new URLSearchParams({ size: "50" });
    if (category) params.set("category", category);
    if (query) params.set("search", query);

    portal.programs(`?${params}`)
      .then((page) => setPrograms(page.items))
      .catch(() => setError(t("pr.errLoad")))
      .finally(() => setLoading(false));
  }, [category, query]);

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
    } catch { setError(t("pr.errEnroll")); }
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

        <div className="cat-filters">
          {CATEGORIES.map((key) => (
            <button
              key={key || "all"}
              onClick={() => setCategory(key)}
              className={category === key ? "chip chip-on" : "chip"}
            >
              {key ? t(categoryKey(key)) : t("common.all")}
            </button>
          ))}
        </div>
      </header>

      <div className="cat-results stack" style={{ gap: 14 }}>
          {error && <ErrorNote message={error} />}
          {loading && <Loading rows={3} />}

          {!loading && programs.length === 0 && (
            <Empty title={t("pr.notFound")} hint={t("pr.notFoundHint")} />
          )}

          {!loading && programs.length > 0 && (
            <div className="cat-bar">
              <span className="faint cat-count">
                {t("pr.found").replace("{n}", String(programs.length))}
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

          {shelf ? <Shelf programs={programs} /> : (
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
                      one — an enrol button inside a clickable card is a trap. */}
                  <h3 className="prog-title">
                    <Link href={`/dasturlar/${program.id}`}>{tx(program.title_i18n)}</Link>
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
                      <Link className="btn btn-outline btn-sm" href={`/dasturlar/${program.id}`}>
                        {t("pr.details")}
                      </Link>
                      {authed && (
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
          )}
      </div>
    </main>
  );
}
