"use client";

/**
 * The learner's profile.
 *
 * A profile page is usually a form waiting to be filled in. This one is a
 * record of a person: who she is, what she is aiming at, and what she has
 * already earned. Nothing here is an input, because nothing here is editable
 * until the profile API exists — and a screen full of dead fields teaches her
 * that the section does not work.
 *
 * The one decision worth defending is that certificates sit at the bottom with
 * a real empty state rather than being hidden when there are none. Almost
 * every learner arrives here with zero, and an absent section answers nothing;
 * a section that says "finish a course and it appears here" answers the
 * question she actually came with.
 *
 * No near-black surface on this screen. There is no single action to press —
 * she is reading about herself — so the boldness is spent elsewhere.
 */

import Link from "next/link";
import { ProfileCard } from "@/components/ProfileCard";
import { useI18n } from "@/i18n";
import {
  courses,
  goals,
  learner,
  learningStats,
} from "@/content/learning";
import { useMockData } from "@/components/learning/useMockData";
import {
  Badge,
  Bar,
  Cover,
  EmptyState,
  ErrorState,
  SectionHead,
  Skeleton,
  SkeletonBlock,
  SkeletonCards,
  StatCard,
  monthKey,
} from "@/components/learning/ui";

export default function ProfilePage() {
  const { t, tx } = useI18n();

  const { data, loading, error, retry } = useMockData(() => ({
    facts: {
      education: learner.education,
      level: learner.level,
      interests: learner.interests,
      skills: learner.skills,
    },
    goals,
    certificates: courses.filter((course) => course.certificate),
    stats: {
      completed: learningStats.completed,
      inProgress: learningStats.inProgress,
      hours: learningStats.hours,
      streak: learningStats.streak,
    },
  }));

  // The head is drawn in every state on purpose: her name and avatar are known
  // before the record loads, and blanking them would make a slow response look
  // like a lost account.
  if (error) {
    return (
      <>
        <ProfileHead />
        <ErrorState onRetry={retry} />
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        <div className="lms-profile-row">
          <ProfileHead />
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

  const { facts, goals: goalList, certificates, stats } = data;

  return (
    <>
      {/* The card names her; the tiles say what the record adds up to. They
          are one thought, so they sit on one line — the card alone left half
          the width empty and pushed everything else below the fold. */}
      <div className="lms-profile-row">
        <ProfileHead />

        <section>
          <SectionHead title={t("lms.stats.title")} />
          <div className="lms-stats">
            <StatCard value={stats.completed} label={t("lms.stats.completed")} />
            <StatCard value={stats.inProgress} label={t("lms.stats.inProgress")} />
            <StatCard
              value={`${stats.hours}${t("common.hours").slice(0, 1)}`}
              label={t("lms.stats.hours")}
            />
            <StatCard
              value={<>{stats.streak} <span aria-hidden="true">🔥</span></>}
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
              <div className="lms-fact">
                <dt>{t("lms.profile.education")}</dt>
                <dd>{tx(facts.education)}</dd>
              </div>
              <div className="lms-fact">
                <dt>{t("lms.profile.level")}</dt>
                <dd>{tx(facts.level)}</dd>
              </div>
              <div className="lms-fact">
                <dt>{t("lms.profile.interests")}</dt>
                <dd>
                  <div className="lms-chips">
                    {facts.interests.map((interest) => (
                      <span key={interest.en} className="lms-chip lms-chip-static">{tx(interest)}</span>
                    ))}
                  </div>
                </dd>
              </div>
              <div className="lms-fact">
                <dt>{t("lms.profile.skills")}</dt>
                <dd>
                  {/* Skills are plain strings, not translatable fields: "React",
                      "Figma" and "SQL" are proper nouns and read the same in
                      every locale. Routing them through tx() would be theatre. */}
                  <div className="lms-chips">
                    {facts.skills.map((skill) => (
                      <span key={skill} className="lms-chip lms-chip-static">{skill}</span>
                    ))}
                  </div>
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="lms-col">
          {/* ---- what she is aiming at ------------------------------- */}
          <section className="lms-card lms-card-pad">
            <SectionHead
              title={t("lms.profile.goals")}
              href="/talim/maqsadlar"
              linkLabel={t("lms.goal.view")}
            />
            {goalList.length ? (
              <div style={{ display: "grid", gap: 20 }}>
                {goalList.map((goal) => (
                  <div key={goal.id}>
                    <h3 className="lms-goal-title">{tx(goal.title)}</h3>
                    <div
                      style={{
                        display: "flex", alignItems: "center", gap: 14, marginTop: 10,
                      }}
                    >
                      <span className="lms-goal-pct">{goal.percent}%</span>
                      <div style={{ flex: 1 }}><Bar percent={goal.percent} /></div>
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
                  <Link className="lms-btn lms-btn-primary" href="/talim/maqsadlar">
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
            {certificates.map((course) => (
              <article key={course.slug} className="lms-course">
                <div className="lms-course-top">
                  <Cover tone={course.tone} emblem={course.emblem} />
                  <div style={{ minWidth: 0 }}>
                    <h3 className="lms-course-title">
                      <Link href={`/talim/kurslar/${course.slug}`}>{tx(course.title)}</Link>
                    </h3>
                    <p className="lms-course-by">{tx(course.instructor)}</p>
                  </div>
                </div>
                <div className="lms-course-foot">
                  <Badge tone="done">{t("lms.status.completed")}</Badge>
                  <Link
                    className="lms-btn lms-btn-quiet lms-btn-sm"
                    href={`/talim/kurslar/${course.slug}`}
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
              <Link className="lms-btn lms-btn-primary" href="/talim/kurslar">
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

function ProfileHead() {
  const { t, tx } = useI18n();

  /* The WomanUP ID is derived from the account rather than invented per render:
     an identifier that changes when the page repaints is not an identifier.
     Until the profile endpoint is wired in, it is derived from the name. */
  const born = new Date(`${learner.birthDate}T00:00:00`);
  const now = new Date();
  const age =
    now.getFullYear() - born.getFullYear() -
    (now.getMonth() > born.getMonth() ||
      (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate())
      ? 0
      : 1);

  // "август 2026 г." reads in whichever language she is in: the month comes
  // from the catalogue, which is genitive in Russian — correct here, because
  // it follows "С нами с".
  const since = new Date(`${learner.joinedAt}T00:00:00`);
  const joined = `${t(monthKey(since.getMonth() + 1))} ${since.getFullYear()}`;

  const womanupId = Array.from(learner.fullName)
    .reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) >>> 0, 7)
    .toString(16)
    .toUpperCase()
    .padStart(8, "0")
    .slice(0, 8);

  return (
    <div className="lms-profile-card">
      {/* The card is this page's identity block, so her name is the page
          heading — there must be exactly one of those on a page. */}
      <ProfileCard
        headingLevel={1}
        name={learner.fullName}
        initials={learner.initials}
        womanupId={womanupId}
        age={age}
        city={tx(learner.region)}
        joined={joined}
        completeness={60}
      />
    </div>
  );
}
