"use client";

/**
 * The course catalogue — everything she has started, finished, or could start.
 *
 * These are the portal's real programmes, the same ones `/dasturlar` sells:
 * there is one course system, and this is the screen she studies them from.
 *
 * The filter chips carry their counts. That is the decision worth defending:
 * a filter whose result is empty says so *before* it is pressed, so nobody
 * taps "Completed" to be told there is nothing there. It also turns the row
 * into a one-line summary of where she stands — three in progress, one done —
 * which is the question this page is really asked.
 *
 * No bold surface here. The dashboard already spends the section's one
 * near-black card on "Continue learning"; a catalogue is a wall of equals, and
 * a second hero would just pick a winner among courses she has not chosen yet.
 */

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n";
import { portal, type EnrollmentDetail, type Page, type Program } from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import { viewOf, type CourseStatus } from "@/components/learning/course";
import {
  CourseCard,
  EmptyState,
  ErrorState,
  PageHead,
  SkeletonCards,
  statusKey,
} from "@/components/learning/ui";

type Filter = "all" | CourseStatus;

const FILTERS: Filter[] = ["all", "in_progress", "completed", "not_started"];

/* Sort order, not the catalogue's own: what is half-finished is what she came
   back for, and a course already completed is the least urgent thing on the
   page. Within a group the catalogue order stands. */
const RANK: Record<CourseStatus, number> = {
  in_progress: 0,
  not_started: 1,
  completed: 2,
};

export default function CoursesPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");

  const { data, loading, error, retry } = useApi(async () => {
    // Her enrollments decide what each card says; a visitor simply sees the
    // catalogue, so a missing session is not an error here.
    const [catalogue, mine] = await Promise.all([
      portal.programs("?size=60") as Promise<Page<Program>>,
      portal.myEnrollments().catch(() => [] as EnrollmentDetail[]),
    ]);
    const byProgram = new Map(mine.map((item) => [item.program_id, item]));
    const list = catalogue.items
      .map((program) => viewOf(program, byProgram.get(program.id) ?? null))
      .sort((a, b) => RANK[a.status] - RANK[b.status]);

    const counts: Record<Filter, number> = {
      all: list.length,
      in_progress: 0,
      completed: 0,
      not_started: 0,
    };
    for (const view of list) counts[view.status] += 1;
    return { list, counts };
  });

  const head = <PageHead title={t("lms.courses.title")} lead={t("lms.courses.lead")} />;

  if (error) {
    return (
      <>
        {head}
        <ErrorState onRetry={retry} />
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        {head}
        <SkeletonCards rows={6} />
      </>
    );
  }

  const visible =
    filter === "all" ? data.list : data.list.filter((view) => view.status === filter);

  return (
    <>
      {head}

      {/* Real buttons, not links: the filter is view state, not a destination.
          `aria-pressed` is what tells a screen reader which one is on. */}
      <div className="lms-chips" style={{ marginBottom: 20 }}>
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            className={`lms-chip ${filter === option ? "lms-chip-on" : ""}`}
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
          >
            {option === "all" ? t("lms.courses.all") : t(statusKey(option))}{" "}
            <span className="lms-chip-n">{data.counts[option]}</span>
          </button>
        ))}
      </div>

      <section className="lms-sec" style={{ marginTop: 0 }}>
        {visible.length ? (
          <div className="lms-courses">
            {visible.map((view) => (
              <CourseCard key={view.program.id} view={view} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("lms.courses.empty")}
            hint={t("lms.courses.emptyHint")}
            action={
              /* Only offered when it would change something — an empty
                 catalogue is not fixed by clearing a filter already cleared. */
              filter !== "all" ? (
                <button
                  type="button"
                  className="lms-btn lms-btn-primary"
                  onClick={() => setFilter("all")}
                >
                  {t("lms.courses.all")}
                </button>
              ) : (
                <Link className="lms-btn lms-btn-primary" href="/dasturlar">
                  {t("lms.courses.explore")}
                </Link>
              )
            }
          />
        )}
      </section>
    </>
  );
}
