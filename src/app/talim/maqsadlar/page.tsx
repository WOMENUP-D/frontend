"use client";

/**
 * Her learning goals — her own, from `/users/me/goals`. (QA B-05)
 *
 * This screen used to read the design-time fixtures in `@/content/learning`:
 * every new account opened it to someone else's "Backend developer 25%", a
 * twelve-day streak and six of eight weekly hours. A stranger's progress shown
 * as hers is worse than an empty page, so everything here is now read from or
 * written to the API, and an account with no goals sees an empty state and a
 * form to set the first one.
 *
 * A goal is something she says, not something the platform measures, so the
 * one thing she can assert on it is "achieved" — and she can remove a goal she
 * no longer holds. The streak beside them is the server's count of the days
 * she actually studied, the same number the achievements page shows.
 */

import { useState, type FormEvent } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { portal, type ActivitySummary, type Goal } from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import {
  Badge,
  EmptyState,
  ErrorState,
  NeedsAccount,
  PageHead,
  Skeleton,
  monthKey,
} from "@/components/learning/ui";

/** The horizons the API accepts that have a label already (1m is the plan's). */
const HORIZONS = ["3m", "6m", "12m", "36m"] as const;

export default function GoalsPage() {
  const { t } = useI18n();

  const { data, loading, error, unauthorised, retry } = useApi(async () => {
    const [goals, activity] = await Promise.all([
      portal.goals(),
      portal.activity().catch(() => null as ActivitySummary | null),
    ]);
    return { goals, activity };
  });

  const [extra, setExtra] = useState<Goal[]>([]);
  const [changed, setChanged] = useState<Record<string, Goal | null>>({});
  const [failed, setFailed] = useState(false);

  if (unauthorised) {
    return (
      <>
        <Head />
        <NeedsAccount />
      </>
    );
  }

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
        <div style={{ marginBottom: 22 }}>
          <Skeleton height={96} radius={18} />
        </div>
        <div className="lms-goal-grid">
          <Skeleton height={160} radius={18} />
          <Skeleton height={160} radius={18} />
        </div>
      </>
    );
  }

  // Server rows, with what she changed on this visit laid over them —
  // `null` marks a goal she removed.
  const goals = [...data.goals, ...extra]
    .map((goal) => (goal.id in changed ? changed[goal.id] : goal))
    .filter((goal): goal is Goal => goal !== null);

  async function toggle(goal: Goal) {
    setFailed(false);
    try {
      const next = await portal.updateGoal(goal.id, { achieved: !goal.achieved });
      setChanged((prev) => ({ ...prev, [goal.id]: next }));
    } catch {
      setFailed(true);
    }
  }

  async function remove(goal: Goal) {
    setFailed(false);
    try {
      await portal.deleteGoal(goal.id);
      setChanged((prev) => ({ ...prev, [goal.id]: null }));
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <Head />

      <section className="lms-card lms-card-pad lms-weekly">
        <div className="lms-weekly-main">
          <NewGoal onCreated={(goal) => setExtra((prev) => [...prev, goal])} />
        </div>
        {/* Her real streak, counted by the server from what she did. */}
        <div className="lms-weekly-streak">
          <b>{data.activity?.current_streak ?? 0}</b>
          <span>{t("lms.goal.streak")}</span>
        </div>
      </section>

      {failed && (
        <p className="lms-form-error" role="alert">
          {t("lms.goals.saveFailed")}
        </p>
      )}

      <div className="lms-goal-grid">
        {goals.length ? (
          goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onToggle={() => toggle(goal)}
              onRemove={() => remove(goal)}
            />
          ))
        ) : (
          <EmptyState mark="◎" title={t("lms.goals.empty")} hint={t("lms.goals.emptyHintReal")} />
        )}
      </div>
    </>
  );
}

/* ---- pieces ---------------------------------------------------------- */

function Head() {
  const { t } = useI18n();
  return <PageHead title={t("lms.goals.title")} lead={t("lms.goals.leadReal")} />;
}

function NewGoal({ onCreated }: { onCreated: (goal: Goal) => void }) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>("3m");
  const [targetDate, setTargetDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const goal = await portal.createGoal({
        title: clean.slice(0, 255),
        horizon,
        target_date: targetDate || null,
      });
      onCreated(goal);
      setTitle("");
      setTargetDate("");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="lms-goal-form" onSubmit={submit}>
      <label className="lms-field lms-goal-form-title">
        <span className="lms-field-label">{t("lms.goals.new")}</span>
        <input
          className="lms-input"
          value={title}
          maxLength={255}
          required
          placeholder={t("lms.goals.placeholder")}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="lms-field">
        <span className="lms-field-label">{t("lms.goals.horizon")}</span>
        <select
          className="lms-input"
          value={horizon}
          onChange={(event) => setHorizon(event.target.value as (typeof HORIZONS)[number])}
        >
          {HORIZONS.map((value) => (
            <option key={value} value={value}>
              {t(`hor.${value}` as MessageKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="lms-field">
        <span className="lms-field-label">{t("lms.goals.byDate")}</span>
        <input
          className="lms-input"
          type="date"
          value={targetDate}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(event) => setTargetDate(event.target.value)}
        />
      </label>
      <button type="submit" className="lms-btn lms-btn-primary" disabled={busy || !title.trim()}>
        {t("lms.goals.add")}
      </button>
      {failed && (
        <p className="lms-form-error" role="alert">
          {t("lms.goals.saveFailed")}
        </p>
      )}
    </form>
  );
}

function GoalCard({
  goal, onToggle, onRemove,
}: { goal: Goal; onToggle: () => void; onRemove: () => void }) {
  const { t } = useI18n();
  return (
    <article className="lms-card lms-card-pad" style={{ display: "grid", gap: 14 }}>
      <h2 className="lms-goal-title">{goal.title}</h2>
      {goal.description && <p className="lms-lead" style={{ margin: 0 }}>{goal.description}</p>}

      <div className="lms-course-meta">
        <span>{t(`hor.${goal.horizon}` as MessageKey)}</span>
        {goal.target_date && (
          <span>
            {t("lms.goal.target")}: <TargetDate date={goal.target_date} />
          </span>
        )}
        {goal.achieved && <Badge tone="done">{t("lms.goals.achieved")}</Badge>}
      </div>

      <div className="row" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className={`lms-btn lms-btn-sm ${goal.achieved ? "lms-btn-quiet" : "lms-btn-primary"}`}
          onClick={onToggle}
          aria-pressed={goal.achieved}
        >
          {goal.achieved ? t("lms.goals.reopen") : t("lms.goals.markAchieved")}
        </button>
        <button type="button" className="lms-btn lms-btn-sm lms-btn-quiet" onClick={onRemove}>
          {t("lms.goals.remove")}
        </button>
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
