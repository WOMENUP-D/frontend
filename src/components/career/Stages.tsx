"use client";

/**
 * What each stage of a career path holds, opened in place.
 *
 * Every row is a record the server returned: a course, a task, a certificate,
 * a listing. A stage the catalogue cannot serve says why in a sentence and
 * points somewhere useful; it is never a blank panel. Links go to the pages
 * that already own each thing — the course page, the task page, the portfolio,
 * the opportunities list — rather than repeating them here.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import type {
  CareerDetail,
  CareerSkill,
  CareerStage,
  OpportunitySuggestion,
  SkillRef,
} from "@/services/portal";
import { daysLeft, skillStatusKey, typeKey } from "@/utils/format";
import { Hint, Meter, SkillChip } from "@/components/guide/Parts";
import { HELD_RANK, fill, splitSkills, stageWhatKey } from "./model";

function useSkillName() {
  const { tx } = useI18n();
  return (ref: SkillRef) => tx(ref.name_i18n) || ref.label;
}

/** Only the skills this direction needs, out of everything a course teaches. */
function onPath(detail: CareerDetail, refs: SkillRef[]): SkillRef[] {
  const wanted = new Set(detail.skills.map((ref) => ref.slug ?? ref.label));
  return refs.filter((ref) => wanted.has(ref.slug ?? ref.label));
}

function Unavailable({ reason }: { reason: string | null }) {
  const { t } = useI18n();
  if (!reason) return null;
  return <p className="cp-note">{t(`car.reason.${reason}` as MessageKey)}</p>;
}

function What({ stage }: { stage: CareerStage["stage"] }) {
  const { t } = useI18n();
  return <p className="cp-what">{t(stageWhatKey(stage))}</p>;
}

function Row({
  title,
  meta,
  chips,
  action,
}: {
  title: string;
  meta?: ReactNode;
  chips?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <li className="cp-row">
      <div className="cp-row-main">
        <p className="cp-row-title">{title}</p>
        {meta && <p className="cp-row-meta">{meta}</p>}
        {chips}
      </div>
      {action && <div className="cp-row-action">{action}</div>}
    </li>
  );
}

function SkillLine({ label, refs }: { label: string; refs: SkillRef[] }) {
  const name = useSkillName();
  if (!refs.length) return null;
  return (
    <p className="cp-row-skills">
      <span className="cp-row-skills-label">{label}:</span> {refs.map(name).join(", ")}
    </p>
  );
}

/* ---- you are here ----------------------------------------------------- */

export function HereStage({ detail }: { detail: CareerDetail }) {
  const { t } = useI18n();
  const name = useSkillName();
  const { have, need } = splitSkills(detail);
  const journey = detail.journey;

  if (!journey) {
    return (
      <div className="cp-stage">
        <p className="cp-what">{t("car.here.guest")}</p>
        <ul className="skillchips">
          {detail.skill_details.map((item) => (
            <SkillChip key={item.skill.slug ?? item.skill.label} label={name(item.skill)} tone="need" />
          ))}
        </ul>
      </div>
    );
  }

  const noteFor = (item: CareerSkill) =>
    item.programs || item.tasks ? null : t("car.skill.notTaught");

  return (
    <div className="cp-stage">
      {have.length > 0 && (
        <div className="cp-skillgroup">
          <p className="cp-skillgroup-label">{t("car.skill.have")}</p>
          <ul className="skillchips">
            {[...have]
              .sort((a, b) => HELD_RANK[a.status!] - HELD_RANK[b.status!])
              .map((item) => (
                <SkillChip
                  key={item.skill.slug ?? item.skill.label}
                  label={name(item.skill)}
                  // Her own word is not evidence, and is not drawn as if it were.
                  tone={item.status === "self_reported" ? "claimed" : "have"}
                  note={t(skillStatusKey(item.status!))}
                />
              ))}
          </ul>
        </div>
      )}
      {need.length > 0 && (
        <div className="cp-skillgroup">
          <p className="cp-skillgroup-label">{t("car.skill.missing")}</p>
          <ul className="skillchips">
            {need.map((item) => (
              <SkillChip
                key={item.skill.slug ?? item.skill.label}
                label={name(item.skill)}
                tone="need"
                note={noteFor(item)}
              />
            ))}
          </ul>
        </div>
      )}
      <Hint label={t("car.hint.label")}>{t("car.hint.skills")}</Hint>
      {journey.dimension_notes.length > 0 && (
        <ul className="cp-dimnotes">
          {journey.dimension_notes.map((note) => (
            <li key={note.dimension}>
              {fill(t("car.dimNote"), {
                dimension: t(`dim.${note.dimension}` as MessageKey),
                score: note.score,
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---- learn ------------------------------------------------------------ */

export function LearnStage({ detail, stage }: { detail: CareerDetail; stage: CareerStage }) {
  const { t, tx } = useI18n();
  const path = detail.learning_path;
  return (
    <div className="cp-stage">
      <What stage="learn" />
      <Unavailable reason={stage.reason} />
      {path && (
        <div className="cp-path">
          <p className="cp-path-label">{t("car.learn.path")}</p>
          <p className="cp-path-title">{tx(path.title_i18n)}</p>
          <Meter
            value={path.completed_count}
            max={path.program_count}
            text={fill(t("car.learn.pathProgress"), {
              done: path.completed_count,
              total: path.program_count,
            })}
          />
          <Link href={`/talim/yollar/${path.slug}`} className="btn btn-outline cp-btn">
            {t("car.learn.openPath")}
          </Link>
        </div>
      )}
      {detail.programs.length > 0 && (
        <>
          <p className="cp-list-label">{t("car.learn.courses")}</p>
          <ul className="cp-rows">
            {detail.programs.map((program) => {
              const status =
                program.enrollment_status === "completed"
                  ? t("car.course.completed")
                  : program.enrollment_status
                    ? fill(t("car.course.progress"), { p: program.progress_percent ?? 0 })
                    : t("car.course.new");
              return (
                <Row
                  key={program.id}
                  title={tx(program.title_i18n)}
                  meta={status}
                  chips={<SkillLine label={t("car.teaches")} refs={onPath(detail, program.skills_taught)} />}
                  action={
                    <Link href={`/dasturlar/${program.id}`} className="btn btn-outline cp-btn">
                      {t("car.open")}
                    </Link>
                  }
                />
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/* ---- practice --------------------------------------------------------- */

export function PracticeStage({ detail, stage }: { detail: CareerDetail; stage: CareerStage }) {
  const { t, tx } = useI18n();
  return (
    <div className="cp-stage">
      <What stage="practice" />
      <Unavailable reason={stage.reason} />
      {detail.tasks.length > 0 && (
        <ul className="cp-rows">
          {detail.tasks.map((task) => (
            <Row
              key={task.id}
              title={tx(task.title_i18n)}
              meta={
                <>
                  {task.status ? t(`prac.st.${task.status}` as MessageKey) : t("car.task.new")}
                  {task.estimated_minutes ? (
                    <span className="cp-row-aside">
                      {fill(t("car.minutes"), { n: task.estimated_minutes })}
                    </span>
                  ) : null}
                </>
              }
              chips={<SkillLine label={t("car.practises")} refs={onPath(detail, task.skills)} />}
              action={
                <Link href={`/talim/amaliyot/${task.slug}`} className="btn btn-outline cp-btn">
                  {t("car.open")}
                </Link>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---- build ------------------------------------------------------------ */

export function BuildStage({ detail }: { detail: CareerDetail }) {
  const { t, tx } = useI18n();
  const evidence = detail.journey?.evidence;
  const nothing =
    evidence &&
    !evidence.certificates.length &&
    !evidence.passed_tasks.length &&
    !evidence.projects.length;

  return (
    <div className="cp-stage">
      <What stage="build" />
      <Hint label={t("car.hint.label")}>{t("car.hint.portfolio")}</Hint>
      {evidence && (
        <>
          {nothing && <p className="cp-note">{t("car.build.empty")}</p>}
          <EvidenceList
            label={t("car.build.certificates")}
            items={evidence.certificates.map((item) => ({
              key: item.serial_number,
              text: tx(item.title_i18n),
              aside: item.serial_number,
            }))}
          />
          <EvidenceList
            label={t("car.build.tasks")}
            items={evidence.passed_tasks.map((item) => ({ key: item.slug, text: tx(item.title_i18n) }))}
          />
          <EvidenceList
            label={t("car.build.projects")}
            items={evidence.projects.map((item) => ({ key: item.id, text: item.title }))}
          />
          <div className="cp-actions">
            <Link href="/kabinet/portfolio#projects" className="btn btn-primary cp-btn">
              {t("car.build.add")}
            </Link>
            <Link href="/kabinet/portfolio" className="btn btn-outline cp-btn">
              {t("car.build.open")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function EvidenceList({
  label,
  items,
}: {
  label: string;
  items: { key: string; text: string; aside?: string }[];
}) {
  if (!items.length) return null;
  return (
    <div className="cp-evidence">
      <p className="cp-list-label">{label}</p>
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <circle cx="8" cy="8" r="7" />
              <path d="M4.8 8.2l2.2 2.2 4.3-4.6" />
            </svg>
            <span>{item.text}</span>
            {item.aside && <span className="cp-serial">{item.aside}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---- explore ---------------------------------------------------------- */

export function ExploreStage({ detail, stage }: { detail: CareerDetail; stage: CareerStage }) {
  const { t } = useI18n();
  const types = [...new Set(detail.opportunities.map((item) => item.type))];
  const allHref = types.length === 1 ? `/imkoniyatlar?type=${types[0]}` : "/imkoniyatlar";

  return (
    <div className="cp-stage">
      <What stage="explore" />
      <Unavailable reason={stage.reason} />
      {detail.opportunities.length > 0 && (
        <ul className="cp-rows">
          {detail.opportunities.map((item) => (
            <Listing key={item.id} item={item} signedIn={detail.journey !== null} />
          ))}
        </ul>
      )}
      {stage.reason !== "adults_only" && (
        <Link href={allHref} className="btn btn-outline cp-btn">
          {t("car.explore.all")}
        </Link>
      )}
    </div>
  );
}

function Listing({ item, signedIn }: { item: OpportunitySuggestion; signedIn: boolean }) {
  const { t, tx } = useI18n();
  const left = daysLeft(item.deadline);
  const total = item.matched_skills.length + item.missing_skills.length;
  const deadline =
    left === null ? null : left <= 0 ? t("car.explore.today") : fill(t("car.explore.daysLeft"), { n: left });

  return (
    <Row
      title={tx(item.title_i18n)}
      action={
        <Link href={`/imkoniyatlar/${item.id}`} className="btn btn-outline cp-btn">
          {t("car.open")}
        </Link>
      }
      meta={
        <>
          <span className="cp-type">{t(typeKey(item.type))}</span>
          {item.organisation && <span className="cp-row-aside">{item.organisation}</span>}
          {deadline && <span className="cp-row-aside">{deadline}</span>}
        </>
      }
      chips={
        signedIn && total > 0 ? (
          <p className="cp-row-skills">
            {fill(t("car.explore.have"), { have: item.matched_skills.length, total })}
          </p>
        ) : null
      }
    />
  );
}
