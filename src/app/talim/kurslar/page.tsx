"use client";

/**
 * The course catalogue — everything she has started, finished, or could start.
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

import { useState } from "react";
import { useI18n } from "@/i18n";
import { courses, courseStatus, type CourseStatus } from "@/content/learning";
import { useMockData } from "@/components/learning/useMockData";
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

/* Sort order, not the dataset's own: what is half-finished is what she came
   back for, and a course already completed is the least urgent thing on the
   page. Within a group the dataset order stands. */
const RANK: Record<CourseStatus, number> = {
  in_progress: 0,
  not_started: 1,
  completed: 2,
};

export default function CoursesPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");

  const { data, loading, error, retry } = useMockData(() => {
    const list = [...courses].sort(
      (a, b) => RANK[courseStatus(a)] - RANK[courseStatus(b)],
    );
    const counts: Record<Filter, number> = {
      all: list.length,
      in_progress: 0,
      completed: 0,
      not_started: 0,
    };
    for (const course of list) counts[courseStatus(course)] += 1;
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
    filter === "all"
      ? data.list
      : data.list.filter((course) => courseStatus(course) === filter);

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
            {visible.map((course) => (
              <CourseCard key={course.slug} course={course} />
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
              ) : undefined
            }
          />
        )}
      </section>
    </>
  );
}
