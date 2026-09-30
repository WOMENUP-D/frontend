"use client";

/**
 * A portfolio its owner chose to publish, as a stranger reads it.
 *
 * Read-only, and assembled by the server from only what she marked public:
 * her first name, her profession, her own words, and the sections she left
 * switched on. A hidden section is absent rather than empty — the page never
 * says "no certificates" about something she simply chose not to show.
 *
 * Skill sources are shown as kinds ("mentor's verification"), never by name:
 * a source can be a project she kept private or a task she never chose to
 * show. Practical work links nowhere, because the task pages are hers.
 */

import { useParams } from "next/navigation";
import { useI18n } from "@/i18n";
import { portal } from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import { ErrorNote, Loading } from "@/components/ui";
import {
  AchievementTimeline,
  CertificateList,
  EmptyLine,
  PracticeList,
  ProjectCard,
  Section,
  SkillLadder,
} from "@/components/portfolio/Sections";

function fill(text: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((out, [k, v]) => out.split(`{${k}}`).join(v), text);
}

export default function PublicPortfolioPage() {
  const { t } = useI18n();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const { data, loading, error, retry } = useApi(() => portal.publicPortfolio(slug), [slug]);

  if (loading) {
    return (
      <main className="wrap page pf-page" aria-busy="true">
        <Loading rows={4} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="wrap page pf-page">
        <ErrorNote message={t("lms.err.title")} />
        <button type="button" className="btn btn-outline btn-sm" onClick={retry}>
          {t("lms.err.retry")}
        </button>
      </main>
    );
  }

  // Private, withdrawn, unknown — the server answers them all the same way,
  // and so does this page.
  if (!data) {
    return (
      <main className="wrap page pf-page">
        <h1 className="pf-h1">{t("port.pub.notFound")}</h1>
        <p className="pf-bio pf-muted">{t("port.pub.notFoundHint")}</p>
      </main>
    );
  }

  const skillCount = data.skills
    ? data.skills.learned.length + data.skills.assessed.length + data.skills.verified.length
    : 0;

  return (
    <main className="wrap page pf-page">
      <header className="pf-header">
        <div className="pf-header-text">
          <h1 className="pf-h1">
            {data.first_name ? fill(t("port.pub.title"), { name: data.first_name }) : t("port.pub.anon")}
          </h1>
          {data.profession && <p className="pf-profession">{data.profession}</p>}
          {data.bio && <p className="pf-bio">{data.bio}</p>}
          <p className="pf-note">{t("port.pub.note")}</p>
        </div>
      </header>

      {data.skills && (
        <Section id="skills" title={t("port.skills")} count={skillCount}>
          {skillCount ? (
            <SkillLadder skills={data.skills} showSources={false} />
          ) : (
            <EmptyLine text={t("port.rung.empty")} />
          )}
        </Section>
      )}

      {data.certificates && data.certificates.length > 0 && (
        <Section id="certificates" title={t("port.certificates")} count={data.certificates.length}>
          <CertificateList certificates={data.certificates} />
        </Section>
      )}

      {data.achievements && data.achievements.length > 0 && (
        <Section id="achievements" title={t("port.achievements")} count={data.achievements.length}>
          <AchievementTimeline achievements={data.achievements} />
        </Section>
      )}

      {data.practice && data.practice.length > 0 && (
        <Section id="practice" title={t("port.practice")} count={data.practice.length}>
          <PracticeList practice={data.practice} linked={false} />
        </Section>
      )}

      {data.projects.length > 0 && (
        <Section id="projects" title={t("port.projects")} count={data.projects.length}>
          <div className="pf-projects">
            {data.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}
