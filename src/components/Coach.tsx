"use client";

/**
 * The AI Coach panel: where she stands, what to do next, and why.
 *
 * The decision worth defending is that almost nothing here is generated. Her
 * situation and her next step arrive already computed — the Development Score,
 * the canonical skills with their evidence, the real course progress, the
 * deterministic engine's own ranking — so they render instantly and cannot be
 * wrong. The model is used for the conversation underneath, and only there.
 *
 * That is also why the panel leads and the chat follows: the first thing she
 * should see is a true statement about herself, not a blinking cursor.
 *
 * The skill groups are shown apart rather than merged into one list of nouns.
 * "Learned" and "verified" are different claims — a course taught it, versus a
 * person or a placement confirmed it — and flattening them is exactly the
 * mistake the whole skills system exists to prevent.
 */

import Link from "next/link";
import { useI18n, type MessageKey } from "@/i18n";
import type {
  CoachContext,
  CoachReference,
  CoachSkill,
  CoachSuggestion,
} from "@/services/portal";
import { dimensionKey } from "@/utils/format";

/** `{name}` placeholders, the convention the rest of the catalogue uses. */
function fill(text: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (out, [name, value]) => out.split(`{${name}}`).join(value),
    text,
  );
}

/** A suggested question, rendered in her language from a key and its facts. */
export function suggestionText(
  suggestion: CoachSuggestion,
  t: (key: MessageKey) => string,
): string {
  return fill(t(suggestion.key as MessageKey), suggestion.params);
}

/** Where a reference points. Only the kinds the server can produce. */
export function referenceHref(reference: CoachReference): string {
  if (reference.kind === "career_path" && reference.slug) {
    return `/kasb/${reference.slug}`;
  }
  if (reference.kind === "learning_path" && reference.slug) {
    return `/talim/yollar/${reference.slug}`;
  }
  if (reference.kind === "practical_task" && reference.slug) {
    return `/talim/amaliyot/${reference.slug}`;
  }
  if (reference.kind === "program") {
    return reference.slug ? `/talim/kurslar/${reference.slug}` : `/dasturlar/${reference.id}`;
  }
  if (reference.kind === "opportunity") {
    return `/imkoniyatlar/${reference.id}`;
  }
  if (reference.kind === "event") {
    return `/tadbirlar/${reference.id}`;
  }
  return "/imkoniyatlar";
}

/* ---- the situation ---------------------------------------------------- */

export function CoachPanel({ context }: { context: CoachContext }) {
  const { t, tx } = useI18n();
  const { score, skills, learning, practice, paths } = context;
  const course = learning.in_progress[0] ?? null;
  const path = paths[0] ?? null;

  const held =
    skills.verified.length +
    skills.assessed.length +
    skills.learned.length +
    skills.self_reported.length;

  return (
    <div className="card stack" style={{ gap: 16 }}>
      <div className="spread">
        <span className="eyebrow">{t("coach.situation")}</span>
        {!context.personalised && (
          <span className="badge badge-grey">{t("asst.generic")}</span>
        )}
      </div>

      {/* Four readings, each one a fact the platform holds. A figure it does
          not have is absent rather than shown as zero. */}
      <div className="coach-stats">
        <Stat
          value={score.assessed && score.composite !== null ? String(Math.round(score.composite)) : "—"}
          label={t("coach.score")}
          hint={score.assessed ? undefined : t("coach.noScore")}
        />
        <Stat value={String(held)} label={t("coach.skillsHeld")} />
        <Stat value={String(learning.completed.length)} label={t("coach.coursesDone")} />
        <Stat value={String(learning.certificates)} label={t("coach.certificates")} />
      </div>

      {score.assessed && score.focus.length > 0 && (
        <p className="small">
          <span className="faint">{t("coach.focus")}: </span>
          {score.focus.map((dimension) => t(dimensionKey(dimension))).join(", ")}
        </p>
      )}

      {course && (
        <p className="small">
          <span className="faint">{t("coach.studying")}: </span>
          <Link href={`/talim/kurslar/${course.slug}`}>{tx(course.title_i18n)}</Link>
          {" — "}
          {course.progress_percent}%
        </p>
      )}

      {path && (
        <p className="small">
          <span className="faint">{t("coach.onPath")}: </span>
          <Link href={`/talim/yollar/${path.slug}`}>{tx(path.title_i18n)}</Link>
          {" — "}
          {path.percent}%
        </p>
      )}

      {/* Practice, when she is doing any. Work an evaluator told her how to fix
          is the most concrete thing on the platform, so it is named. */}
      {(practice.needs_improvement > 0 ||
        practice.awaiting_review > 0 ||
        practice.passed > 0 ||
        practice.open_tasks > 0) && (
        <p className="small">
          <span className="faint">{t("coach.practice")}: </span>
          {practice.next_task_slug ? (
            <Link href={`/talim/amaliyot/${practice.next_task_slug}`}>
              {tx(practice.next_task_title_i18n)}
            </Link>
          ) : (
            `${practice.passed} · ${t("prac.st.passed")}`
          )}
          {practice.needs_improvement > 0 && ` — ${t("prac.st.needs_improvement")}`}
          {practice.needs_improvement === 0 &&
            practice.awaiting_review > 0 &&
            ` — ${t("prac.st.submitted")}`}
        </p>
      )}

      {/* The groups stay apart. Merging them would tell her a course verified
          something, which is the one thing the skills system must never say. */}
      <SkillGroup label={t("skill.status.verified")} items={skills.verified} />
      <SkillGroup label={t("skill.status.assessed")} items={skills.assessed} />
      <SkillGroup label={t("skill.status.learned")} items={skills.learned} />
      {held === 0 && <p className="muted small">{t("coach.noSkills")}</p>}

      {skills.gaps.length > 0 && (
        <p className="small">
          <span className="faint">{t("coach.gaps")}: </span>
          {skills.gaps
            .slice(0, 5)
            .map((gap) => tx(gap.skill.name_i18n) || gap.skill.label)
            .join(", ")}
        </p>
      )}

      <NextStep context={context} />
    </div>
  );
}

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="coach-stat">
      <strong className="coach-stat-value">{value}</strong>
      <span className="faint">{label}</span>
      {hint && <span className="faint coach-stat-hint">{hint}</span>}
    </div>
  );
}

function SkillGroup({ label, items }: { label: string; items: CoachSkill[] }) {
  const { tx } = useI18n();
  if (items.length === 0) return null;
  return (
    <p className="small">
      <span className="faint">{label}: </span>
      {items
        .slice(0, 8)
        .map((item) => tx(item.skill.name_i18n) || item.skill.label)
        .join(", ")}
    </p>
  );
}

/** The one thing to do next — the engine's own first step, not the model's. */
function NextStep({ context }: { context: CoachContext }) {
  const { t, tx, tu } = useI18n();
  const step = context.next_steps[0];
  if (!step) return null;

  const target = step.program ?? null;
  const path = step.path ?? null;
  const task = step.task ?? null;
  const title = step.text
    ? tu(step.text)
    : task
      ? tx(task.title_i18n)
      : path
        ? tx(path.title_i18n)
        : target
          ? tx(target.title_i18n)
          : t(`nx.${step.kind}` as MessageKey);

  const href = task
    ? `/talim/amaliyot/${task.slug}`
    : path
      ? `/talim/yollar/${path.slug}`
      : target
        ? `/talim/kurslar/${target.slug}`
        : step.kind === "take_assessment"
          ? "/kabinet/diagnostika"
          : step.kind === "add_project"
            ? "/kabinet/portfolio#projects"
            : "/reja";

  return (
    <div className="coach-next">
      <span className="eyebrow">{t("coach.nextStep")}</span>
      <p className="coach-next-title">{title}</p>
      <Link href={href} className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>
        {t(`nx.cta.${step.kind}` as MessageKey)}
      </Link>
    </div>
  );
}

/* ---- what an answer points at ----------------------------------------- */

/** The real records behind a coaching answer, each one a link she can follow.
 *  Every entry was resolved on the server against the catalogue, so none of
 *  these can be a course that does not exist. */
export function CoachReferences({ references }: { references: CoachReference[] }) {
  const { t, tx } = useI18n();
  if (references.length === 0) return null;

  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="eyebrow">{t("coach.references")}</span>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {references.map((reference) => (
          <Link key={reference.id} href={referenceHref(reference)} className="chip">
            {tx(reference.title_i18n)}
          </Link>
        ))}
      </div>
    </div>
  );
}
