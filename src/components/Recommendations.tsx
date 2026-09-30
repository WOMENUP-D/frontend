"use client";

/**
 * The cabinet's three answers: where she stands, what to do next, and what is
 * open to her right now.
 *
 * Nothing is ranked in the browser. `/ai/recommendations` and
 * `/assessments/score/insights` decide; this file only words it. Reasons arrive
 * as keys with the numbers they quote and become sentences here, in her
 * language, so an explanation is never stuck in the language the server
 * happened to write it in.
 */

import Link from "next/link";
import { useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import type {
  AnswerInsight,
  DimensionBand,
  DimensionInsight,
  NextStep,
  OpportunitySuggestion,
  ProgramSuggestion,
  RecommendationReason,
  ScoreInsights,
  StepParams,
} from "@/services/portal";
import { DimensionRow, EdRow, EdRows } from "@/components/ui";
import { categoryKey, daysLeft, dimensionKey, typeKey } from "@/utils/format";

/** Status carries a word as well as a colour: the badge is never the only sign. */
export const BAND_BADGE: Record<DimensionBand, string> = {
  strong: "badge badge-green",
  developing: "badge badge-grey",
  focus: "badge badge-gold",
};

export const bandKey = (band: DimensionBand) => `ins.band.${band}` as MessageKey;

/** `{name}` placeholders, the convention the rest of the catalogue uses. */
function fill(text: string, values: StepParams): string {
  return Object.entries(values).reduce(
    (out, [name, value]) => out.split(`{${name}}`).join(String(value)),
    text,
  );
}

interface Reasoned {
  reason: RecommendationReason;
  dimension: string | null;
  params: StepParams;
}

/** How a next step reads and where it goes. Exported so every page that shows
 *  one of the engine's steps — the cabinet, the career path — words it the
 *  same way and sends her to the same place. */
export function useStepCopy() {
  const { t, tx, tu } = useI18n();

  return {
    title(step: NextStep): string {
      if (step.kind === "plan_item" && step.text) return tu(step.text);
      // A path step names the route; a course step names the course. Both are
      // the thing she would open, which is what a step's title has to be.
      if (step.task) return tx(step.task.title_i18n);
      if (step.path) return tx(step.path.title_i18n);
      if (step.program) return tx(step.program.title_i18n);
      return fill(t(`nx.${step.kind}` as MessageKey), step.params);
    },
    reason(item: Reasoned): string {
      const dimension = item.dimension ? t(dimensionKey(item.dimension)) : "";
      return fill(t(`nx.why.${item.reason}` as MessageKey), { ...item.params, dimension });
    },
    action: (step: NextStep) => t(`nx.cta.${step.kind}` as MessageKey),
    href(step: NextStep): string {
      const course = step.program ? `/dasturlar/${step.program.id}` : null;
      switch (step.kind) {
        case "take_assessment":
          return "/kabinet/diagnostika";
        case "continue_program":
        case "start_program":
          return course ?? "/dasturlar";
        case "continue_path":
        case "start_path":
          return step.path ? `/talim/yollar/${step.path.slug}` : "/talim/yollar";
        case "practise_task":
        case "improve_task":
          return step.task ? `/talim/amaliyot/${step.task.slug}` : "/talim/amaliyot";
        case "add_project":
          return "/kabinet/portfolio#projects";
        case "plan_item":
          return course ?? "/reja";
        case "explore_opportunities":
          return step.opportunity_types.length === 1
            ? `/imkoniyatlar?type=${step.opportunity_types[0]}`
            : "/imkoniyatlar";
        default:
          return "/reja";
      }
    },
  };
}

const stepKey = (step: NextStep, index: number) =>
  `${step.kind}-${step.program?.id ?? step.plan_item_id ?? index}`;

/* ---- what to do next ------------------------------------------------ */

/** The first step as the page's one pull quote; the rest numbered after it,
 *  because they are an order — "after that" means something. */
export function NextSteps({ steps }: { steps: NextStep[] }) {
  const { t } = useI18n();
  const copy = useStepCopy();
  if (steps.length === 0) return null;
  const [first, ...rest] = steps;

  return (
    <section className="stack" style={{ gap: 18 }} aria-labelledby="next-step-label">
      <div className="ed-panel">
        <span className="eyebrow" id="next-step-label">{t("cab.nextStep")}</span>
        <p className="ed-panel-quote">{copy.title(first)}</p>
        <p className="muted small">{copy.reason(first)}</p>
        <Link
          href={copy.href(first)}
          className="btn btn-primary btn-sm"
          style={{ alignSelf: "flex-start" }}
        >
          {copy.action(first)}
        </Link>
      </div>

      {rest.length > 0 && (
        <div>
          <span className="eyebrow">{t("cab.afterThat")}</span>
          <EdRows>
            {rest.map((step, index) => (
              <EdRow
                key={stepKey(step, index)}
                index={index + 2}
                title={copy.title(step)}
                meta={copy.reason(step)}
                arrow={false}
                side={
                  <Link href={copy.href(step)} className="btn btn-outline btn-sm">
                    {copy.action(step)}
                  </Link>
                }
              />
            ))}
          </EdRows>
        </div>
      )}
    </section>
  );
}

/* ---- where she stands ------------------------------------------------ */

/** Every dimension as a row; one opens at a time, so the rail stays a list of
 *  eight readings rather than a wall of advice. It opens on the dimension
 *  that needs her most. */
export function DimensionInsights({ insights }: { insights: ScoreInsights }) {
  const [open, setOpen] = useState<string | null>(insights.focus_dimensions[0] ?? null);

  return (
    <div className="dim-list">
      {insights.dimensions.map((insight) => {
        const expanded = open === insight.dimension;
        const panel = `dim-${insight.dimension}`;
        return (
          <div key={insight.dimension} className={expanded ? "dim-item dim-item-open" : "dim-item"}>
            <DimensionRow
              dimension={insight.dimension}
              current={insight.current}
              baseline={insight.baseline}
              target={insight.target}
              band={insight.band}
              expanded={expanded}
              controls={expanded ? panel : undefined}
              onToggle={() => setOpen(expanded ? null : insight.dimension)}
            />
            {expanded && <DimensionDetail id={panel} insight={insight} />}
          </div>
        );
      })}
    </div>
  );
}

function DimensionDetail({ id, insight }: { id: string; insight: DimensionInsight }) {
  const { t, tx } = useI18n();
  const copy = useStepCopy();
  /* Progress toward the target only means something once a retake has moved
     the score: on a first assessment it is 0% by construction. */
  const moved =
    insight.target != null && insight.target > insight.baseline && insight.current !== insight.baseline;
  const empty =
    insight.strengths.length === 0 &&
    insight.weaknesses.length === 0 &&
    insight.skill_gaps.length === 0 &&
    insight.actions.length === 0;

  return (
    <div id={id} className="dim-detail">
      {/* The row above already says "needs attention"; the other two bands are
          named here, where she has asked for the detail. */}
      {(insight.band !== "focus" || moved) && (
        <div className="row" style={{ gap: 10 }}>
          {insight.band !== "focus" && (
            <span className={BAND_BADGE[insight.band]}>{t(bandKey(insight.band))}</span>
          )}
          {moved && (
            <span className="faint">
              {t("ins.progress")}: {Math.round(insight.progress * 100)}%
            </span>
          )}
        </div>
      )}

      <Answers title={t("ins.strengths")} items={insight.strengths} />
      <Answers title={t("ins.weaknesses")} items={insight.weaknesses} />

      {insight.skill_gaps.length > 0 && (
        <div>
          <span className="dim-detail-label">{t("ins.skills")}</span>
          <ul className="pcard-skills">
            {insight.skill_gaps.map((skill) => (
              <li key={skill.slug ?? skill.label} className="pcard-skill">
                {tx(skill.name_i18n) || skill.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {insight.actions.length > 0 && (
        <div>
          <span className="dim-detail-label">{t("ins.actions")}</span>
          <ul className="dim-actions">
            {insight.actions.map((step, index) => (
              <li key={stepKey(step, index)}>
                <Link href={copy.href(step)}>{copy.title(step)}</Link>
                <span className="faint">{copy.reason(step)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {empty && <p className="faint">{t("ins.none")}</p>}
    </div>
  );
}

/** Her own answers, quoted with the option she chose — the reading's evidence. */
function Answers({ title, items }: { title: string; items: AnswerInsight[] }) {
  const { tx } = useI18n();
  if (items.length === 0) return null;
  return (
    <div>
      <span className="dim-detail-label">{title}</span>
      <ul className="dim-answers">
        {items.map((item) => (
          <li key={item.question_id}>
            {tx(item.text_i18n)}
            {Object.keys(item.answer_i18n).length > 0 && <span> — {tx(item.answer_i18n)}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---- what is open to her ---------------------------------------------- */

export function ForYou({
  programs,
  opportunities,
  assessed,
}: {
  programs: ProgramSuggestion[];
  opportunities: OpportunitySuggestion[];
  assessed: boolean;
}) {
  const { t, tx } = useI18n();
  const copy = useStepCopy();

  return (
    <section className="stack" style={{ gap: 12 }} aria-labelledby="for-you-label">
      <span className="eyebrow" id="for-you-label">{t("cab.forYou")}</span>
      <div className="foryou">
        <div>
          <div className="foryou-head">
            <h3>{t("cab.forYouCourses")}</h3>
            <Link href="/dasturlar" className="btn btn-outline btn-sm">{t("cab.seeAll")}</Link>
          </div>
          {programs.length > 0 ? (
            <ul className="foryou-list">
              {programs.map((program) => (
                <li key={program.id}>
                  <Link href={`/dasturlar/${program.id}`} className="foryou-title">
                    {tx(program.title_i18n)}
                  </Link>
                  <span className="foryou-meta">
                    <span>{t(categoryKey(program.category))}</span>
                    {program.duration_weeks ? (
                      <span>{program.duration_weeks} {t("common.weeks")}</span>
                    ) : null}
                  </span>
                  <span className="faint">{copy.reason(program)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small foryou-empty">
              {t(assessed ? "cab.noCourseMatch" : "cab.noCourseRecs")}
            </p>
          )}
        </div>

        <div>
          <div className="foryou-head">
            <h3>{t("cab.forYouOpps")}</h3>
            <Link href="/imkoniyatlar" className="btn btn-outline btn-sm">{t("cab.seeAll")}</Link>
          </div>
          {opportunities.length > 0 ? (
            <ul className="foryou-list">
              {opportunities.map((item) => (
                <OpportunityItem key={item.id} item={item} />
              ))}
            </ul>
          ) : (
            <p className="muted small foryou-empty">{t("cab.noOppRecs")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function OpportunityItem({ item }: { item: OpportunitySuggestion }) {
  const { t, tx } = useI18n();
  const copy = useStepCopy();
  const left = daysLeft(item.deadline);
  const why =
    item.reason === "skills_match"
      ? fill(t("cab.whySkills"), {
          skills: item.matched_skills
            .map((skill) => tx(skill.name_i18n) || skill.label)
            .join(", "),
        })
      : copy.reason(item);

  return (
    <li>
      <Link href={`/imkoniyatlar/${item.id}`} className="foryou-title">
        {tx(item.title_i18n)}
      </Link>
      <span className="foryou-meta">
        <span className="badge badge-grey">{t(typeKey(item.type))}</span>
        {/* Only a real overlap earns a percentage. A listing offered for a
            focus area may match none of her skills, and "0% match" beside a
            recommendation reads as a reason not to open it. */}
        {item.match != null && item.matched_skills.length > 0 && (
          <span className="badge badge-gold">
            {Math.round(item.match * 100)}% {t("cab.match")}
          </span>
        )}
        {item.organisation && <span>{item.organisation}</span>}
        {left != null && left >= 0 && <span>{left} {t("op.daysLeft")}</span>}
      </span>
      <span className="faint">{why}</span>
    </li>
  );
}
