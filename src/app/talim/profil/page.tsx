"use client";

/**
 * Her learning profile: who she is, what she is aiming at, and what she has
 * earned.
 *
 * The same record the cabinet holds — one profile, read here through the
 * learning section's furniture. Nothing on this page is invented: the facts
 * come from her profile, the skills from the skill layer, the certificates
 * from the courses she finished.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { getAccessToken } from "@/services/api";
import {
  portal,
  type ActivitySummary,
  type Certificate,
  type Goal,
  type SkillProfile,
} from "@/services/portal";
import { ProfileCard } from "@/components/ProfileCard";
import { useApi } from "@/components/learning/useApi";
import { art } from "@/components/learning/course";
import {
  Badge,
  Cover,
  EmptyState,
  ErrorState,
  NeedsAccount,
  SectionHead,
  Skeleton,
  SkeletonBlock,
  SkeletonCards,
  StatCard,
  monthKey,
} from "@/components/learning/ui";

interface Account {
  id: string;
  region: string | null;
  created_at: string | null;
}

interface Profile {
  full_name: string | null;
  birth_date: string | null;
  district: string | null;
  education_level: string | null;
  education_field: string | null;
  employment_status: string | null;
  completeness_percent: number;
  interests: string[];
}

export default function ProfilePage() {
  const { t, tx } = useI18n();
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => setAuthed(Boolean(getAccessToken())), []);

  const { data, loading, error, retry } = useApi(async () => {
    const [account, profile, enrollments, certificates, skills, goals, activity] =
      await Promise.all([
        portal.me() as Promise<Account>,
        portal.profile() as Promise<Profile>,
        portal.myEnrollments(),
        portal.myCertificates(),
        portal.mySkills().catch(() => null as SkillProfile | null),
        portal.goals().catch(() => [] as Goal[]),
        portal.activity().catch(() => null as ActivitySummary | null),
      ]);
    return { account, profile, enrollments, certificates, skills, goals, activity };
  });

  if (authed === false) return <NeedsAccount />;

  if (error) {
    return (
      <>
        <Skeleton height={186} radius={18} />
        <ErrorState onRetry={retry} />
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        <div className="lms-profile-row">
          <Skeleton height={186} radius={18} />
          <Skeleton height={186} radius={18} />
        </div>
        <div className="lms-sec lms-split">
          <div className="lms-col"><SkeletonBlock rows={4} /></div>
          <div className="lms-col"><SkeletonBlock rows={2} /></div>
        </div>
        <div className="lms-sec">
          <SkeletonCards rows={2} height={120} />
        </div>
      </>
    );
  }

  const { account, profile, enrollments, certificates, skills, goals, activity } = data;
  const completed = enrollments.filter((item) => item.status === "completed").length;
  const inProgress = enrollments.filter((item) => item.status === "in_progress").length;
  const education = [profile.education_level, profile.education_field].filter(Boolean).join(", ");
  const held = skills?.skills ?? [];

  return (
    <>
      <div className="lms-profile-row">
        <div className="lms-profile-card">
          <ProfileCard
            headingLevel={1}
            name={profile.full_name || t("cab.user")}
            initials={initialsOf(profile.full_name)}
            womanupId={account.id.split("-")[0].toUpperCase()}
            age={ageOf(profile.birth_date)}
            city={profile.district}
            joined={joinedOf(account.created_at, (month) => t(monthKey(month)))}
            completeness={profile.completeness_percent}
            fillHref="/welcome"
          />
        </div>

        <section>
          <SectionHead title={t("lms.stats.title")} />
          <div className="lms-stats">
            <StatCard value={completed} label={t("lms.stats.completed")} />
            <StatCard value={inProgress} label={t("lms.stats.inProgress")} />
            <StatCard value={certificates.length} label={t("lms.stats.certificates")} />
            <StatCard
              value={<>{activity?.current_streak ?? 0} <span aria-hidden="true">🔥</span></>}
              label={t("lms.stats.streak")}
            />
          </div>
        </section>
      </div>

      <div className="lms-sec lms-split">
        <div className="lms-col">
          {/* ---- who she is ------------------------------------------ */}
          <section className="lms-card lms-card-pad">
            <SectionHead title={t("lms.profile.title")} />
            <dl className="lms-facts">
              {education && (
                <div className="lms-fact">
                  <dt>{t("lms.profile.education")}</dt>
                  <dd>{education}</dd>
                </div>
              )}
              {profile.employment_status && (
                <div className="lms-fact">
                  <dt>{t("prof.experienceBlock")}</dt>
                  <dd>{profile.employment_status}</dd>
                </div>
              )}
              {profile.interests.length > 0 && (
                <div className="lms-fact">
                  <dt>{t("lms.profile.interests")}</dt>
                  <dd>
                    <div className="lms-chips">
                      {profile.interests.map((interest) => (
                        <span key={interest} className="lms-chip lms-chip-static">{interest}</span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
              <div className="lms-fact">
                <dt>{t("lms.profile.skills")}</dt>
                <dd>
                  {held.length ? (
                    <div className="lms-chips">
                      {held.map((item) => (
                        <span
                          key={item.skill.slug ?? item.skill.label}
                          className="lms-chip lms-chip-static"
                        >
                          {tx(item.skill.name_i18n) || item.skill.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="lms-stat-label">{t("skill.none")}</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="lms-col">
          {/* ---- what she is aiming at ------------------------------- */}
          <section className="lms-card lms-card-pad">
            <SectionHead title={t("lms.profile.goals")} />
            {goals.length ? (
              <div style={{ display: "grid", gap: 16 }}>
                {goals.map((goal) => (
                  <div key={goal.id}>
                    <h3 className="lms-goal-title">{goal.title}</h3>
                    <div className="lms-course-meta" style={{ marginTop: 6 }}>
                      <span>{t(`hor.${goal.horizon}` as never)}</span>
                      {goal.achieved && <Badge tone="done">{t("lms.status.completed")}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                mark="◎"
                title={t("lms.goals.empty")}
                hint={t("lms.goals.emptyHint")}
                action={
                  <Link className="lms-btn lms-btn-primary" href="/kabinet">
                    {t("lms.goals.add")}
                  </Link>
                }
              />
            )}
          </section>
        </div>
      </div>

      {/* ---- what she has earned ------------------------------------- */}
      <section className="lms-sec">
        <SectionHead title={t("lms.profile.certificates")} />
        {certificates.length ? (
          <div className="lms-courses">
            {certificates.map((certificate: Certificate) => (
              <article key={certificate.id} className="lms-course">
                <div className="lms-course-top">
                  <Cover tone={art("").tone} emblem="🏅" />
                  <div style={{ minWidth: 0 }}>
                    <h3 className="lms-course-title">{tx(certificate.program_title_i18n)}</h3>
                    <p className="lms-course-by">{certificate.serial_number}</p>
                  </div>
                </div>
                <div className="lms-course-foot">
                  <Badge tone="done">{t("lms.status.completed")}</Badge>
                  <Link
                    className="lms-btn lms-btn-quiet lms-btn-sm"
                    href={`/talim/kurslar/${certificate.program_id ?? ""}`}
                    style={{ marginLeft: "auto" }}
                  >
                    {t("lms.course.view")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("lms.profile.noCertificates")}
            hint={t("lms.profile.noCertificatesHint")}
            action={
              <Link className="lms-btn lms-btn-primary" href="/dasturlar">
                {t("lms.courses.explore")}
              </Link>
            }
          />
        )}
      </section>
    </>
  );
}

/* ---- pieces ---------------------------------------------------------- */

/** Numeric runs are skipped: "dilnoza1998" gives D, not D1. */
function initialsOf(name: string | null): string {
  return (
    (name ?? "")
      .split(/[\s@._-]+/)
      .filter((part) => part && /\p{L}/u.test(part))
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "•"
  );
}

function ageOf(birthDate: string | null): number | null {
  if (!birthDate) return null;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000);
}

/** "August 2026", in whichever language she is reading — the month comes from
 *  the catalogue, which also covers the Cyrillic Uzbek script. */
function joinedOf(created: string | null, month: (index: number) => string): string | null {
  if (!created) return null;
  const date = new Date(created);
  return `${month(date.getMonth() + 1)} ${date.getFullYear()}`;
}
