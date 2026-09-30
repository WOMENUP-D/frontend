"use client";

/**
 * The Development Score diagnostic.
 *
 * A different instrument from the learning questionnaire on `/welcome`. That
 * one asks what she wants to learn; this one measures eight dimensions of her
 * life on a five-point scale, and it is the only thing that produces the score
 * the cabinet reads, the plan starts from and the national KPIs count.
 *
 * One dimension per screen, its questions together: they are short, and three
 * side by side are quicker to answer than three screens. Nothing is sent until
 * the last screen, because a partial run would re-score some dimensions from
 * fewer answers than the rest.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAccessToken, isStaff, staffHome } from "@/services/api";
import { portal, type Question } from "@/services/portal";
import { Empty, ErrorNote, Loading, NeedsAuth } from "@/components/ui";
import { useI18n } from "@/i18n";
import { dimensionKey } from "@/utils/format";

interface Group {
  dimension: string;
  questions: Question[];
}

export default function DiagnosticPage() {
  const { t, tx } = useI18n();
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const load = useCallback(() => {
    setLoadFailed(false);
    setQuestions(null);
    portal.questions().then(setQuestions).catch(() => setLoadFailed(true));
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

  /* In the order the API returns them, which is the order the instrument sets. */
  const groups = useMemo<Group[]>(() => {
    const byDimension = new Map<string, Question[]>();
    for (const question of questions ?? []) {
      byDimension.set(question.dimension, [...(byDimension.get(question.dimension) ?? []), question]);
    }
    return Array.from(byDimension, ([dimension, items]) => ({ dimension, questions: items }));
  }, [questions]);

  function go(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setSaving(true);
    setSaveFailed(false);
    try {
      await portal.submitAssessment(
        Object.entries(answers).map(([question_id, value]) => ({ question_id, value })),
      );
      // The cabinet reads the new score and its recommendations on arrival.
      router.push("/kabinet");
    } catch {
      setSaveFailed(true);
      setSaving(false);
    }
  }

  if (authed === false) return <main className="wrap page"><NeedsAuth /></main>;

  if (loadFailed) {
    return (
      <main className="wrap page">
        <div className="diag">
          <ErrorNote message={t("as.errLoad")} />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ alignSelf: "flex-start" }}
            onClick={load}
          >
            {t("lms.err.retry")}
          </button>
        </div>
      </main>
    );
  }

  if (!questions) return <main className="wrap page"><Loading rows={3} /></main>;

  if (groups.length === 0) {
    return (
      <main className="wrap page">
        <Empty title={t("as.noQuestions")} hint={t("as.noQuestionsHint")} />
      </main>
    );
  }

  const current = Math.min(page, groups.length - 1);
  const group = groups[current];
  const last = current === groups.length - 1;
  const complete = group.questions.every((question) => answers[question.id] !== undefined);

  return (
    <main className="wrap page">
      <div className="diag">
        <header className="diag-head">
          <h1>{t("cab.score")}</h1>
          <p className="muted">{t("as.note")}</p>
        </header>

        <div className="spread">
          <span className="badge badge-grey">{t(dimensionKey(group.dimension))}</span>
          <span className="faint">
            {current + 1} / {groups.length}
          </span>
        </div>
        <div
          className="lq-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={groups.length}
          aria-valuenow={current + 1}
        >
          <span style={{ width: `${((current + 1) / groups.length) * 100}%` }} />
        </div>

        {group.questions.map((question) => (
          <div
            key={question.id}
            className="diag-q"
            role="group"
            aria-labelledby={`q-${question.id}`}
          >
            <h2 id={`q-${question.id}`} className="lq-q">{tx(question.text_i18n)}</h2>
            <div className="row" style={{ gap: 8 }}>
              {question.options.map((option) => {
                const on = answers[question.id] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={on}
                    className={on ? "chip chip-on" : "chip"}
                    onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.value }))}
                  >
                    {tx(option.label_i18n)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {saveFailed && <ErrorNote message={t("as.errSave")} />}

        <div className="spread">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => go(current - 1)}
            disabled={current === 0 || saving}
          >
            ← {t("lq.back")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => (last ? void submit() : go(current + 1))}
            disabled={!complete || saving}
          >
            {last ? (saving ? t("as.calculating") : t("as.finish")) : `${t("lq.next")} →`}
          </button>
        </div>
      </div>
    </main>
  );
}
