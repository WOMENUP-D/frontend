"use client";

/**
 * Achievements — the record of what the learning has already added up to.
 *
 * The numbers come first because they are the honest part: streaks and hours
 * are measured, badges are only a nicer way of saying the same thing. Her
 * longest streak sits beside the current one on purpose — a personal record is
 * the one comparison worth showing her, and it belongs to her.
 *
 * The decision worth defending is the second group. Badges she has not earned
 * are listed in full, with their names and their conditions, under a heading
 * that says "not yet" rather than "locked" — because the only useful thing an
 * unearned badge can do is tell her what the next step is. So no padlocks and
 * no silhouettes: the CSS dims the card and that is the whole treatment. A
 * screen about progress should never be the place that makes her feel behind.
 *
 * Nothing here is a call to action, so this screen spends no bold surface at
 * all — the dashboard owns that, and a trophy case does not need a button.
 */

import Link from "next/link";
import { useI18n } from "@/i18n";
import {
  achievements,
  learner,
  learningStats,
  type Achievement,
} from "@/content/learning";
import { useMockData } from "@/components/learning/useMockData";
import {
  EmptyState,
  ErrorState,
  PageHead,
  SectionHead,
  Skeleton,
  StatCard,
  monthKey,
} from "@/components/learning/ui";

export default function AchievementsPage() {
  const { t } = useI18n();

  const { data, loading, error, retry } = useMockData(() => ({
    // Most recent first: the last thing she earned is the one she came to see.
    earned: achievements
      .filter((item) => item.earnedOn)
      .sort((a, b) => (a.earnedOn! < b.earnedOn! ? 1 : -1)),
    ahead: achievements.filter((item) => !item.earnedOn),
    stats: {
      streak: learner.streakDays,
      longest: learner.longestStreakDays,
      hours: learner.learningHours,
      completed: learningStats.completed,
    },
  }));

  const head = <PageHead title={t("lms.ach.title")} lead={t("lms.ach.lead")} />;

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
        <div className="lms-stats" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={86} radius={14} />
          ))}
        </div>
        <div className="lms-sec">
          <div className="lms-badges" aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} height={176} radius={18} />
            ))}
          </div>
        </div>
      </>
    );
  }

  const { earned, ahead, stats } = data;

  return (
    <>
      {head}

      {/* ---- the measured facts, before the badges ------------------- */}
      <div className="lms-stats">
        <StatCard
          value={`${stats.streak} ${t("lms.days")}`}
          label={t("lms.stats.streak")}
        />
        <StatCard
          value={`${stats.longest} ${t("lms.days")}`}
          label={t("lms.ach.longest")}
        />
        <StatCard
          value={`${stats.hours}${t("common.hours").slice(0, 1)}`}
          label={t("lms.stats.hours")}
        />
        <StatCard value={stats.completed} label={t("lms.stats.completed")} />
      </div>

      {earned.length === 0 && ahead.length === 0 ? (
        <div className="lms-sec">
          <EmptyState
            title={t("lms.ach.empty")}
            hint={t("lms.ach.emptyHint")}
            action={
              <Link className="lms-btn lms-btn-primary" href="/talim/kurslar">
                {t("lms.courses.explore")}
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/* ---- what she has ---------------------------------------- */}
          <section className="lms-sec">
            <SectionHead title={t("lms.ach.earned")} />
            {earned.length ? (
              <div className="lms-badges">
                {earned.map((item) => (
                  <Trophy key={item.id} achievement={item} />
                ))}
              </div>
            ) : (
              <EmptyState title={t("lms.ach.empty")} hint={t("lms.ach.emptyHint")} />
            )}
          </section>

          {/* ---- what is next, described the same way ---------------- */}
          {ahead.length > 0 && (
            <section className="lms-sec">
              <SectionHead title={t("lms.ach.locked")} />
              <div className="lms-badges">
                {ahead.map((item) => (
                  <Trophy key={item.id} achievement={item} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

/* ---- pieces ---------------------------------------------------------- */

/** One badge. Earned or not is read off the data, not passed in, so the two
 *  groups can never disagree with the dates they display. */
function Trophy({ achievement }: { achievement: Achievement }) {
  const { t, tx } = useI18n();
  const earnedOn = achievement.earnedOn;

  return (
    <article className={`lms-trophy ${earnedOn ? "" : "lms-trophy-locked"}`}>
      <span className="lms-trophy-mark" aria-hidden="true">{achievement.emblem}</span>
      <h3 className="lms-trophy-title">{tx(achievement.title)}</h3>
      <p className="lms-trophy-desc">{tx(achievement.description)}</p>
      {earnedOn && (
        // Pushed to the bottom so the dates line up across a row of cards.
        <span className="lms-stat-label" style={{ marginTop: "auto" }}>
          {t("lms.ach.earnedOn")}: <EarnedDate date={earnedOn} />
        </span>
      )}
    </article>
  );
}

/** The month comes out of the message catalogue rather than `Intl`, which is
 *  the portal's existing habit: it is the one source that also covers the
 *  Cyrillic Uzbek script, where a BCP-47 tag would fall back to Latin. */
function EarnedDate({ date }: { date: string }) {
  const { t } = useI18n();
  const parsed = new Date(`${date}T00:00:00`);
  return (
    <time dateTime={date}>
      {parsed.getDate()} {t(monthKey(parsed.getMonth() + 1))} {parsed.getFullYear()}
    </time>
  );
}
