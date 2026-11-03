"use client";

/**
 * The development check-in (diagnostic v3): first who she is and what she
 * wants, then the 17 scored questions — one question per screen.
 *
 * The first block adapts to her: a student is asked about her studies, an
 * entrepreneur about her business, and a skills question appears only for a
 * field she said she is drawn to. The rule for each question comes with it
 * from the server (`show_if`) and is read here against her draft exactly as
 * the server reads it against the submission, so what she is shown and what
 * is scored never disagree.
 *
 * Only her choices leave the browser — option ids, and the text she typed
 * for the two open questions. What an option is worth, the scores, the
 * profile and the priorities are worked out on the server.
 *
 * Answers are kept in localStorage as she goes, so a closed tab or a dropped
 * connection costs her nothing. The draft carries the run's own id, which the
 * server uses to refuse a second copy of the same attempt.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, getAccessToken, isStaff, staffHome } from "@/services/api";
import { portal, type DiagnosticQuestion } from "@/services/portal";
import { track } from "@/services/analytics";
import { Empty, ErrorNote, Loading, NeedsAuth } from "@/components/ui";
import { shownQuestions } from "@/components/diagnostic/branching";
import { useI18n, type MessageKey } from "@/i18n";
import { dimensionKey } from "@/utils/format";

const DRAFT_ITEM = "womanup.diagnostic.v3";

interface Draft {
  clientRef: string;
  startedAt: string;
  /** The question she is on, by code — stable while earlier answers change
   *  which questions are shown. */
  code: string | null;
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
    code: null,
    answers: {},
    questionIds: questions.map((q) => q.id),
  };
}

const isMulti = (q: DiagnosticQuestion) => q.type === "goals" || q.type === "multi_choice";
const isText = (q: DiagnosticQuestion) => q.type === "text";

/** An answer counts when something was chosen, or typed. */
const answered = (q: DiagnosticQuestion, chosen: string[]) =>
  isText(q) ? Boolean(chosen[0]?.trim()) : chosen.length > 0;

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
          setDraft(saved);
          setResumed(true);
        } else {
          setDraft(freshDraft(list));
          // The funnel's "began the diagnostic" step. A resumed draft is the
          // same run continued, so it is not counted again.
          track("development_test_started", {
            path: "/kabinet/diagnostika",
            properties: { resumed: false, version: 3 },
          });
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

  /* The questions she is actually shown, given what she has answered so far. */
  const shown = useMemo(
    () => (questions && draft ? shownQuestions(questions, draft.answers) : []),
    [questions, draft],
  );

  const index = useMemo(() => {
    if (!draft?.code) return 0;
    const at = shown.findIndex((q) => q.code === draft.code);
    return at >= 0 ? at : 0;
  }, [draft?.code, shown]);

  /* A new question takes focus, so a screen reader announces it and the
     keyboard starts from the top of the new screen. Not on first load: the
     page heading is what should be read first. */
  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus();
  }, [index]);

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

  if (questions.length === 0 || shown.length === 0) {
    return (
      <main className="wrap page">
        <Empty title={t("as.noQuestions")} hint={t("as.noQuestionsHint")} />
      </main>
    );
  }

  const total = shown.length;
  const question = shown[index];
  const chosen = draft.answers[question.id] ?? [];
  const multi = isMulti(question);
  const text = isText(question);
  const last = index === total - 1;
  const scored = question.section === "score";
  const section = scored && question.dimension
    ? t(dimensionKey(question.dimension))
    : t(`dg.sec.${question.section ?? "about"}` as MessageKey);
  const part = t(scored ? "dg.part.score" : "dg.part.profile");
  const has = answered(question, chosen);
  const canGo = has || question.optional;

  function go(next: number) {
    moved.current = true;
    setError(null);
    const target = shown[Math.max(0, Math.min(next, shown.length - 1))];
    setDraft((d) => (d ? { ...d, code: target.code } : d));
  }

  function choose(optionId: string) {
    setDraft((d) => {
      if (!d) return d;
      const current = d.answers[question.id] ?? [];
      let next: string[];
      if (!multi) next = [optionId];
      else if (current.includes(optionId)) next = current.filter((id) => id !== optionId);
      else if (current.length < question.max_choices) next = [...current, optionId];
      else next = current;
      return { ...d, answers: { ...d.answers, [question.id]: next } };
    });
  }

  function type(value: string) {
    const kept = question.max_length ? value.slice(0, question.max_length) : value;
    setDraft((d) =>
      d ? { ...d, answers: { ...d.answers, [question.id]: kept ? [kept] : [] } } : d,
    );
  }

  function startOver() {
    if (!questions) return;
    moved.current = false;
    setResumed(false);
    setError(null);
    setDraft(freshDraft(questions));
    track("development_test_started", {
      path: "/kabinet/diagnostika",
      properties: { resumed: false, version: 3 },
    });
  }

  async function submit() {
    if (!draft || !questions) return;
    setSaving(true);
    setError(null);
    try {
      await portal.submitDiagnostic({
        client_ref: draft.clientRef,
        started_at: draft.startedAt,
        // Only what she was shown and answered: a hidden question's old answer
        // would be dropped by the server anyway.
        answers: shown
          .filter((q) => answered(q, draft.answers[q.id] ?? []))
          .map((q) => ({
            question_id: q.id,
            option_ids: isText(q) ? [draft.answers[q.id][0].trim()] : draft.answers[q.id],
          })),
      });
      writeDraft(null);
      router.push("/kabinet/diagnostika/natija");
    } catch (err) {
      setSaving(false);
      const detail = err instanceof ApiError ? (err.detail as { code?: string; items?: string[] }) : null;
      if (detail?.code === "incomplete" && detail.items?.length) {
        const first = shown.findIndex((q) => q.code === detail.items![0]);
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

  const name = `q-${question.id}`;
  const progress = t("dg.progress").replace("{n}", String(index + 1)).replace("{total}", String(total));
  const typed = text ? (chosen[0] ?? "") : "";

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
          <span className="dg-section">
            <span className="dg-part">{part}</span>
            {section}
          </span>
          <span className="faint dg-count">{progress}</span>
        </div>
        <div
          className="lq-progress"
          role="progressbar"
          aria-label={progress}
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
            {question.optional && <span className="dg-optional">{t("dg.optional")}</span>}
          </h2>
          {question.hint_i18n && (
            <p id={`${name}-hint`} className="muted small dg-hint">{tx(question.hint_i18n)}</p>
          )}

          {text ? (
            <div className="dg-text">
              <textarea
                id={`${name}-input`}
                rows={4}
                value={typed}
                maxLength={question.max_length ?? undefined}
                placeholder={t("dg.textPlaceholder")}
                disabled={saving}
                onChange={(e) => type(e.target.value)}
                aria-labelledby={`${name}-text`}
              />
              {question.max_length && (
                <span className="faint small dg-text-count" aria-live="polite">
                  {typed.length} / {question.max_length}
                </span>
              )}
            </div>
          ) : (
            <div className="dg-options">
              {question.options.map((option) => {
                const on = chosen.includes(option.id);
                const full = multi && !on && chosen.length >= question.max_choices;
                return (
                  <label key={option.id} className={`dg-option${on ? " on" : ""}${full ? " off" : ""}`}>
                    <input
                      type={multi ? "checkbox" : "radio"}
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
          )}
          {multi && (
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
            disabled={!canGo || saving}
          >
            {last
              ? (saving ? t("dg.saving") : t("dg.finish"))
              : (has ? t("dg.next") : t("dg.skip"))}
          </button>
        </div>
      </div>
    </main>
  );
}
