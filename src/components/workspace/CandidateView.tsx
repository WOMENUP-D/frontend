"use client";

/**
 * A candidate as an organisation may read her — exactly the fields she agreed
 * to share, each with its label, and nothing else. An empty field reads as a
 * dash rather than disappearing, so the reader can see it was not given
 * instead of wondering whether it was hidden.
 *
 * Skills say how each is held: a course finished, an assessment passed, a
 * mentor's verification — or her own word, marked as such.
 */

import { useI18n, type MessageKey } from "@/i18n";
import type { CandidateProfile, CandidateSkill } from "@/services/portal";
import { regionKey, skillStatusKey } from "@/utils/format";

export function SkillList({ skills }: { skills: CandidateSkill[] }) {
  const { t, tx } = useI18n();
  if (skills.length === 0) return <span className="ws-dash">—</span>;
  return (
    <ul className="ws-skills">
      {skills.map(({ skill, status }) => (
        <li key={skill.slug ?? skill.label} className={status === "self_reported" ? "is-claimed" : ""}>
          {tx(skill.name_i18n) || skill.label}
          <span className="ws-skill-status">
            {t(status === "self_reported" ? "ws.skill.self_reported" : skillStatusKey(status))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CandidateView({ profile }: { profile: CandidateProfile }) {
  const { t } = useI18n();
  const rows: [MessageKey, React.ReactNode][] = [
    ["ws.p.firstName", profile.first_name],
    ["ws.p.region", profile.region ? t(regionKey(profile.region)) : null],
    ["ws.p.education", profile.education_level],
    ["ws.p.employment", profile.employment_status],
    ["ws.p.profession", profile.profession],
    ["ws.p.experience", profile.years_of_experience],
  ];
  return (
    <dl className="ws-profile">
      {rows.map(([key, value]) => (
        <div key={key}>
          <dt>{t(key)}</dt>
          <dd>{value === null || value === undefined || value === "" ? <span className="ws-dash">—</span> : value}</dd>
        </div>
      ))}
      <div className="ws-profile-wide">
        <dt>{t("ws.p.skills")}</dt>
        <dd>
          <SkillList skills={profile.skills} />
        </dd>
      </div>
      {profile.public_portfolio && (
        <div className="ws-profile-wide">
          <dt>{t("ws.p.portfolio")}</dt>
          <dd>
            <a href={profile.public_portfolio} className="jb-inline-link" target="_blank" rel="noopener noreferrer">
              {profile.public_portfolio}
            </a>
          </dd>
        </div>
      )}
    </dl>
  );
}
