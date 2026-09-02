"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/services/api";
import { portal, type Program } from "@/services/portal";
import { Empty, ErrorNote, Loading } from "@/components/ui";
import Link from "next/link";
import { useI18n } from "@/i18n";
import { categoryKey, formatKey } from "@/utils/format";

const CATEGORIES = [
  "", "vocational_skills", "financial_literacy", "entrepreneurship",
  "parenting", "health", "leadership", "legal_literacy",
  "international", "digital_safety",
];

export default function ProgramsPage() {
  const { t, tx } = useI18n();
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

  useEffect(() => { setAuthed(Boolean(getAccessToken())); }, []);

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
            <span className="faint cat-count">
              {t("pr.found").replace("{n}", String(programs.length))}
            </span>
          )}

          <div className="prog-grid">
            {programs.map((program) => {
              const isEnrolled = enrolled.has(program.id);
              return (
                <article key={program.id} className="prog-card">
                  <div className="prog-tags">
                    <span className="badge">{t(categoryKey(program.category))}</span>
                    <span className="badge badge-grey">{t(formatKey(program.format))}</span>
                    {program.has_certificate && (
                      <span className="badge badge-gold">{t("pr.certificate")}</span>
                    )}
                  </div>

                  {/* The title is the link, so the whole card does not have to be
                      one — an enrol button inside a clickable card is a trap. */}
                  <h3 className="prog-title">
                    <Link href={`/dasturlar/${program.id}`}>{tx(program.title_i18n)}</Link>
                  </h3>
                  <p className="prog-goal">{tx(program.goal_i18n)}</p>

                  <div className="prog-foot">
                    <span className="prog-hours">
                      {program.duration_hours ?? "—"} {t("common.hours")}
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
      </div>
    </main>
  );
}
