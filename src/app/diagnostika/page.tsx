"use client";

/**
 * The learning questionnaire.
 *
 * The old screen asked eighteen variations of "rate yourself from 'not at all'
 * to 'excellent'" — answerable without thinking and useless for deciding what
 * to teach her. These questions ask what she wants to learn, why, how much time
 * she has and what she can already do.
 *
 * One question at a time on purpose: seventeen fields on one screen is a form,
 * and forms get abandoned. Answers are saved as she goes, so closing the tab
 * costs her nothing.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/services/api";
import { clearPlanGenerating, markPlanGenerating } from "@/services/planDraft";
import { portal, type LqQuestion, type Questionnaire } from "@/services/portal";
import { useI18n, type MessageKey } from "@/i18n";
import { Loading, NeedsAuth } from "@/components/ui";

type Answers = Record<string, unknown>;
type Stage = "form" | "done";

export default function DiagnosticPage() {
  const { t, tx } = useI18n();
  const router = useRouter();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [survey, setSurvey] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("form");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    setAuthed(Boolean(token));
    if (!token) {
      setLoading(false);
      return;
    }
    Promise.all([portal.questionnaire(), portal.learningProfile()])
      .then(([q, profile]) => {
        setSurvey(q);
        setAnswers(profile.answers ?? {});
        // Come back to the first unanswered question rather than to the start.
        const firstGap = q.questions.findIndex(
          (item) => item.required && !hasAnswer(profile.answers?.[item.id]),
        );
        setIndex(firstGap === -1 ? 0 : firstGap);
        if (profile.completed) setStage("done");
      })
      .finally(() => setLoading(false));
  }, []);

  const question = survey?.questions[index];
  const sectionTitle = useMemo(() => {
    if (!survey || !question) return "";
    const section = survey.sections.find((s) => s.id === question.section);
    return section ? tx(section.title_i18n) : "";
  }, [survey, question, tx]);

  const save = useCallback(async (next: Answers) => {
    try {
      await portal.saveLearning(next);
    } catch {
      // A failed autosave must not block her; the next one will carry it.
    }
  }, []);

  function set(value: unknown) {
    const next = { ...answers, [question!.id]: value };
    setAnswers(next);
    return next;
  }

  async function advance() {
    if (!survey || !question) return;
    const next = { ...answers };
    void save(next);

    if (index + 1 < survey.questions.length) {
      setIndex(index + 1);
      return;
    }
    setBusy(true);
    try {
      const saved = await portal.saveLearning(next);
      setStage(saved.completed ? "done" : "form");
      if (saved.completed) {
        // The roadmap starts building the moment the assessment is finished,
        // not when she asks for it. Generation is a slow model call, so the
        // point of firing it here is that the wait overlaps with reading this
        // screen — by the time she opens the roadmap the draft is usually there.
        // Deliberately not awaited: nothing on this page depends on it, and
        // blocking the results behind a minute of spinner would be worse than
        // the click it replaces.
        markPlanGenerating();
        void portal.generatePlan("6m").catch(() => {
          // The roadmap page generates its own draft if this never lands, so a
          // failure here costs a wait, not the plan.
          clearPlanGenerating();
        });
      }
      if (!saved.completed) {
        const gap = survey.questions.findIndex((q) => saved.missing.includes(q.id));
        if (gap !== -1) setIndex(gap);
      }
    } finally {
      setBusy(false);
    }
  }

  if (authed === false) {
    return (
      <main className="wrap page">
        <NeedsAuth />
      </main>
    );
  }
  if (loading || !survey) {
    return (
      <main className="wrap page">
        <Loading rows={4} />
      </main>
    );
  }

  /* ------------------------------------------------------------- finished */
  if (stage === "done") {
    return (
      <main className="wrap page lq-narrow stack" style={{ gap: 18 }}>
        <span className="eyebrow">{t("lq.doneBadge")}</span>
        <h1 className="lq-h1">{t("lq.doneTitle")}</h1>
        <p className="muted">{t("lq.doneLead")}</p>

        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-lg" onClick={() => router.push("/reja")}>
            {t("lq.toPlan")}
          </button>
          <Link href="/yordamchi" className="btn btn-ghost">
            {t("asst.nav")}
          </Link>
        </div>

        {/* Her answers are not frozen: what she wants to learn changes, and a
            questionnaire she cannot revisit is one she has to be honest in
            once and for ever. */}
        <button
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: "start" }}
          onClick={() => {
            setStage("form");
            setIndex(0);
          }}
        >
          {t("lq.review")}
        </button>
      </main>
    );
  }

  /* ------------------------------------------------------ the form itself */
  const total = survey.questions.length;
  const answered = hasAnswer(answers[question!.id]);

  return (
    <main className="wrap page lq-narrow stack" style={{ gap: 16 }}>
      <div className="spread">
        <span className="eyebrow">{t("lq.title")}</span>
        <span className="faint">
          {index + 1} / {total}
        </span>
      </div>
      <div className="lq-progress">
        <span style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      {index === 0 && <p className="muted small">{t("lq.lead")}</p>}

      <div className="card stack" style={{ gap: 16 }}>
        <span className="badge badge-grey">{sectionTitle}</span>
        <h2 className="lq-q">{tx(question!.text_i18n)}</h2>

        <QuestionInput
          question={question!}
          value={answers[question!.id]}
          onChange={(value) => set(value)}
          onCommit={(value) => {
            const next = set(value);
            void save(next);
          }}
        />
      </div>

      <div className="spread">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
        >
          ← {t("lq.back")}
        </button>
        <div className="row" style={{ gap: 10 }}>
          {!question!.required && !answered && (
            <button className="btn btn-ghost btn-sm" onClick={advance} disabled={busy}>
              {t("lq.skip")}
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={advance}
            disabled={busy || (question!.required && !answered)}
          >
            {index + 1 === total ? t("lq.finish") : t("lq.next")} →
          </button>
        </div>
      </div>
    </main>
  );
}

function hasAnswer(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function QuestionInput({
  question,
  value,
  onChange,
  onCommit,
}: {
  question: LqQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  onCommit: (value: unknown) => void;
}) {
  const { t, tx } = useI18n();

  if (question.type === "single") {
    return (
      <div className="stack" style={{ gap: 9 }}>
        {(question.options ?? []).map((option) => (
          <button
            key={option.value}
            className={value === option.value ? "lq-option on" : "lq-option"}
            onClick={() => onCommit(option.value)}
          >
            {tx(option.label_i18n)}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "multi") {
    // Answers saved while this question accepted only one arrive as a plain
    // string; she should find her old choice ticked, not lost.
    const picked = Array.isArray(value)
      ? (value as string[])
      : typeof value === "string" && value
        ? [value]
        : [];
    return (
      <div className="stack" style={{ gap: 9 }}>
        <span className="faint">{t("lq.multiHint")}</span>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {(question.options ?? []).map((option) => {
            const on = picked.includes(option.value);
            return (
              <button
                key={option.value}
                className={on ? "chip chip-on" : "chip"}
                onClick={() =>
                  onCommit(
                    on ? picked.filter((v) => v !== option.value) : [...picked, option.value],
                  )
                }
              >
                {tx(option.label_i18n)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === "scale") {
    const current = typeof value === "number" ? value : 0;
    const low = question.id === "self_level" ? "lq.levelLow" : "lq.scaleLow";
    const high = question.id === "self_level" ? "lq.levelHigh" : "lq.scaleHigh";
    return (
      <div className="stack" style={{ gap: 9 }}>
        <div className="lq-scale">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={current === n ? "lq-dot on" : "lq-dot"}
              onClick={() => onCommit(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="spread">
          <span className="faint">{t(low as MessageKey)}</span>
          <span className="faint">{t(high as MessageKey)}</span>
        </div>
      </div>
    );
  }

  const text = typeof value === "string" ? value : "";
  const suggestions = question.suggestions_i18n ?? [];
  const adds = question.suggest_mode === "add";

  return (
    <div className="stack" style={{ gap: 14 }}>
      <input
        className="input input-lg"
        value={text}
        placeholder={question.placeholder_i18n ? tx(question.placeholder_i18n) : ""}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => onCommit(event.target.value)}
        autoFocus
      />

      {/* An empty box is where this questionnaire gets abandoned — a woman who
          has never written a CV has nothing to type into it. These are her own
          words offered back, and every one of them stays editable afterwards. */}
      {suggestions.length > 0 && (
        <div className="stack" style={{ gap: 9 }}>
          <span className="faint">{t(adds ? "lq.suggestAdd" : "lq.suggestPick")}</span>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {suggestions.map((item) => {
              const label = tx(item);
              const on = adds ? listOf(text).some(same(label)) : same(label)(text);
              return (
                <button
                  key={label}
                  type="button"
                  className={on ? "chip chip-on" : "chip"}
                  onClick={() => onCommit(applySuggestion(text, label, adds))}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function listOf(text: string): string[] {
  return text.split(",").map((part) => part.trim()).filter(Boolean);
}

const same = (a: string) => (b: string) => a.toLowerCase() === b.trim().toLowerCase();

/** Tapping a suggestion toggles it, so a mis-tap costs one more tap and not a
 *  trip into the field to delete text by hand. */
function applySuggestion(text: string, label: string, adds: boolean): string {
  if (!adds) return same(label)(text) ? "" : label;
  const parts = listOf(text);
  const at = parts.findIndex(same(label));
  if (at !== -1) {
    parts.splice(at, 1);
    return parts.join(", ");
  }
  return [...parts, label].join(", ");
}
