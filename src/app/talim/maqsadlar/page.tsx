"use client";

/**
 * Her learning goals.
 *
 * A goal on this screen is never just a percentage — it carries the reason she
 * wrote it down and the steps it breaks into, because a bare "68%" tells her
 * nothing she can act on this evening, while "finish the Spring Boot module"
 * does. So the reason and the steps sit inside the card, not behind a link.
 *
 * The one decision worth defending: the percentage is DERIVED from the steps
 * and the stored `goal.percent` is ignored. The dataset carries both, and they
 * disagree — a goal with one of two steps ticked says 75%. The same rule that
 * governs course progress applies here: one source of truth, and it is the one
 * she can change. Ticking a step therefore moves the number immediately, which
 * is the whole point of a checklist.
 */

import { useState } from "react";
import { useI18n } from "@/i18n";
import { goals, learner, type Goal } from "@/content/learning";
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

  /* Ticks live in the component until there is an endpoint to send them to.
     Keyed as `${goalId}:${index}` and read as an override on the dataset, so
     nothing has to be seeded when the data lands and a reload honestly
     forgets — better than pretending a change was saved. */
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const toggle = (key: string, current: boolean) =>
    setTicks((previous) => ({ ...previous, [key]: !current }));

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
        {/* Shaped like the real split, so the page does not jump. */}
        <div className="lms-split">
          <div className="lms-col">
            <Skeleton height={300} radius={18} />
            <Skeleton height={218} radius={18} />
          </div>
          <div className="lms-col">
            <Skeleton height={148} radius={18} />
          </div>
        </div>
      </>
    );
  }

  const { items, weekly } = data;

  return (
    <>
      <Head />

      <div className="lms-split">
        <div className="lms-col">
          {items.length ? (
            items.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                ticks={ticks}
                onToggle={toggle}
              />
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

        <div className="lms-col">
          {/* The weekly target is a habit, not a goal — it never finishes, so it
              stays out of the list and keeps its own small card. */}
          <section className="lms-card lms-card-pad">
            <SectionHead title={t("lms.goal.weekly")} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <strong style={{ fontSize: "0.95rem", whiteSpace: "nowrap" }}>
                {weekly.done} / {weekly.target} {t("common.hours")}
              </strong>
              <div style={{ flex: 1 }}>
                <Bar
                  percent={weekly.target ? (weekly.done / weekly.target) * 100 : 0}
                  done={weekly.done >= weekly.target}
                />
              </div>
            </div>
            <span className="lms-stat-label">{t("lms.stats.streak")}: {learner.streakDays} {t("lms.days")}</span>
          </section>
        </div>
      </div>
    </>
  );
}

/* ---- pieces ---------------------------------------------------------- */

function Head() {
  const { t } = useI18n();
  return <PageHead title={t("lms.goals.title")} lead={t("lms.goals.lead")} />;
}

function GoalCard({
  goal,
  ticks,
  onToggle,
}: {
  goal: Goal;
  ticks: Record<string, boolean>;
  onToggle: (key: string, current: boolean) => void;
}) {
  const { t, tx } = useI18n();

  const steps = goal.steps.map((step, index) => {
    const key = `${goal.id}:${index}`;
    return { key, title: step.title, done: ticks[key] ?? step.done };
  });
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
        <ul className="lms-steps">
          {steps.map((step) => (
            <li key={step.key} className={step.done ? "lms-step-done" : undefined}>
              <button
                type="button"
                className="lms-step lms-step-btn"
                aria-pressed={step.done}
                onClick={() => onToggle(step.key, step.done)}
              >
                {/* The glyph lives in the markup and is hidden by colour until
                    the step is done — that is what `.lms-step-done .lms-tick`
                    reveals. */}
                <span className="lms-tick" aria-hidden="true">✓</span>
                <span>{tx(step.title)}</span>
              </button>
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
