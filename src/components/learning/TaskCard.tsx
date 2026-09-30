"use client";

/**
 * One practical task, as she sees it in a list.
 *
 * The status is the loudest thing on the card, because it is the only thing
 * that changes what she should do next — and it is always the server's word.
 * "Waiting for assessment" is a real state with its own tone, distinct from
 * both passed and failed: the work is done and nobody has looked yet, and
 * dressing that as either would be a lie in one direction or the other.
 *
 * Status is never carried by colour alone. Every badge says its state in
 * words, which is what a screen reader announces and what survives a phone in
 * bright sun.
 */

import Link from "next/link";
import { useI18n, type MessageKey } from "@/i18n";
import type { PracticalTask, TaskStatus } from "@/services/portal";
import { Badge, levelKey } from "@/components/learning/ui";

export const taskStatusKey = (status: TaskStatus | null) =>
  `prac.st.${status ?? "available"}` as MessageKey;

/** Passed reads as done, needs-improvement as something to act on, and
 *  waiting as neither — it is not her move. */
export function TaskBadge({ status }: { status: TaskStatus | null }) {
  const { t } = useI18n();
  const tone =
    status === "passed"
      ? "done"
      : status === "needs_improvement"
        ? "warn"
        : status === "started" || status === "submitted"
          ? "live"
          : "neutral";
  return <Badge tone={tone}>{t(taskStatusKey(status))}</Badge>;
}

/** The one action the card offers, which is always the honest next move. */
export function taskActionKey(task: PracticalTask): MessageKey {
  if (task.status === "needs_improvement") return "prac.retry";
  if (task.status === "started") return "prac.continue";
  if (task.status === null) return "prac.start";
  return "prac.open";
}

export function TaskCard({ task }: { task: PracticalTask }) {
  const { t, tx } = useI18n();
  const gained = task.new_skills.length ? task.new_skills : task.skills;

  return (
    <article className="lms-task">
      <div className="lms-task-top">
        <h3 className="lms-course-title">
          <Link href={`/talim/amaliyot/${task.slug}`}>{tx(task.title_i18n)}</Link>
        </h3>
        <TaskBadge status={task.status} />
      </div>

      {tx(task.summary_i18n) && <p className="lms-path-lead">{tx(task.summary_i18n)}</p>}

      {gained.length > 0 && (
        <div className="lms-chips">
          {gained.slice(0, 3).map((skill) => (
            <span key={skill.slug ?? skill.label} className="lms-chip lms-chip-static">
              {tx(skill.name_i18n) || skill.label}
            </span>
          ))}
        </div>
      )}

      <div className="lms-task-foot">
        <span className="lms-rec-stats">
          {task.level && <span>{t(levelKey(task.level))}</span>}
          {task.estimated_minutes ? (
            <span>
              {task.estimated_minutes} {t("prac.minutes")}
            </span>
          ) : null}
          {task.attempts > 1 && (
            <span>
              {task.attempts} {t("prac.attempts")}
            </span>
          )}
        </span>
        <Link
          className="lms-btn lms-btn-quiet lms-btn-sm"
          href={`/talim/amaliyot/${task.slug}`}
          style={{ marginLeft: "auto" }}
        >
          {t(taskActionKey(task))}
        </Link>
      </div>
    </article>
  );
}
