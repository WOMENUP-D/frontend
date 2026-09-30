"use client";

/**
 * Achievements — the record of what the learning has already added up to.
 *
 * Everything here is earned: a certificate the platform issued, a course she
 * finished, a skill those courses taught her. The screen used to carry six
 * designed badges — "first project", "30-day streak" — that nothing in the
 * system could award, and a trophy case of things that cannot be won is a
 * decoration, not a record.
 *
 * The measured numbers come first because they are the honest part. Her
 * longest streak sits beside the current one on purpose: a personal record is
 * the one comparison worth showing her, and it belongs to her.
 *
 * Nothing here is a call to action, so this screen spends no bold surface at
 * all — the dashboard owns that, and a record does not need a button.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { getAccessToken } from "@/services/api";
import {
  portal,
  type Achievement,
  type ActivitySummary,
  type Certificate,
  type EnrollmentDetail,
  type SkillProfile,
  type UserSkill,
} from "@/services/portal";
import { AchievementTimeline } from "@/components/portfolio/Sections";
import { useApi } from "@/components/learning/useApi";
import { art } from "@/components/learning/course";
import {
  Badge,
  Cover,
  EmptyState,
  ErrorState,
  NeedsAccount,
  PageHead,
  SectionHead,
  Skeleton,
  StatCard,
  monthKey,
} from "@/components/learning/ui";

export default function AchievementsPage() {
  const { t, tx } = useI18n();
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => setAuthed(Boolean(getAccessToken())), []);

  const { data, loading, error, retry } = useApi(async () => {
    const [certificates, enrollments, activity, skills, record] = await Promise.all([
      portal.myCertificates(),
      portal.myEnrollments(),
      portal.activity().catch(() => null as ActivitySummary | null),
      portal.mySkills().catch(() => null as SkillProfile | null),
      // The one definition of an achievement: the server's, read off the
      // records that back each one. This screen never derives its own.
      portal.myPortfolio().catch(() => null),
    ]);
    return {
      certificates,
      completed: enrollments.filter((item) => item.status === "completed"),
      activity,
      // What the courses actually proved. Her own claims are not achievements.
      skills: (skills?.skills ?? []).filter((item) => item.status !== "self_reported"),
      achievements: (record?.achievements ?? []) as Achievement[],
    };
  });

  const head = <PageHead title={t("lms.ach.title")} lead={t("lms.ach.lead")} />;

  if (authed === false) {
    return (
      <>
        {head}
        <NeedsAccount />
      </>
    );
  }

  if (error) {
    return (
      <>
        {head}
        <ErrorState onRetry={retry} />
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        {head}
        <div className="lms-stats" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={86} radius={14} />
          ))}
        </div>
        <div className="lms-sec">
          <div className="lms-badges" aria-busy="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} height={176} radius={18} />
            ))}
          </div>
        </div>
      </>
    );
  }

  const { certificates, completed, activity, skills, achievements } = data;
  const nothingYet =
    certificates.length === 0 &&
    completed.length === 0 &&
    skills.length === 0 &&
    achievements.length === 0;

  return (
    <>
      {head}

      {/* ---- the measured facts, before anything else ---------------- */}
      <div className="lms-stats">
        <StatCard
          value={`${activity?.current_streak ?? 0} ${t("lms.days")}`}
          label={t("lms.stats.streak")}
        />
        <StatCard
          value={`${activity?.best_streak ?? 0} ${t("lms.days")}`}
          label={t("lms.ach.longest")}
        />
        <StatCard value={completed.length} label={t("lms.stats.completed")} />
        <StatCard value={certificates.length} label={t("lms.stats.certificates")} />
      </div>

      {nothingYet ? (
        <div className="lms-sec">
          <EmptyState
            title={t("lms.ach.empty")}
            hint={t("lms.ach.emptyHint")}
            action={
              <Link className="lms-btn lms-btn-primary" href="/dasturlar">
                {t("lms.courses.explore")}
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/* ---- what happened, in order ------------------------------ */}
          {achievements.length > 0 && (
            <section className="lms-sec">
              <SectionHead
                title={t("port.achievements")}
                href="/kabinet/portfolio"
                linkLabel={t("port.view")}
              />
              <AchievementTimeline achievements={achievements.slice(0, 8)} />
            </section>
          )}

          {/* ---- certificates: the strongest thing she holds ---------- */}
          <section className="lms-sec">
            <SectionHead title={t("lms.profile.certificates")} />
            {certificates.length ? (
              <div className="lms-badges">
                {certificates.map((certificate) => (
                  <CertificateCard key={certificate.id} certificate={certificate} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={t("lms.profile.noCertificates")}
                hint={t("lms.profile.noCertificatesHint")}
              />
            )}
          </section>

          {/* ---- courses finished ------------------------------------ */}
          {completed.length > 0 && (
            <section className="lms-sec">
              <SectionHead title={t("lms.stats.completed")} />
              <div className="lms-courses">
                {completed.map((enrollment) => (
                  <article key={enrollment.id} className="lms-course">
                    <div className="lms-course-top">
                      <Cover
                        tone={art(enrollment.program?.category ?? "").tone}
                        emblem={art(enrollment.program?.category ?? "").emblem}
                      />
                      <div style={{ minWidth: 0 }}>
                        <h3 className="lms-course-title">
                          <Link href={`/talim/kurslar/${enrollment.program?.slug ?? ""}`}>
                            {tx(enrollment.program?.title_i18n ?? {})}
                          </Link>
                        </h3>
                        {enrollment.program?.provider && (
                          <p className="lms-course-by">{enrollment.program.provider}</p>
                        )}
                      </div>
                    </div>
                    <div className="lms-course-foot">
                      <Badge tone="done">{t("lms.status.completed")}</Badge>
                      {enrollment.completed_at && (
                        <span className="lms-stat-label" style={{ marginLeft: "auto" }}>
                          <EarnedDate date={enrollment.completed_at.slice(0, 10)} />
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ---- what those courses taught --------------------------- */}
          {skills.length > 0 && (
            <section className="lms-sec">
              <SectionHead title={t("skill.section")} href="/kabinet" linkLabel={t("common.open")} />
              <div className="lms-chips">
                {skills.map((item: UserSkill) => (
                  <span
                    key={item.skill.slug ?? item.skill.label}
                    className="lms-chip lms-chip-static"
                  >
                    {tx(item.skill.name_i18n) || item.skill.label}
                    {" · "}
                    {t(`skill.status.${item.status}` as never)}
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

/* ---- pieces ---------------------------------------------------------- */

/** One certificate. It names the course it certifies and carries its serial —
 *  the two things an employer checking it actually asks for. */
function CertificateCard({ certificate }: { certificate: Certificate }) {
  const { t, tx } = useI18n();

  return (
    <article className="lms-trophy">
      <span className="lms-trophy-mark" aria-hidden="true">🏅</span>
      <h3 className="lms-trophy-title">{tx(certificate.program_title_i18n)}</h3>
      <p className="lms-trophy-desc">{certificate.serial_number}</p>
      <span className="lms-stat-label" style={{ marginTop: "auto" }}>
        {t("lms.ach.earnedOn")}: <EarnedDate date={certificate.issued_at.slice(0, 10)} />
      </span>
    </article>
  );
}

/** The month comes out of the message catalogue rather than `Intl`, which is
 *  the portal's existing habit: it is the one source that also covers the
 *  Cyrillic Uzbek script, where a BCP-47 tag would fall back to Latin. */
function EarnedDate({ date }: { date: string }) {
  const { t } = useI18n();
  const parsed = new Date(`${date}T00:00:00`);
  return (
    <time dateTime={date}>
      {parsed.getDate()} {t(monthKey(parsed.getMonth() + 1))} {parsed.getFullYear()}
    </time>
  );
}
