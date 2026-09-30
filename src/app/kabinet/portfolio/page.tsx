"use client";

/**
 * Her portfolio: what she learned, what she can prove, what she built.
 *
 * It reads like a CV rather than a dashboard — one column, her name and her
 * own words at the top, then the record — because its job is to be shown to
 * somebody. The name, profession and bio are the profile's, reused rather than
 * retyped; "Edit profile" goes to where they live.
 *
 * Nothing on this page is counted in the browser. Every number is a count of
 * rows the server returned, and every section is a reading of a record another
 * part of the platform owns. The only things she writes here are her projects
 * and who may see the page.
 *
 * Visibility sits above the record rather than hidden in settings: whether a
 * stranger can read this is the most consequential fact about it.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { getAccessToken } from "@/services/api";
import {
  portal,
  type Portfolio,
  type PortfolioProject,
  type PortfolioSectionKey,
} from "@/services/portal";
import { ErrorNote, Loading, NeedsAuth } from "@/components/ui";
import {
  AchievementTimeline,
  CertificateList,
  ContentsIndex,
  EmptyLine,
  PracticeList,
  ProjectCard,
  Section,
  SkillLadder,
} from "@/components/portfolio/Sections";
import { ProjectDialog } from "@/components/portfolio/ProjectDialog";

const SECTIONS: PortfolioSectionKey[] = ["skills", "certificates", "achievements", "practice"];

export default function PortfolioPage() {
  const { t } = useI18n();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<Portfolio | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<PortfolioProject | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    portal
      .myPortfolio()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    const signedIn = Boolean(getAccessToken());
    setAuthed(signedIn);
    if (signedIn) load();
  }, [load]);

  if (authed === false) {
    return (
      <main className="wrap page">
        <NeedsAuth />
      </main>
    );
  }

  if (failed) {
    return (
      <main className="wrap page pf-page">
        <h1 className="pf-h1">{t("port.title")}</h1>
        <ErrorNote message={t("lms.err.title")} />
        <button type="button" className="btn btn-outline btn-sm" onClick={load}>
          {t("lms.err.retry")}
        </button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="wrap page pf-page" aria-busy="true">
        <h1 className="pf-h1">{t("port.title")}</h1>
        <Loading rows={4} />
      </main>
    );
  }

  const { person, overview } = data;
  const skillCount = overview.learned + overview.assessed + overview.verified;

  function openDialog(project: PortfolioProject | null) {
    setEditing(project);
    setDialogOpen(true);
  }

  return (
    <main className="wrap page pf-page">
      <header className="pf-header">
        <div className="pf-header-text">
          <h1 className="pf-h1">{person.first_name || t("port.title")}</h1>
          {person.profession && <p className="pf-profession">{person.profession}</p>}
          {person.bio ? (
            <p className="pf-bio">{person.bio}</p>
          ) : (
            <p className="pf-bio pf-muted">{t("port.lead")}</p>
          )}
        </div>
        <Link href="/welcome" className="btn btn-outline btn-sm pf-edit-profile">
          {t("port.editProfile")}
        </Link>
      </header>

      <Visibility
        portfolio={data}
        onChange={(settings) => setData((prev) => (prev ? { ...prev, settings } : prev))}
      />

      <ContentsIndex
        entries={[
          { id: "skills", label: t("port.skills"), count: skillCount },
          { id: "certificates", label: t("port.certificates"), count: overview.certificates },
          { id: "achievements", label: t("port.achievements"), count: overview.achievements },
          {
            id: "practice",
            label: t("port.practice"),
            count: overview.practice_passed + overview.practice_submitted,
          },
          { id: "projects", label: t("port.projects"), count: overview.projects },
        ]}
      />

      <Section id="skills" title={t("port.skills")} count={skillCount}>
        {skillCount ? (
          <SkillLadder skills={data.skills} />
        ) : (
          <EmptyLine
            text={t("port.empty.skills")}
            action={
              <Link href="/dasturlar" className="btn btn-outline btn-sm">
                {t("port.findCourse")}
              </Link>
            }
          />
        )}
      </Section>

      <Section id="certificates" title={t("port.certificates")} count={overview.certificates}>
        {data.certificates.length ? (
          <CertificateList certificates={data.certificates} />
        ) : (
          <EmptyLine text={t("port.empty.certificates")} />
        )}
      </Section>

      <Section id="achievements" title={t("port.achievements")} count={overview.achievements}>
        {data.achievements.length ? (
          <AchievementTimeline achievements={data.achievements} />
        ) : (
          <EmptyLine text={t("port.empty.achievements")} />
        )}
      </Section>

      <Section
        id="practice"
        title={t("port.practice")}
        count={overview.practice_passed + overview.practice_submitted}
      >
        {data.practice.length ? (
          <PracticeList practice={data.practice} />
        ) : (
          <EmptyLine
            text={t("port.empty.practice")}
            action={
              <Link href="/talim/amaliyot" className="btn btn-outline btn-sm">
                {t("port.findTask")}
              </Link>
            }
          />
        )}
      </Section>

      <Section
        id="projects"
        title={t("port.projects")}
        count={overview.projects}
        action={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openDialog(null)}>
            {t("port.proj.add")}
          </button>
        }
      >
        {data.projects.length ? (
          <div className="pf-projects">
            {data.projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                showVisibility
                onEdit={() => openDialog(project)}
              />
            ))}
          </div>
        ) : (
          <EmptyLine text={t("port.empty.projects")} />
        )}
      </Section>

      <ProjectDialog
        open={dialogOpen}
        project={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          // Re-read rather than splice: a project changes her achievements and
          // her skills' evidence too, and only the server knows how.
          setDialogOpen(false);
          load();
        }}
        onDeleted={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </main>
  );
}

/* ---- visibility ------------------------------------------------------------ */

function Visibility({
  portfolio,
  onChange,
}: {
  portfolio: Portfolio;
  onChange: (settings: Portfolio["settings"]) => void;
}) {
  const { t } = useI18n();
  const settings = portfolio.settings;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const link = settings.slug ? `${origin}/portfolio/${settings.slug}` : "";

  async function change(payload: Parameters<typeof portal.updatePortfolio>[0]) {
    setBusy(true);
    setFailed(false);
    try {
      onChange(await portal.updatePortfolio(payload));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* The link is on screen to select by hand; nothing to report. */
    }
  }

  return (
    <section className="pf-visibility" aria-labelledby="pf-vis-h">
      <div className="pf-vis-row">
        <div className="pf-vis-text">
          <h2 id="pf-vis-h" className="pf-vis-title">
            {t("port.visibility")}:{" "}
            <strong>{t(settings.is_public ? "port.public" : "port.private")}</strong>
          </h2>
          <p className="pf-vis-hint">
            {settings.can_publish
              ? t(settings.is_public ? "port.publicHint" : "port.privateHint")
              : t("port.blockedMinor")}
          </p>
        </div>
        {settings.can_publish && (
          <button
            type="button"
            className={`btn btn-sm ${settings.is_public ? "btn-outline" : "btn-primary"}`}
            onClick={() => change({ is_public: !settings.is_public })}
            disabled={busy}
            aria-pressed={settings.is_public}
          >
            {t(settings.is_public ? "port.makePrivate" : "port.makePublic")}
          </button>
        )}
      </div>

      {settings.is_public && link && (
        <div className="pf-vis-link">
          <input className="pf-input pf-link-input" value={link} readOnly aria-label={t("port.copyLink")} />
          <button type="button" className="btn btn-outline btn-sm" onClick={copy}>
            {t(copied ? "port.copied" : "port.copyLink")}
          </button>
          {/* Announced, not just redrawn: a changed button label is easy for a
              screen reader to miss. */}
          <span className="sr-only" aria-live="polite">
            {copied ? t("port.copied") : ""}
          </span>
          <a className="btn btn-ghost btn-sm" href={`/portfolio/${settings.slug}`} target="_blank" rel="noopener">
            {t("port.openPublic")}
          </a>
        </div>
      )}

      {settings.is_public && (
        <fieldset className="pf-vis-sections">
          <legend>{t("port.showSections")}</legend>
          {SECTIONS.map((section) => (
            <label key={section} className="pf-check">
              <input
                type="checkbox"
                checked={settings.sections[section] !== false}
                disabled={busy}
                onChange={(event) => change({ sections: { [section]: event.target.checked } })}
              />
              <span>{t(`port.${section}` as "port.skills")}</span>
            </label>
          ))}
        </fieldset>
      )}

      {failed && (
        <p className="pf-error" role="alert">
          {t("port.err.visibility")}
        </p>
      )}
    </section>
  );
}
