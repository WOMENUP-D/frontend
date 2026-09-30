"use client";

/**
 * The learning dashboard.
 *
 * One question decides the layout: what is she here to do right now? Almost
 * always, continue the thing she was last doing. So "Continue learning" is the
 * only near-black surface on the screen and everything else — progress,
 * courses, what she has earned, the assistant — is quiet and outlined behind
 * it. Spend the boldness once.
 *
 * Everything on this page is her own record: the courses she enrolled in, the
 * progress the server computed, the certificates she holds and the skills those
 * courses taught. Nothing is estimated, and a figure the platform does not have
 * is simply not shown.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import {
  portal,
  type ActivitySummary,
  type Certificate,
  type EnrollmentDetail,
  type LearningPathDetail,
  type ProgramDetail,
  type Recommendations,
  type SkillProfile,
} from "@/services/portal";
import { getAccessToken } from "@/services/api";
import { useApi } from "@/components/learning/useApi";
import { nextLessonOf, viewsOf } from "@/components/learning/course";
import {
  CourseCard,
  EmptyState,
  ErrorState,
  NeedsAccount,
  PathCard,
  Ring,
  SectionHead,
  Skeleton,
  SkeletonBlock,
  SkeletonCards,
  StatCard,
} from "@/components/learning/ui";

/** Resolved after mount: the hour is a client fact, and reading it during
 *  render would make the server and the browser disagree. */
function useGreeting(): MessageKey | null {
  const [key, setKey] = useState<MessageKey | null>(null);
  useEffect(() => {
    const hour = new Date().getHours();
    setKey(
      hour < 12 ? "lms.greet.morning" : hour < 18 ? "lms.greet.afternoon" : "lms.greet.evening",
    );
  }, []);
  return key;
}

export default function LearningDashboard() {
  const { t, tx } = useI18n();
  const greeting = useGreeting();
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => setAuthed(Boolean(getAccessToken())), []);

  const { data, loading, error, retry } = useApi(async () => {
    const [enrollments, activity, certificates, skills, recommendations, paths] =
      await Promise.all([
        portal.myEnrollments(),
        portal.activity().catch(() => null as ActivitySummary | null),
        portal.myCertificates().catch(() => [] as Certificate[]),
        portal.mySkills().catch(() => null as SkillProfile | null),
        portal.recommendations().catch(() => null as Recommendations | null),
        portal.myLearningPaths().catch(() => [] as LearningPathDetail[]),
      ]);

    // The course she was last working on decides the hero. Its lessons are not
    // in the enrollment list, so the one course she is resuming is fetched in
    // full — and only that one.
    const resume =
      enrollments.find((item) => item.status === "in_progress" && item.program) ?? null;
    const detail: ProgramDetail | null = resume?.program
      ? await portal.programBySlug(resume.program.slug).catch(() => null)
      : null;

    return {
      enrollments, activity, certificates, skills, recommendations, paths, resume, detail,
    };
  });

  const head = <Head greeting={greeting} />;

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
        <Skeleton height={186} radius={28} />
        <div className="lms-sec">
          <SkeletonBlock rows={1} />
        </div>
        <div className="lms-sec">
          <SkeletonCards rows={3} />
        </div>
      </>
    );
  }

  const { enrollments, activity, certificates, skills, recommendations, paths, resume, detail } =
    data;
  const views = viewsOf(enrollments);
  const completed = enrollments.filter((item) => item.status === "completed").length;
  const inProgress = enrollments.filter((item) => item.status === "in_progress").length;
  const learned = (skills?.skills ?? []).filter((item) => item.status !== "self_reported");
  const suggestion = recommendations?.programs[0] ?? null;

  return (
    <>
      {head}

      {/* ---- the one thing to press --------------------------------- */}
      {resume && detail ? (
        <Resume enrollment={resume} detail={detail} />
      ) : (
        <EmptyState
          title={t("lms.continue.empty")}
          hint={t("lms.continue.emptyHint")}
          action={
            <Link className="lms-btn lms-btn-primary" href="/dasturlar">
              {t("lms.courses.explore")}
            </Link>
          }
        />
      )}

      {/* ---- progress ------------------------------------------------ */}
      <section className="lms-sec">
        <SectionHead title={t("lms.stats.title")} />
        <div className="lms-stats">
          <StatCard value={completed} label={t("lms.stats.completed")} />
          <StatCard value={inProgress} label={t("lms.stats.inProgress")} />
          <StatCard value={certificates.length} label={t("lms.stats.certificates")} />
          {/* The streak is counted from what she actually did, in the same
              place the cabinet counts it. */}
          <StatCard
            value={<>{activity?.current_streak ?? 0} <span aria-hidden="true">🔥</span></>}
            label={t("lms.stats.streak")}
          />
        </div>
      </section>

      <div className="lms-sec lms-split">
        <div className="lms-col">
          {/* ---- her courses ---------------------------------------- */}
          <section>
            <SectionHead
              title={t("lms.courses.title")}
              href="/talim/kurslar"
              linkLabel={t("lms.courses.all")}
            />
            {views.length ? (
              <div className="lms-courses">
                {views.slice(0, 4).map((view) => (
                  <CourseCard key={view.program.id} view={view} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={t("lms.courses.empty")}
                hint={t("lms.courses.emptyHint")}
                action={
                  <Link className="lms-btn lms-btn-primary" href="/dasturlar">
                    {t("lms.courses.explore")}
                  </Link>
                }
              />
            )}
          </section>

          {/* ---- the route she is on -------------------------------- */}
          {/* Shown only when she is actually on one. A "My learning paths"
              heading over an empty box would be the dashboard inventing a
              commitment she has not made. */}
          {paths.length > 0 && (
            <section>
              <SectionHead
                title={t("lms.path.mine")}
                href="/talim/yollar"
                linkLabel={t("cab.seeAll")}
              />
              <div className="lms-paths">
                {paths.slice(0, 2).map((path) => (
                  <PathCard key={path.id} path={path} />
                ))}
              </div>
            </section>
          )}

          {/* ---- one recommendation, with its reason ----------------- */}
          {suggestion && (
            <section>
              <SectionHead title={t("lms.rec.title")} />
              <article className="lms-card lms-card-pad lms-rec">
                <h3 className="lms-course-title">
                  <Link href={`/talim/kurslar/${suggestion.slug}`}>
                    {tx(suggestion.title_i18n)}
                  </Link>
                </h3>

                {/* The engine's reason, shown before anything else: a
                    suggestion without one is just an advertisement. */}
                <p className="lms-rec-why">
                  {suggestion.new_skills.length > 0
                    ? `${t("ins.skills")}: ${suggestion.new_skills
                        .map((skill) => tx(skill.name_i18n) || skill.label)
                        .join(", ")}`
                    : t(`cat.${suggestion.category}` as MessageKey)}
                </p>

                <div>
                  <Link
                    className="lms-btn lms-btn-primary"
                    href={`/talim/kurslar/${suggestion.slug}`}
                  >
                    {t("lms.course.view")}
                  </Link>
                </div>
              </article>
            </section>
          )}
        </div>

        <div className="lms-col">
          {/* ---- what she has earned -------------------------------- */}
          <section className="lms-card lms-card-pad">
            <SectionHead
              title={t("lms.profile.certificates")}
              href="/talim/yutuqlar"
              linkLabel={t("cab.seeAll")}
            />
            {certificates.length ? (
              <div className="lms-res">
                {certificates.slice(0, 3).map((certificate) => (
                  <div key={certificate.id} className="lms-event">
                    <div className="lms-event-body">
                      <div className="lms-event-title">
                        {tx(certificate.program_title_i18n)}
                      </div>
                      <div className="lms-event-meta">{certificate.serial_number}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="lms-lead" style={{ margin: 0 }}>
                {t("lms.profile.noCertificatesHint")}
              </p>
            )}
          </section>

          {/* ---- what the courses taught ---------------------------- */}
          <section className="lms-card lms-card-pad">
            <SectionHead title={t("skill.section")} href="/kabinet" linkLabel={t("common.open")} />
            {learned.length ? (
              <div className="lms-chips">
                {learned.slice(0, 8).map((item) => (
                  <span key={item.skill.slug ?? item.skill.label} className="lms-chip lms-chip-static">
                    {tx(item.skill.name_i18n) || item.skill.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="lms-lead" style={{ margin: 0 }}>{t("skill.none")}</p>
            )}
          </section>

          {/* ---- the assistant --------------------------------------- */}
          <section className="lms-ai">
            <div className="lms-ai-head">
              <span className="lms-ai-mark" aria-hidden="true">◈</span>
              <h2 className="lms-ai-title">{t("lms.ai.title")}</h2>
            </div>
            <p className="lms-lead" style={{ margin: "12px 0 14px", fontSize: "0.92rem" }}>
              {t("lms.ai.lead")}
            </p>
            <div style={{ marginTop: 16 }}>
              <Link className="lms-btn lms-btn-primary" href="/yordamchi">
                {t("lms.ai.ask")}
              </Link>
            </div>
            <p className="lms-disclaimer">{t("lms.ai.disclaimer")}</p>
          </section>
        </div>
      </div>
    </>
  );
}

/* ---- pieces ---------------------------------------------------------- */

function Head({ greeting }: { greeting: MessageKey | null }) {
  const { t } = useI18n();
  const [name, setName] = useState("");

  // Her own name, from her own profile — not a constant in the source.
  useEffect(() => {
    portal
      .profile()
      .then((profile) => {
        const full = (profile as { full_name: string | null }).full_name ?? "";
        setName(full.split(" ")[0] ?? "");
      })
      .catch(() => setName(""));
  }, []);

  return (
    <header className="lms-head">
      <h1 className="lms-h1">
        {greeting ? `${t(greeting)}${name ? `, ${name}` : ""}` : name}{" "}
        <span aria-hidden="true">👋</span>
      </h1>
      <p className="lms-lead">{t("lms.greet.sub")}</p>
    </header>
  );
}

/** The course she was last working on, and the lesson it opens at. */
function Resume({
  enrollment, detail,
}: { enrollment: EnrollmentDetail; detail: ProgramDetail }) {
  const { t, tx } = useI18n();
  const next = nextLessonOf(detail, enrollment);

  return (
    <section className="lms-hero">
      <div style={{ minWidth: 0 }}>
        <span className="lms-hero-label">{t("lms.continue.title")}</span>
        <h2 className="lms-hero-title">{tx(detail.title_i18n)}</h2>

        {next && (
          <p className="lms-hero-lesson">
            {t("lms.continue.current")}: <strong>{tx(next.title_i18n)}</strong>
          </p>
        )}

        <div className="lms-hero-bar">
          <span style={{ width: `${enrollment.progress_percent}%` }} />
        </div>

        <Link
          className="lms-hero-cta"
          href={
            next
              ? `/talim/kurslar/${detail.slug}/${next.slug}`
              : `/talim/kurslar/${detail.slug}`
          }
        >
          {t("lms.continue.action")}
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="lms-hero-side">
        <Ring percent={enrollment.progress_percent} size={116} onDark />
      </div>
    </section>
  );
}
