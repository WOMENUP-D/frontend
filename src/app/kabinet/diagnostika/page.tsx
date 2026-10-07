"use client";

/**
 * The development check-in (diagnostic v2): 25 questions, one per screen.
 *
 * One question at a time because each one asks her to place herself on a
 * five-step ladder, and five long options side by side with two more
 * questions underneath is a form, not a conversation. The section and the
 * count stay on screen so she always knows where she is and how much is left.
 *
 * Only her choices leave the browser — the option ids. What an option is
 * worth, the scores and the priorities are worked out on the server.
 *
 * Answers are kept in localStorage as she goes, so a closed tab or a dropped
 * connection costs her nothing. The draft carries the run's own id, which the
 * server uses to refuse a second copy of the same attempt.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getAccessToken, isStaff, staffHome } from "@/services/api";
import { portal, type DiagnosticQuestion } from "@/services/portal";
import { Empty, ErrorNote, Loading, NeedsAuth } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dimensionKey } from "@/utils/format";

const DRAFT_ITEM = "womanup.diagnostic.v2";

interface Draft {
  clientRef: string;
  startedAt: string;
  index: number;
  answers: Record<string, string[]>;
  /** The question ids it was answered against — a changed set voids it. */
  questionIds: string[];
}

function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_ITEM);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(draft: Draft | null) {
  try {
    if (draft) window.localStorage.setItem(DRAFT_ITEM, JSON.stringify(draft));
    else window.localStorage.removeItem(DRAFT_ITEM);
  } catch {
    /* A browser that blocks storage still gets a working check-in. */
  }
}

function freshDraft(questions: DiagnosticQuestion[]): Draft {
  return {
    clientRef: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    index: 0,
    answers: {},
    questionIds: questions.map((q) => q.id),
  };
}

export default function DiagnosticPage() {
  const { t, tx } = useI18n();
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [questions, setQuestions] = useState<DiagnosticQuestion[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [resumed, setResumed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const load = useCallback(() => {
    setLoadFailed(false);
    setQuestions(null);
    portal
      .diagnosticQuestions()
      .then(({ questions: list }) => {
        setQuestions(list);
        const saved = readDraft();
        const ids = list.map((q) => q.id);
        const usable =
          saved &&
          saved.questionIds.length === ids.length &&
          saved.questionIds.every((id, i) => id === ids[i]);
        if (usable && Object.keys(saved.answers).length > 0) {
          setDraft({ ...saved, index: Math.min(saved.index, ids.length - 1) });
          setResumed(true);
        } else {
          setDraft(freshDraft(list));
        }
      })
      .catch(() => setLoadFailed(true));
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    setAuthed(Boolean(token));
    if (!token) return;
    // Staff have no score of their own — their screen is the panel.
    if (isStaff()) {
      router.replace(staffHome());
      return;
    }
    load();
  }, [load, router]);

  useEffect(() => {
    if (draft) writeDraft(draft);
  }, [draft]);

  /* A new question takes focus, so a screen reader announces it and the
     keyboard starts from the top of the new screen. Not on first load: the
     page heading is what should be read first. */
  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus();
  }, [draft?.index]);

  if (authed === false) return <main className="wrap page"><NeedsAuth /></main>;

  if (loadFailed) {
    return (
      <main className="wrap page">
        <div className="diag">
          <ErrorNote message={t("as.errLoad")} />
          <button type="button" className="btn btn-outline btn-sm dg-start" onClick={load}>
            {t("lms.err.retry")}
          </button>
        </div>
      </main>
    );
  }

  if (!questions || !draft) return <main className="wrap page"><Loading rows={3} /></main>;

  if (questions.length === 0) {
    return (
      <main className="wrap page">
        <Empty title={t("as.noQuestions")} hint={t("as.noQuestionsHint")} />
      </main>
    );
  }

  const total = questions.length;
  const index = Math.min(draft.index, total - 1);
  const question = questions[index];
  const chosen = draft.answers[question.id] ?? [];
  const isGoals = question.type === "goals";
  const last = index === total - 1;
  const section = question.dimension ? t(dimensionKey(question.dimension)) : t("dg.goals");

  function go(next: number) {
    moved.current = true;
    setError(null);
    setDraft((d) => (d ? { ...d, index: next } : d));
  }

  function choose(optionId: string) {
    setDraft((d) => {
      if (!d) return d;
      const current = d.answers[question.id] ?? [];
      let next: string[];
      if (!isGoals) next = [optionId];
      else if (current.includes(optionId)) next = current.filter((id) => id !== optionId);
      else if (current.length < question.max_choices) next = [...current, optionId];
      else next = current;
      return { ...d, answers: { ...d.answers, [question.id]: next } };
    });
  }

  function startOver() {
    if (!questions) return;
    moved.current = false;
    setResumed(false);
    setError(null);
    setDraft(freshDraft(questions));
  }

  async function submit() {
    if (!draft || !questions) return;
    setSaving(true);
    setError(null);
    try {
      await portal.submitDiagnostic({
        client_ref: draft.clientRef,
        started_at: draft.startedAt,
        answers: questions
          .filter((q) => (draft.answers[q.id] ?? []).length > 0)
          .map((q) => ({ question_id: q.id, option_ids: draft.answers[q.id] })),
      });
      writeDraft(null);
      router.push("/kabinet/diagnostika/natija");
    } catch (err) {
      setSaving(false);
      const detail = err instanceof ApiError ? (err.detail as { code?: string; items?: string[] }) : null;
      if (detail?.code === "incomplete" && detail.items?.length) {
        const first = questions.findIndex((q) => q.code === detail.items![0]);
        if (first >= 0) go(first);
        setError(t("dg.errIncomplete"));
      } else if (detail?.code === "invalid_question") {
        writeDraft(null);
        setError(t("dg.errChanged"));
        load();
      } else {
        setError(t("dg.errSave"));
      }
    }
  }

  const answered = chosen.length > 0;
  const name = `q-${question.id}`;

  return (
    <main className="wrap page">
      <div className="diag dg">
        <header className="dg-head">
          <h1 className="dg-title">{t("dg.title")}</h1>
          {index === 0 && !resumed && <p className="muted">{t("dg.intro")}</p>}
          {resumed && (
            <p className="dg-resumed small">
              {t("dg.resumed")}{" "}
              <button type="button" className="link-btn" onClick={startOver}>
                {t("dg.startOver")}
              </button>
            </p>
          )}
        </header>

        <div className="dg-where">
          <span className="dg-section">{section}</span>
          <span className="faint dg-count">
            {t("dg.progress").replace("{n}", String(index + 1)).replace("{total}", String(total))}
          </span>
        </div>
        <div
          className="lq-progress"
          role="progressbar"
          aria-label={t("dg.progress").replace("{n}", String(index + 1)).replace("{total}", String(total))}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index + 1}
        >
          <span style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>

        <fieldset
          className="dg-q"
          key={question.id}
          aria-labelledby={`${name}-text`}
          aria-describedby={question.hint_i18n ? `${name}-hint` : undefined}
        >
          <h2 ref={heading} id={`${name}-text`} tabIndex={-1} className="dg-question">
            {tx(question.text_i18n)}
          </h2>
          {question.hint_i18n && (
            <p id={`${name}-hint`} className="muted small dg-hint">{tx(question.hint_i18n)}</p>
          )}

          <div className="dg-options">
            {question.options.map((option) => {
              const on = chosen.includes(option.id);
              const full = isGoals && !on && chosen.length >= question.max_choices;
              return (
                <label key={option.id} className={`dg-option${on ? " on" : ""}${full ? " off" : ""}`}>
                  <input
                    type={isGoals ? "checkbox" : "radio"}
                    name={name}
                    value={option.id}
                    checked={on}
                    disabled={full || saving}
                    onChange={() => choose(option.id)}
                  />
                  <span className="dg-mark" aria-hidden="true" />
                  <span className="dg-label">{tx(option.label_i18n)}</span>
                </label>
              );
            })}
          </div>
          {isGoals && (
            <p className="faint small" aria-live="polite">
              {t("dg.chosen")
                .replace("{n}", String(chosen.length))
                .replace("{max}", String(question.max_choices))}
            </p>
          )}
        </fieldset>

        {error && <ErrorNote message={error} />}

        <div className="dg-nav">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => go(index - 1)}
            disabled={index === 0 || saving}
          >
            {t("dg.back")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => (last ? void submit() : go(index + 1))}
            disabled={!answered || saving}
          >
            {last ? (saving ? t("dg.saving") : t("dg.finish")) : t("dg.next")}
          </button>
        </div>
      </div>
    </main>
  );
}
