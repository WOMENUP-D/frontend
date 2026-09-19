"use client";

/**
 * The portfolio's sections, shared by her own view and the public page.
 *
 * Everything here renders server answers and decides nothing. The one design
 * decision worth defending is the skills ladder: verified, assessed and
 * learned sit as three separate rungs, each saying in a sentence what it
 * means, and a skill never appears on more than one. That distinction is the
 * whole reason the platform has a skills system — a portfolio that flattened
 * it into one list of nouns would be telling an employer something WomanUP
 * does not believe.
 *
 * Status is never carried by colour alone: every rung is named in words, and
 * every achievement says what kind it is.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import type {
  Achievement,
  PortfolioCertificate,
  PortfolioPractice,
  PortfolioProject,
  PortfolioSkill,
  PortfolioSkills,
  SkillRef,
} from "@/services/portal";
import { evidenceKindKey, proficiencyKey } from "@/utils/format";

/* ---- small shared pieces -------------------------------------------------- */

/** "12 mart 2026", from the catalogue's month names rather than `Intl`, which
 *  is the portal's habit: it is the one source that also covers Cyrillic Uzbek. */
export function Dated({ iso }: { iso: string | null }) {
  const { t } = useI18n();
  if (!iso) return <span className="pf-undated">{t("port.ach.undated")}</span>;
  const day = iso.slice(0, 10);
  const parsed = new Date(`${day}T00:00:00`);
  return (
    <time dateTime={day}>
      {parsed.getDate()} {t(`mon.${parsed.getMonth() + 1}` as MessageKey)} {parsed.getFullYear()}
    </time>
  );
}

function SkillChips({ skills }: { skills: SkillRef[] }) {
  const { tx } = useI18n();
  if (!skills.length) return null;
  return (
    <ul className="pf-chips">
      {skills.map((skill) => (
        <li key={skill.slug ?? skill.label} className="pf-chip">
          {tx(skill.name_i18n) || skill.label}
        </li>
      ))}
    </ul>
  );
}

/** A section with its heading and count. The count is the real number of
 *  rows the server returned, so the contents index and the section agree. */
export function Section({
  id,
  title,
  count,
  action,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pf-section" id={id} aria-labelledby={`${id}-h`}>
      <div className="pf-section-head">
        <h2 id={`${id}-h`} className="pf-h2">
          {title}
          {count !== undefined && <span className="pf-count">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyLine({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="pf-empty">
      <p>{text}</p>
      {action}
    </div>
  );
}

/* ---- the contents index ------------------------------------------------------ */

/** The overview, as a table of contents. Each real count is a link to the
 *  section it counts — structure that does a job, rather than a row of tiles
 *  that only reports. */
export function ContentsIndex({
  entries,
}: {
  entries: Array<{ id: string; label: string; count: number }>;
}) {
  const { t } = useI18n();
  return (
    <nav className="pf-index" aria-label={t("port.contents")}>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <a href={`#${entry.id}`}>
              <span className="pf-index-n">{entry.count}</span>
              <span className="pf-index-label">{entry.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---- skills: the ladder ------------------------------------------------------ */

const RUNGS: ReadonlyArray<{ key: keyof PortfolioSkills; explain: MessageKey }> = [
  { key: "verified", explain: "port.rung.verified" },
  { key: "assessed", explain: "port.rung.assessed" },
  { key: "learned", explain: "port.rung.learned" },
];

/** Strongest first. Three rungs that never merge. */
export function SkillLadder({
  skills,
  showSources = true,
}: {
  skills: PortfolioSkills;
  /** Off on the public page: a source can be a private project's name. */
  showSources?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="pf-ladder">
      {RUNGS.map((rung) => (
        <div key={rung.key} className={`pf-rung pf-rung-${rung.key}`}>
          <h3 className="pf-rung-title">
            {t(`skill.status.${rung.key}` as MessageKey)}
            <span className="pf-count">{skills[rung.key].length}</span>
          </h3>
          <p className="pf-rung-explain">{t(rung.explain)}</p>
          {skills[rung.key].length ? (
            <ul className="pf-rung-list">
              {skills[rung.key].map((entry) => (
                <SkillLine key={entry.skill.slug ?? entry.skill.label} entry={entry} showSources={showSources} />
              ))}
            </ul>
          ) : (
            <p className="pf-rung-empty">{t("port.rung.empty")}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function SkillLine({ entry, showSources }: { entry: PortfolioSkill; showSources: boolean }) {
  const { t, tx } = useI18n();
  // Where the status came from: named records on her own page, kinds only on
  // the public one. Her own word about herself is not listed as a source.
  const sources = entry.evidence.filter((item) => item.kind !== "self_reported");
  const named = sources
    .map((item) => tx(item.title_i18n))
    .filter((title, index, all) => title && all.indexOf(title) === index);
  const kinds = [...new Set(sources.map((item) => item.kind))];

  return (
    <li className="pf-skill">
      <span className="pf-skill-name">{tx(entry.skill.name_i18n) || entry.skill.label}</span>
      {entry.level && <span className="pf-skill-level">{t(proficiencyKey(entry.level))}</span>}
      {showSources && named.length > 0 ? (
        <span className="pf-skill-from">
          {t("port.from")}: {named.join(", ")}
        </span>
      ) : kinds.length > 0 ? (
        <span className="pf-skill-from">
          {kinds.map((kind) => t(evidenceKindKey(kind))).join(", ")}
        </span>
      ) : null}
    </li>
  );
}

/* ---- certificates -------------------------------------------------------------- */

export function CertificateList({ certificates }: { certificates: PortfolioCertificate[] }) {
  const { t, tx } = useI18n();
  return (
    <>
      <ul className="pf-certs">
        {certificates.map((certificate) => (
          <li key={certificate.id} className="pf-cert">
            <div className="pf-cert-main">
              <h3 className="pf-h3">
                {certificate.program_slug ? (
                  <Link href={`/talim/kurslar/${certificate.program_slug}`}>
                    {tx(certificate.program_title_i18n)}
                  </Link>
                ) : (
                  tx(certificate.program_title_i18n)
                )}
              </h3>
              <SkillChips skills={certificate.skills} />
            </div>
            <dl className="pf-cert-facts">
              <div>
                <dt>{t("port.cert.issued")}</dt>
                <dd>
                  <Dated iso={certificate.issued_at} />
                </dd>
              </div>
              <div>
                <dt>{t("port.cert.serial")}</dt>
                {/* Monospace because it is a code someone may read out or
                    type — the one place on the page it is the right face. */}
                <dd className="pf-serial">{certificate.serial_number}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <p className="pf-note">{t("port.cert.note")}</p>
    </>
  );
}

/* ---- achievements: a dated timeline -------------------------------------------- */

function achievementDetail(achievement: Achievement, t: (key: MessageKey) => string): string | null {
  const detail = achievement.detail;
  if (!detail) return null;
  switch (achievement.type) {
    case "skill_verified":
      return t(evidenceKindKey(detail));
    case "practical_task_passed":
      return t(`prac.ev.${detail}` as MessageKey);
    case "work_experience":
    case "business_milestone":
      return `${t(`port.outcome.${detail}` as MessageKey)}, ${t("port.confirmedBy").toLowerCase()}`;
    case "certificate_earned":
      return detail;
    default:
      return null;
  }
}

/** Newest first, as the server sorted them. A timeline because it genuinely
 *  is one: each entry is a date something happened. */
export function AchievementTimeline({ achievements }: { achievements: Achievement[] }) {
  const { t, tx } = useI18n();
  return (
    <ol className="pf-timeline">
      {achievements.map((achievement) => {
        const title = tx(achievement.title_i18n);
        const detail = achievementDetail(achievement, t);
        return (
          <li key={achievement.key} className="pf-event">
            <span className="pf-event-date">
              <Dated iso={achievement.earned_at} />
            </span>
            <div className="pf-event-body">
              <span className="pf-event-type">{t(`port.ach.${achievement.type}` as MessageKey)}</span>
              {title && (
                <span className="pf-event-title">
                  {achievement.href ? <Link href={achievement.href}>{title}</Link> : title}
                </span>
              )}
              {detail && <span className="pf-event-detail">{detail}</span>}
              {achievement.self_declared && (
                <span className="pf-event-detail">{t("port.ach.selfDeclared")}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---- practical work -------------------------------------------------------------- */

export function PracticeList({
  practice,
  linked = true,
}: {
  practice: PortfolioPractice[];
  linked?: boolean;
}) {
  const { t, tx } = useI18n();
  return (
    <ul className="pf-work">
      {practice.map((item) => (
        <li key={item.task_slug} className="pf-work-row">
          <div className="pf-work-main">
            <h3 className="pf-h3">
              {linked ? (
                <Link href={`/talim/amaliyot/${item.task_slug}`}>{tx(item.title_i18n)}</Link>
              ) : (
                tx(item.title_i18n)
              )}
            </h3>
            <SkillChips skills={item.skills} />
          </div>
          <div className="pf-work-state">
            {/* The status word itself carries the state — waiting is its own
                thing, never a pale pass. */}
            <span className={`pf-state pf-state-${item.status}`}>
              {t(`prac.st.${item.status}` as MessageKey)}
            </span>
            {item.evaluator_kind && (
              <span className="pf-work-by">{t(`prac.ev.${item.evaluator_kind}` as MessageKey)}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---- projects --------------------------------------------------------------------- */

const LINKS = ["project_url", "demo_url", "repo_url"] as const;
const LINK_LABEL: Record<(typeof LINKS)[number], MessageKey> = {
  project_url: "port.proj.link.project",
  demo_url: "port.proj.link.demo",
  repo_url: "port.proj.link.repo",
};

export function ProjectCard({
  project,
  onEdit,
  showVisibility = false,
}: {
  project: PortfolioProject;
  onEdit?: () => void;
  showVisibility?: boolean;
}) {
  const { t } = useI18n();
  return (
    <article className="pf-project">
      <div className="pf-project-head">
        <h3 className="pf-h3 pf-project-title">{project.title}</h3>
        {showVisibility && (
          <span className={`pf-vis ${project.is_public ? "pf-vis-on" : ""}`}>
            {t(project.is_public ? "port.proj.publicBadge" : "port.proj.privateBadge")}
          </span>
        )}
      </div>
      {project.summary && <p className="pf-project-summary">{project.summary}</p>}
      {project.description && <p className="pf-project-desc">{project.description}</p>}
      <SkillChips skills={project.skills} />
      <div className="pf-project-foot">
        <span className="pf-project-when">
          {project.completed_on ? (
            <>
              {t("port.proj.finished")}: <Dated iso={project.completed_on} />
            </>
          ) : (
            t("port.proj.ongoing")
          )}
        </span>
        <span className="pf-project-links">
          {LINKS.filter((field) => project[field]).map((field) => (
            // Only http(s), checked on the server. `noopener` because it is
            // somebody else's site opening from her page.
            <a key={field} href={project[field] as string} target="_blank" rel="noopener noreferrer">
              {t(LINK_LABEL[field])}
            </a>
          ))}
        </span>
        {onEdit && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
            {t("port.proj.edit")}
          </button>
        )}
      </div>
    </article>
  );
}
