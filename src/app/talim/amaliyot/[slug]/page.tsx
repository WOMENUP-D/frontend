"use client";

/**
 * One practical task: the brief, the form, and what came back.
 *
 * The criteria sit above the form, not behind a link. Being marked against
 * something you were never told is the ordinary experience of assessment, and
 * it is avoidable — so the same list the evaluator works from is the list she
 * reads before she starts.
 *
 * Three states this page must never blur. **Waiting** is the work handed in
 * and nobody having looked yet; it is shown as its own thing rather than as a
 * pale pass. **Needs improvement** leads with the evaluator's own words and an
 * open retry, because somebody wrote down exactly what to change and that is
 * the most useful sentence on the platform. **Passed** names the skills the
 * work actually evidenced, and says in as many words that this is *assessed*
 * and not *verified* — a course and a task both teach the platform something,
 * and only a person outside it can vouch for her.
 *
 * Nothing here decides whether she passed. The form validates to save her a
 * round trip; the server validates because that is the only check that counts.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { getAccessToken, ApiError } from "@/services/api";
import { portal, type PracticalTaskDetail, type TaskAttempt } from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import { TaskBadge } from "@/components/learning/TaskCard";
import {
  Badge,
  EmptyState,
  ErrorState,
  NeedsAccount,
  SectionHead,
  Skeleton,
  SkeletonBlock,
  levelKey,
} from "@/components/learning/ui";

function fill(text: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (out, [name, value]) => out.split(`{${name}}`).join(String(value)),
    text,
  );
}

export default function PracticalTaskPage() {
  const { t, tx } = useI18n();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  /* Resolved after mount, not during render: a token is a browser fact, and
     reading it while rendering makes the server's HTML and the client's first
     pass disagree. `null` means "not known yet" and shows neither branch. */
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => setAuthed(Boolean(getAccessToken())), []);

  const { data, loading, error, retry } = useApi(() => portal.practicalTask(slug), [slug]);
  /* Every write returns the whole task, so the page moves to the server's new
     state rather than to one guessed here. */
  const [live, setLive] = useState<PracticalTaskDetail | null>(null);
  const task = live ?? data ?? null;

  if (error) {
    return (
      <>
        <Back />
        <ErrorState onRetry={retry} />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Back />
        <Skeleton height={120} radius={18} />
        <div style={{ marginTop: 22 }}>
          <SkeletonBlock rows={4} />
        </div>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <Back />
        <EmptyState
          title={t("prac.notFound")}
          hint={t("prac.notFoundHint")}
          action={
            <Link className="lms-btn lms-btn-primary" href="/talim/amaliyot">
              {t("prac.back")}
            </Link>
          }
        />
      </>
    );
  }

  const latest = task.my_attempts[0] ?? null;

  return (
    <>
      <Back />

      <header className="lms-head">
        <div className="lms-path-head">
          <h1 className="lms-h1">{tx(task.title_i18n)}</h1>
          <TaskBadge status={task.status} />
        </div>
        {tx(task.summary_i18n) && <p className="lms-lead">{tx(task.summary_i18n)}</p>}

        <div className="lms-rec-stats" style={{ marginTop: 14 }}>
          {task.level && <span>{t(levelKey(task.level))}</span>}
          {task.estimated_minutes ? (
            <span>
              {task.estimated_minutes} {t("prac.minutes")}
            </span>
          ) : null}
          {task.program_slug && (
            <span>
              {t("prac.fromCourse")}:{" "}
              <Link href={`/talim/kurslar/${task.program_slug}`}>
                {tx(task.program_title_i18n)}
              </Link>
            </span>
          )}
        </div>
      </header>

      <div className="lms-split">
        <div style={{ minWidth: 0 }}>
          <section style={{ marginBottom: 26 }}>
            <SectionHead title={t("prac.instructions")} />
            <p className="lms-task-prose">{tx(task.instructions_i18n)}</p>
          </section>

          {tx(task.outcome_i18n) && (
            <section style={{ marginBottom: 26 }}>
              <SectionHead title={t("prac.outcome")} />
              <p className="lms-task-prose">{tx(task.outcome_i18n)}</p>
            </section>
          )}

          {task.criteria.length > 0 && (
            <section style={{ marginBottom: 26 }}>
              <SectionHead title={t("prac.criteria")} />
              <ul className="lms-criteria">
                {task.criteria.map((criterion) => (
                  <li key={criterion.key}>{tx(criterion.text_i18n)}</li>
                ))}
              </ul>
            </section>
          )}

          {authed === false ? (
            <NeedsAccount />
          ) : (
            <>
              {task.status !== "passed" && task.status !== "submitted" && (
                <SubmitForm task={task} onDone={setLive} />
              )}
              {latest && <Result task={task} attempt={latest} />}
              {task.my_attempts.length > 1 && (
                <section className="lms-sec">
                  <SectionHead title={t("prac.yourWork")} />
                  <div style={{ display: "grid", gap: 14 }}>
                    {task.my_attempts.slice(1).map((attempt) => (
                      <Result key={attempt.id} task={task} attempt={attempt} past />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <aside className="lms-side-panel">
          <div className="lms-card lms-card-pad" style={{ display: "grid", gap: 14 }}>
            <SectionHead title={t("prac.skills")} />
            {task.skills.length ? (
              <div className="lms-chips">
                {task.skills.map((skill) => (
                  <span key={skill.slug ?? skill.label} className="lms-chip lms-chip-static">
                    {tx(skill.name_i18n) || skill.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="lms-route-why" style={{ margin: 0 }}>
                {t("skill.none")}
              </p>
            )}
            {/* The distinction the whole skills system turns on, said before
                she starts rather than after she passes. */}
            <p className="lms-route-why" style={{ margin: 0 }}>
              {t("prac.assessedNote")}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function Back() {
  const { t } = useI18n();
  return (
    <Link className="lms-back" href="/talim/amaliyot">
      ← {t("prac.back")}
    </Link>
  );
}

/* ---- the form --------------------------------------------------------- */

function SubmitForm({
  task,
  onDone,
}: {
  task: PracticalTaskDetail;
  onDone: (task: PracticalTaskDetail) => void;
}) {
  const { t, tx, locale } = useI18n();
  const [text, setText] = useState(task.my_attempts[0]?.submission.text ?? "");
  const [link, setLink] = useState(task.my_attempts[0]?.submission.link ?? "");
  const [fields, setFields] = useState<Record<string, string>>(
    task.my_attempts[0]?.submission.fields ?? {},
  );
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ reason: string; field?: string } | null>(null);

  const minimum = task.min_chars ?? 120;

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      const payload =
        task.kind === "text" ? { text } : task.kind === "link" ? { link } : { fields };
      // The language she is reading in, so the feedback comes back legible.
      onDone(await portal.submitTask(task.slug, payload, locale === "uz-Cyrl" ? "uz" : locale));
    } catch (cause) {
      // The server's own reason, rendered in her language. It is the check
      // that counts, so it is the message she is shown.
      const detail =
        cause instanceof ApiError && cause.status === 422
          ? (cause.detail as { reason?: string; field?: string } | undefined)
          : undefined;
      setProblem(
        detail?.reason ? { reason: detail.reason, field: detail.field } : { reason: "send" },
      );
    } finally {
      setBusy(false);
    }
  }

  const errorKey = problem
    ? (`prac.err.${problem.reason}` as MessageKey)
    : null;

  return (
    <form className="lms-card lms-card-pad lms-submit" onSubmit={send} noValidate>
      <SectionHead title={t("prac.yourWork")} />

      {task.kind === "text" && (
        <label className="lms-field">
          <span className="lms-field-label">{tx(task.title_i18n)}</span>
          <textarea
            className="lms-textarea"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            aria-describedby="work-hint"
            disabled={busy}
          />
          <span className="lms-field-hint" id="work-hint">
            {fill(t("prac.hint.text"), { n: minimum })} · {text.trim().length}
          </span>
        </label>
      )}

      {task.kind === "link" && (
        <label className="lms-field">
          <span className="lms-field-label">{tx(task.title_i18n)}</span>
          <input
            className="lms-input"
            type="url"
            inputMode="url"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://"
            aria-describedby="link-hint"
            disabled={busy}
          />
          <span className="lms-field-hint" id="link-hint">
            {t("prac.hint.link")}
          </span>
        </label>
      )}

      {task.kind === "fields" &&
        task.fields.map((field) => (
          <label className="lms-field" key={field.key}>
            <span className="lms-field-label">{tx(field.label_i18n)}</span>
            <textarea
              className="lms-textarea"
              value={fields[field.key] ?? ""}
              onChange={(event) =>
                setFields((prev) => ({ ...prev, [field.key]: event.target.value }))
              }
              rows={4}
              aria-invalid={problem?.field === field.key || undefined}
              disabled={busy}
            />
            {field.min_chars > 0 && (
              <span className="lms-field-hint">
                {fill(t("prac.hint.text"), { n: field.min_chars })} ·{" "}
                {(fields[field.key] ?? "").trim().length}
              </span>
            )}
          </label>
        ))}

      {errorKey && (
        <p className="lms-form-error" role="alert">
          {t(errorKey)}
        </p>
      )}

      <div>
        <button type="submit" className="lms-btn lms-btn-primary" disabled={busy}>
          {t(busy ? "prac.sending" : "prac.submit")}
        </button>
      </div>
    </form>
  );
}

/* ---- what came back ---------------------------------------------------- */

function Result({
  task,
  attempt,
  past = false,
}: {
  task: PracticalTaskDetail;
  attempt: TaskAttempt;
  past?: boolean;
}) {
  const { t, tx } = useI18n();
  const evaluation = attempt.evaluation;

  return (
    <section className={`lms-card lms-card-pad lms-result ${past ? "lms-result-past" : ""}`}>
      <div className="lms-sec-head">
        <h3 className="lms-goal-title">{fill(t("prac.attempt"), { n: attempt.attempt_no })}</h3>
        <TaskBadge status={attempt.status} />
      </div>

      {/* Handed in, and nobody has looked. Its own state, not a pale pass. */}
      {attempt.status === "submitted" && (
        <p className="lms-route-why" style={{ margin: 0 }}>
          {t(task.ai_reviewed ? "prac.waitingAi" : "prac.waiting")}
        </p>
      )}

      {evaluation && (
        <>
          {evaluation.feedback && (
            <div>
              <span className="lms-route-label">{t("prac.feedback")}</span>
              <p className="lms-task-prose" style={{ marginTop: 6 }}>
                {evaluation.feedback}
              </p>
            </div>
          )}

          {evaluation.criteria_met.length > 0 && (
            <ul className="lms-criteria lms-criteria-marked">
              {evaluation.criteria_met.map((verdict) => {
                const criterion = task.criteria.find((row) => row.key === verdict.key);
                return (
                  <li key={verdict.key} className={verdict.met ? "lms-met" : "lms-unmet"}>
                    {/* The mark is labelled, never colour alone. */}
                    <span className="lms-met-mark" aria-hidden="true">
                      {verdict.met ? "✓" : "—"}
                    </span>
                    <span>
                      {criterion ? tx(criterion.text_i18n) : verdict.key}
                      {verdict.note && <em className="lms-met-note"> — {verdict.note}</em>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="lms-rec-stats">
            {evaluation.evaluator_kind && (
              <Badge>{t(`prac.ev.${evaluation.evaluator_kind}` as MessageKey)}</Badge>
            )}
            {evaluation.score !== null && <span>{Math.round(evaluation.score)}%</span>}
          </div>

          {evaluation.passed && evaluation.skills_evidenced.length > 0 && (
            <div>
              <span className="lms-route-label">{t("prac.evidenced")}</span>
              <div className="lms-chips" style={{ marginTop: 6 }}>
                {evaluation.skills_evidenced.map((skill) => (
                  <span key={skill.slug ?? skill.label} className="lms-chip lms-chip-static">
                    {tx(skill.name_i18n) || skill.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {attempt.submission.link && (
        <a className="lms-route-why" href={attempt.submission.link} rel="noreferrer noopener">
          {attempt.submission.link}
        </a>
      )}
    </section>
  );
}
