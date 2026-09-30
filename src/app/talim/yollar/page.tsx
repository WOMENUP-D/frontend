"use client";

/**
 * Learning paths: the routes through the catalogue, and the ones she is on.
 *
 * A path is not a course and must not be sold as one. The card says what the
 * route leaves her able to do and how many courses that takes, because the
 * question this screen answers is "where would this get me", not "what is in
 * week three" — that question belongs to the course page, one tap in.
 *
 * Her own routes come first, and only when she has any. A section headed "My
 * learning paths" above an empty box is a screen telling her she has failed at
 * something she has not been offered yet; the catalogue below is the offer.
 *
 * Filtering is done in the browser over one fetch, exactly as the course
 * catalogue does it: a handful of routes does not need a request per keystroke.
 * The chips are built from the values the catalogue actually holds, so there is
 * never a filter that leads nowhere.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { portal, type LearningPathDetail } from "@/services/portal";
import { getAccessToken } from "@/services/api";
import { useApi } from "@/components/learning/useApi";
import {
  EmptyState,
  ErrorState,
  PageHead,
  PathCard,
  SectionHead,
  SkeletonCards,
  levelKey,
} from "@/components/learning/ui";
import { dimensionKey } from "@/utils/format";

export default function PathsPage() {
  const { t, tx } = useI18n();
  const [dimension, setDimension] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [query, setQuery] = useState("");

  const { data, loading, error, retry } = useApi(async () => {
    // The catalogue is public; her own routes need a session, and not having
    // one is an answer rather than a failure.
    const [all, mine] = await Promise.all([
      portal.learningPaths(),
      getAccessToken()
        ? portal.myLearningPaths().catch(() => [] as LearningPathDetail[])
        : Promise.resolve([] as LearningPathDetail[]),
    ]);
    return { all, mine };
  });

  const head = <PageHead title={t("lms.path.title")} lead={t("lms.path.lead")} />;

  const all = useMemo(() => data?.all ?? [], [data]);

  /* The routes she is already on are shown above, in full. Repeating them in
     the catalogue would make the page read as twice as many paths as exist —
     the catalogue's job here is what is still open to her. */
  const rest = useMemo(() => {
    const onIt = new Set((data?.mine ?? []).map((path) => path.id));
    return all.filter((path) => !onIt.has(path.id));
  }, [all, data]);

  /* Only the values the catalogue actually holds become chips. A filter for a
     level no path is pitched at is a dead end with a label on it. */
  const dimensions = useMemo(
    () => [...new Set(rest.map((path) => path.dimension).filter(Boolean))] as string[],
    [rest],
  );
  const levels = useMemo(
    () => [...new Set(rest.map((path) => path.level).filter(Boolean))] as string[],
    [rest],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rest.filter((path) => {
      if (dimension !== "all" && path.dimension !== dimension) return false;
      if (level !== "all" && path.level !== level) return false;
      if (!needle) return true;
      // Title, promise and what it teaches — a woman typing "biznes" is
      // describing where she wants to get to, not quoting a title.
      const haystack = [
        tx(path.title_i18n),
        tx(path.description_i18n),
        ...path.skills.map((skill) => tx(skill.name_i18n) || skill.label),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [rest, dimension, level, query, tx]);

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
        <SkeletonCards rows={4} height={210} />
      </>
    );
  }

  const mine = data.mine;

  return (
    <>
      {head}

      {mine.length > 0 && (
        <section className="lms-sec" style={{ marginTop: 0 }}>
          <SectionHead title={t("lms.path.mine")} />
          <div className="lms-paths">
            {mine.map((path) => (
              <PathCard key={path.id} path={path} />
            ))}
          </div>
        </section>
      )}

      <section className="lms-sec" style={mine.length ? undefined : { marginTop: 0 }}>
        <SectionHead title={t("lms.path.all")} />

        {rest.length > 1 && (
          <div className="lms-path-filters">
            <input
              className="lms-path-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("lms.path.search")}
              aria-label={t("lms.path.search")}
            />

            {/* Real buttons: a filter is view state, not a destination. */}
            <div className="lms-chips">
              <Chip label={t("common.all")} on={dimension === "all"} onPress={() => setDimension("all")} />
              {dimensions.map((value) => (
                <Chip
                  key={value}
                  label={t(dimensionKey(value))}
                  on={dimension === value}
                  onPress={() => setDimension(value)}
                />
              ))}
            </div>

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
          <div className="lms-paths">
            {visible.map((path) => (
              <PathCard key={path.id} path={path} />
            ))}
          </div>
        ) : rest.length ? (
          <EmptyState
            title={t("lms.path.noMatch")}
            action={
              <button
                type="button"
                className="lms-btn lms-btn-primary"
                onClick={() => {
                  setDimension("all");
                  setLevel("all");
                  setQuery("");
                }}
              >
                {t("common.all")}
              </button>
            }
          />
        ) : (
          /* No paths published at all — the honest answer, with the courses
             she can still take one at a time. */
          <EmptyState
            title={t(mine.length ? "lms.path.allTaken" : "lms.path.empty")}
            hint={t(mine.length ? "lms.path.allTakenHint" : "lms.path.emptyHint")}
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