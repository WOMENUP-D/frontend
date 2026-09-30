"use client";

/**
 * Her skills, and the ones worth building next.
 *
 * The distinction the section exists to make: a course finished is *learned*,
 * an assessment makes it *assessed*, and only a mentor, an employer or a real
 * placement makes it *verified*. Each skill therefore shows what backs it —
 * the course, the certificate, the person — rather than a bare tick, and the
 * footnote says the rule out loud so nobody has to infer it from a colour.
 *
 * It loads its own data, like the activity calendar beside it: the section is
 * self-contained, so a slow or failed skills call cannot hold up the rest of
 * the cabinet.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { portal } from "@/services/portal";
import type {
  SkillGap,
  SkillProfile,
  SkillRef,
  SkillStatus,
  UserSkill,
} from "@/services/portal";
import { ErrorNote } from "@/components/ui";
import { evidenceKindKey, proficiencyKey, skillStatusKey } from "@/utils/format";

const LEVELS = ["beginner", "elementary", "intermediate", "advanced", "expert"] as const;

/** Status carries its word as well as its colour — never colour alone. */
const STATUS_BADGE: Record<SkillStatus, string> = {
  verified: "badge badge-green",
  assessed: "badge badge-gold",
  learned: "badge",
  self_reported: "badge badge-grey",
};

/** A skill's name in her language, falling back to the word an author wrote
 *  for a skill nobody has curated yet. */
export function useSkillName() {
  const { tx } = useI18n();
  return (skill: SkillRef) => tx(skill.name_i18n) || skill.label;
}

function fill(text: string, values: Record<string, number | string>): string {
  return Object.entries(values).reduce(
    (out, [name, value]) => out.split(`{${name}}`).join(String(value)),
    text,
  );
}

function Level({ level }: { level: UserSkill["level"] }) {
  const { t } = useI18n();
  if (!level) return null;
  const reached = LEVELS.indexOf(level) + 1;
  return (
    <span className="skill-meta" style={{ gap: 7 }}>
      <span className="skill-dots" role="img" aria-label={t(proficiencyKey(level))}>
        {LEVELS.map((step, index) => (
          <span key={step} className={index < reached ? "skill-dot skill-dot-on" : "skill-dot"} />
        ))}
      </span>
      {t(proficiencyKey(level))}
    </span>
  );
}

function SkillRow({ item }: { item: UserSkill }) {
  const { t, tx } = useI18n();
  const name = useSkillName();
  const evidence = item.evidence[0];
  const evidenceTitle = evidence ? tx(evidence.title_i18n) : "";

  return (
    <li>
      <div className="skill-head">
        <span className="skill-name">{name(item.skill)}</span>
        {item.status && (
          <span className={STATUS_BADGE[item.status]}>{t(skillStatusKey(item.status))}</span>
        )}
      </div>

      <div className="skill-meta">
        <Level level={item.level} />
        {item.evidence_count > 0 && (
          <span>{fill(t("skill.evidence"), { n: item.evidence_count })}</span>
        )}
        {/* What actually backs it: the course, the certificate, the person. */}
        {evidence && (
          <span>
            {t(evidenceKindKey(evidence.kind))}
            {evidenceTitle && ` — ${evidenceTitle}`}
          </span>
        )}
      </div>

      {item.progress_percent != null && (
        <div className="skill-meta">
          <span>{t("skill.learningNow")}</span>
          <span className="bar skill-bar" style={{ flex: 1 }}>
            <span style={{ width: `${item.progress_percent}%` }} />
          </span>
          <span>{item.progress_percent}%</span>
        </div>
      )}
    </li>
  );
}

function GapRow({ gap }: { gap: SkillGap }) {
  const { t, tx } = useI18n();
  const name = useSkillName();

  return (
    <li>
      <div className="skill-head">
        <span className="skill-name">{name(gap.skill)}</span>
        {gap.program_id && (
          <Link href={`/dasturlar/${gap.program_id}`} className="btn btn-outline btn-sm">
            {t("skill.openCourse")}
          </Link>
        )}
      </div>
      <div className="skill-meta">
        {gap.programs > 0 && <span>{fill(t("skill.gapCourses"), { n: gap.programs })}</span>}
        {gap.opportunities > 0 && (
          <span>{fill(t("skill.gapListings"), { n: gap.opportunities })}</span>
        )}
        {gap.program_id && <span>{tx(gap.program_title_i18n)}</span>}
      </div>
    </li>
  );
}

/** How many rows each list shows before "Show all": enough to see where she
 *  stands, few enough that the cabinet is not a wall of bars on a phone. */
const FIRST_SKILLS = 6;
const FIRST_GAPS = 4;

export function SkillsSection() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<SkillProfile | null>(null);
  const [failed, setFailed] = useState(false);
  const [allSkills, setAllSkills] = useState(false);
  const [allGaps, setAllGaps] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      setProfile(await portal.mySkills());
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) {
    return (
      <section className="stack" style={{ gap: 10 }}>
        <span className="eyebrow">{t("skill.section")}</span>
        <ErrorNote message={t("skill.error")} />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ alignSelf: "flex-start" }}
          onClick={() => void load()}
        >
          {t("lms.err.retry")}
        </button>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="stack" style={{ gap: 10 }}>
        <span className="eyebrow">{t("skill.section")}</span>
        <div className="skeleton" style={{ height: 120 }} />
      </section>
    );
  }

  return (
    <section className="stack" style={{ gap: 12 }} aria-labelledby="skills-label">
      <span className="eyebrow" id="skills-label">{t("skill.section")}</span>

      <div className="skills-grid">
        <div>
          <div className="foryou-head">
            <h3>{t("skill.mine")}</h3>
          </div>
          {profile.skills.length > 0 ? (
            <>
              <ul className="skill-list" id="skills-mine">
                {(allSkills ? profile.skills : profile.skills.slice(0, FIRST_SKILLS)).map((item) => (
                  <SkillRow key={item.skill.slug ?? item.skill.label} item={item} />
                ))}
              </ul>
              {profile.skills.length > FIRST_SKILLS && (
                <ShowAll
                  open={allSkills}
                  total={profile.skills.length}
                  controls="skills-mine"
                  onToggle={() => setAllSkills((value) => !value)}
                />
              )}
            </>
          ) : (
            <p className="muted small foryou-empty">{t("skill.none")}</p>
          )}
          <p className="skill-note" style={{ marginTop: 10 }}>{t("skill.verifyHint")}</p>
        </div>

        <div>
          <div className="foryou-head">
            <h3>{t("skill.improve")}</h3>
          </div>
          {profile.improve.length > 0 ? (
            <>
              <ul className="skill-list" id="skills-gaps">
                {(allGaps ? profile.improve : profile.improve.slice(0, FIRST_GAPS)).map((gap) => (
                  <GapRow key={gap.skill.slug ?? gap.skill.label} gap={gap} />
                ))}
              </ul>
              {profile.improve.length > FIRST_GAPS && (
                <ShowAll
                  open={allGaps}
                  total={profile.improve.length}
                  controls="skills-gaps"
                  onToggle={() => setAllGaps((value) => !value)}
                />
              )}
            </>
          ) : (
            <p className="muted small foryou-empty">{t("skill.noGaps")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Opens the rest of a list in place. The list is still there in full for
 *  whoever asks; it just does not open at full length. */
function ShowAll({
  open,
  total,
  controls,
  onToggle,
}: {
  open: boolean;
  total: number;
  controls: string;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="ds-cta is-quiet skill-all"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
    >
      <span>{open ? t("skill.showFewer") : fill(t("skill.showAll"), { n: total })}</span>
    </button>
  );
}
