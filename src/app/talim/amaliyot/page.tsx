"use client";

/**
 * Practice: the tasks she can do, and the ones she is already doing.
 *
 * Her own work leads, and only when there is any. Within it the order is what
 * needs her: something an evaluator told her how to fix, then something half
 * finished, then what is waiting on somebody else, then what is done. That
 * order is the server's — the same one `/practical-tasks/me` returns — so the
 * page and the Coach cannot disagree about what she should look at.
 *
 * Filtering happens in the browser over one fetch, as it does on the course
 * and path catalogues. The chips are built from what the catalogue actually
 * holds, so there is never a filter that leads nowhere.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { portal, type PracticalTaskDetail } from "@/services/portal";
import { getAccessToken } from "@/services/api";
import { useApi } from "@/components/learning/useApi";
import { TaskCard } from "@/components/learning/TaskCard";
import {
  EmptyState,
  ErrorState,
  PageHead,
  SectionHead,
  SkeletonCards,
  levelKey,
} from "@/components/learning/ui";

export default function PracticePage() {
  const { t, tx } = useI18n();
  const [level, setLevel] = useState("all");
  const [query, setQuery] = useState("");

  const { data, loading, error, retry } = useApi(async () => {
    const [all, mine] = await Promise.all([
      portal.practicalTasks(),
      getAccessToken()
        ? portal.myPracticalTasks().catch(() => [] as PracticalTaskDetail[])
        : Promise.resolve([] as PracticalTaskDetail[]),
    ]);
    return { all, mine };
  });

  const head = <PageHead title={t("prac.title")} lead={t("prac.lead")} />;
  const all = useMemo(() => data?.all ?? [], [data]);

  /* What she has already touched is shown above in full; repeating it below
     would make the page read as twice as many tasks as exist. */
  const rest = useMemo(() => {
    const touched = new Set((data?.mine ?? []).map((task) => task.id));
    return all.filter((task) => !touched.has(task.id));
  }, [all, data]);

  const levels = useMemo(
    () => [...new Set(rest.map((task) => task.level).filter(Boolean))] as string[],
    [rest],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rest.filter((task) => {
      if (level !== "all" && task.level !== level) return false;
      if (!needle) return true;
      return [
        tx(task.title_i18n),
        tx(task.summary_i18n),
        ...task.skills.map((skill) => tx(skill.name_i18n) || skill.label),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rest, level, query, tx]);

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
        <SkeletonCards rows={4} height={190} />
      </>
    );
  }

  const mine = data.mine;

  return (
    <>
      {head}

      {mine.length > 0 && (
        <section className="lms-sec" style={{ marginTop: 0 }}>
          <SectionHead title={t("prac.mine")} />
          <div className="lms-tasks">
            {mine.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      <section className="lms-sec" style={mine.length ? undefined : { marginTop: 0 }}>
        <SectionHead title={t("prac.all")} />

        {rest.length > 1 && (
          <div className="lms-path-filters">
            <input
              className="lms-path-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("prac.search")}
              aria-label={t("prac.search")}
            />
            {levels.length > 1 && (
              <div className="lms-chips">
                <Chip label={t("common.all")} on={level === "all"} onPress={() => setLevel("all")} />
                {levels.map((value) => (
                  <Chip
                    key={value}
                    label={t(levelKey(value))}
                    on={level === value}
                    onPress={() => setLevel(value)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {visible.length ? (
          <div className="lms-tasks">
            {visible.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : rest.length ? (
          <EmptyState
            title={t("prac.noMatch")}
            action={
              <button
                type="button"
                className="lms-btn lms-btn-primary"
                onClick={() => {
                  setLevel("all");
                  setQuery("");
                }}
              >
                {t("common.all")}
              </button>
            }
          />
        ) : (
          <EmptyState
            title={t("prac.empty")}
            hint={t("prac.emptyHint")}
            action={
              <Link className="lms-btn lms-btn-primary" href="/talim/kurslar">
                {t("lms.nav.courses")}
              </Link>
            }
          />
        )}
      </section>
    </>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      className={`lms-chip ${on ? "lms-chip-on" : ""}`}
      aria-pressed={on}
      onClick={onPress}
    >
      {label}
    </button>
  );
}
