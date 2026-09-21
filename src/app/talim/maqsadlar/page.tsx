"use client";

/**
 * Her learning goals.
 *
 * A goal on this screen is never just a percentage — it carries the reason she
 * wrote it down and the steps it breaks into, because a bare "68%" tells her
 * nothing she can act on this evening, while "finish the Spring Boot module"
 * does. So the reason and the steps sit inside the card, not behind a link.
 *
 * The one decision worth defending: nothing on this screen is claimed, it is
 * all read. The percentage is derived from the steps, and each step is derived
 * from the lessons, the streak or the weekly hours that complete it — the
 * stored `goal.percent` and the old tick boxes are both gone. Ticking used to
 * let her mark "finish the Spring Boot module" done without opening it, which
 * made this the one screen in the section where progress was a claim rather
 * than a fact. Finishing a lesson now moves the goal, and the two cannot
 * disagree because there is only one of them.
 *
 * The steps the platform genuinely cannot see — refreshing a CV, sending an
 * application — say so. Showing them as merely unfinished would be a guess
 * dressed as a reading.
 */

import { useI18n } from "@/i18n";
import { goalStepState, goals, learner, type Goal } from "@/content/learning";
import { useMockData } from "@/components/learning/useMockData";
import {
  Bar,
  EmptyState,
  ErrorState,
  PageHead,
  SectionHead,
  Skeleton,
  monthKey,
} from "@/components/learning/ui";

export default function GoalsPage() {
  const { t } = useI18n();

  const { data, loading, error, retry } = useMockData(() => ({
    items: goals,
    weekly: { done: learner.weeklyDoneHours, target: learner.weeklyTargetHours },
  }));

  if (error) {
    return (
      <>
        <Head />
        <ErrorState onRetry={retry} />
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        <Head />
        {/* Shaped like the real page, so nothing jumps when it lands. */}
        <div style={{ marginBottom: 22 }}>
          <Skeleton height={96} radius={18} />
        </div>
        <div className="lms-goal-grid">
          <Skeleton height={330} radius={18} />
          <Skeleton height={330} radius={18} />
        </div>
      </>
    );
  }

  const { items, weekly } = data;

  return (
    <>
      <Head />

      {/* The weekly target sits above the goals, not beside them. It is the
          one figure she checks every day, and in a side column it was pushed
          level with the first card and lost — while taking the width the
          goals needed to sit two to a row. */}
      <section className="lms-card lms-card-pad lms-weekly">
        <div className="lms-weekly-main">
          <SectionHead title={t("lms.goal.weekly")} />
          <div className="lms-weekly-bar">
            <strong>
              {weekly.done} / {weekly.target} {t("common.hours")}
            </strong>
            <div style={{ flex: 1 }}>
              <Bar
                percent={Math.min(100, Math.round((weekly.done / weekly.target) * 100))}
                done={weekly.done >= weekly.target}
              />
            </div>
          </div>
        </div>
        <div className="lms-weekly-streak">
          <b>{learner.streakDays}</b>
          <span>{t("lms.goal.streak")}</span>
        </div>
      </section>

      <div className="lms-goal-grid">
        {items.length ? (
            items.map((goal) => (
<GoalCard key={goal.id} goal={goal} />
            ))
          ) : (
            <EmptyState
              mark="◎"
              title={t("lms.goals.empty")}
              hint={t("lms.goals.emptyHint")}
              /* Disabled rather than linked: there is no goal editor yet, and a
                 button that lands nowhere costs more trust than one that is
                 visibly not ready. It becomes live with the create endpoint. */
              action={
                <button type="button" className="lms-btn lms-btn-primary" disabled>
                  {t("lms.goals.add")}
                </button>
              }
            />
          )}
      </div>
    </>
  );
}

/* ---- pieces ---------------------------------------------------------- */

function Head() {
  const { t } = useI18n();
  return <PageHead title={t("lms.goals.title")} lead={t("lms.goals.lead")} />;
}

function GoalCard({ goal }: { goal: Goal }) {
  const { t, tx } = useI18n();

  const steps = goal.steps.map((step, index) => ({
    key: `${goal.id}:${index}`,
    ...goalStepState(step),
  }));
  const doneCount = steps.filter((step) => step.done).length;
  const percent = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  return (
    <article className="lms-card lms-card-pad" style={{ display: "grid", gap: 18 }}>
      <h2 className="lms-goal-title">{tx(goal.title)}</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span className="lms-goal-pct">{percent}%</span>
        <div style={{ flex: 1 }}>
          <Bar percent={percent} done={percent === 100} />
        </div>
      </div>

      <dl className="lms-facts">
        <div className="lms-fact">
          <dt>{t("lms.goal.why")}</dt>
          <dd>{tx(goal.why)}</dd>
        </div>
        <div className="lms-fact">
          <dt>{t("lms.goal.target")}</dt>
          <dd>
            <TargetDate date={goal.targetDate} />
          </dd>
        </div>
      </dl>

      <div>
        <span className="lms-stat-label" style={{ marginTop: 0, marginBottom: 10 }}>
          {t("lms.goal.steps")} · {doneCount} / {steps.length}
        </span>
        {/* A reading, not a control. Nothing here is clickable, because
            nothing here is hers to assert — the lessons decide. */}
        <ul className="lms-steps">
          {steps.map((step) => (
            <li
              key={step.key}
              className={[
                step.done ? "lms-step-done" : "",
                step.tracked ? "" : "lms-step-untracked",
              ].join(" ").trim() || undefined}
            >
              <span className="lms-step">
                <span className="lms-tick" aria-hidden="true">✓</span>
                <span className="lms-step-text">{tx(step.title)}</span>
                {step.tracked ? (
                  step.detail && <span className="lms-step-detail">{step.detail}</span>
                ) : (
                  <span className="lms-step-detail">{t("lms.goal.manual")}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/** The catalogue's own month names rather than `Intl`: they are already
 *  declined for Russian, and they survive the Cyrillic Uzbek script that no
 *  locale tag covers. */
function TargetDate({ date }: { date: string }) {
  const { t } = useI18n();
  const parsed = new Date(`${date}T00:00:00`);
  return (
    <time dateTime={date}>
      {parsed.getDate()} {t(monthKey(parsed.getMonth() + 1))} {parsed.getFullYear()}
    </time>
  );
}
