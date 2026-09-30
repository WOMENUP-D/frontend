"use client";

/**
 * Adding or editing a portfolio project.
 *
 * A native `<dialog>` opened with `showModal()`: focus is trapped inside it,
 * Escape closes it and the page behind is inert — the accessible behaviour
 * comes from the platform instead of being rebuilt. On a phone it fills the
 * screen, because a form with nine fields in a floating box is a form nobody
 * finishes.
 *
 * Skills are picked from the WomanUP list, never typed free: the server
 * refuses a skill it does not know, and a picker that only offers real ones
 * means she never meets that refusal. A retried save carries the same
 * `client_ref`, so a double tap cannot make two projects.
 *
 * Deleting asks once, in words, what it will do — the evidence the project
 * added to her skills is withdrawn with it.
 */

import { useEffect, useRef, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { ApiError } from "@/services/api";
import { portal, type PortfolioProject, type ProjectInput } from "@/services/portal";

interface PickedSkill {
  slug: string;
  name_i18n: Record<string, string>;
}

function fill(text: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((out, [k, v]) => out.split(`{${k}}`).join(v), text);
}

function newRef(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ProjectDialog({
  open,
  project,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  /** The project being edited, or null to add one. */
  project: PortfolioProject | null;
  onClose: () => void;
  onSaved: (project: PortfolioProject) => void;
  onDeleted: (id: string) => void;
}) {
  const { t, tx } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [clientRef, setClientRef] = useState(newRef);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<PickedSkill[]>([]);
  const [projectUrl, setProjectUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [completedOn, setCompletedOn] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [query, setQuery] = useState("");
  const [found, setFound] = useState<PickedSkill[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /* Open and close through the element itself, so the browser owns focus and
     Escape. Each opening starts a fresh form and a fresh idempotency key. */
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTitle(project?.title ?? "");
      setSummary(project?.summary ?? "");
      setDescription(project?.description ?? "");
      setSkills(
        (project?.skills ?? [])
          .filter((skill) => skill.slug)
          .map((skill) => ({ slug: skill.slug as string, name_i18n: skill.name_i18n })),
      );
      setProjectUrl(project?.project_url ?? "");
      setDemoUrl(project?.demo_url ?? "");
      setRepoUrl(project?.repo_url ?? "");
      setCompletedOn(project?.completed_on ?? "");
      setIsPublic(project?.is_public ?? false);
      setQuery("");
      setFound(null);
      setProblem(null);
      setConfirming(false);
      setClientRef(newRef());
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, project]);

  /* The picker searches the vocabulary as she types, after a short pause so a
     word typed quickly is one request rather than six. */
  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      setFound(null);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      portal
        .searchSkills(needle)
        .then((page) => live && setFound(page.items.map((item) => ({ slug: item.slug, name_i18n: item.name_i18n }))))
        .catch(() => live && setFound([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);

  function pick(skill: PickedSkill) {
    setSkills((prev) => (prev.some((item) => item.slug === skill.slug) ? prev : [...prev, skill]));
    setQuery("");
    setFound(null);
  }

  function explain(cause: unknown): string {
    if (cause instanceof ApiError) {
      const detail = cause.detail as { reason?: string; fields?: string[] } | undefined;
      if (detail?.reason === "unknown_skill") {
        return fill(t("port.err.unknown_skill"), { fields: (detail.fields ?? []).join(", ") });
      }
      if (detail?.reason) {
        const key = `port.err.${detail.reason}` as MessageKey;
        const text = t(key);
        if (text !== key) return text;
      }
    }
    return t("port.err.save");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim().length < 2) {
      setProblem(t("port.err.title"));
      return;
    }
    setBusy(true);
    setProblem(null);
    const payload: ProjectInput = {
      title: title.trim(),
      summary: summary.trim() || null,
      description: description.trim() || null,
      skills: skills.map((skill) => skill.slug),
      project_url: projectUrl.trim() || null,
      demo_url: demoUrl.trim() || null,
      repo_url: repoUrl.trim() || null,
      completed_on: completedOn || null,
      is_public: isPublic,
    };
    try {
      const saved = project
        ? await portal.updateProject(project.id, payload)
        : await portal.createProject({ ...payload, client_ref: clientRef });
      onSaved(saved);
    } catch (cause) {
      setProblem(explain(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!project) return;
    setBusy(true);
    setProblem(null);
    try {
      await portal.deleteProject(project.id);
      onDeleted(project.id);
    } catch (cause) {
      setProblem(explain(cause));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  const heading = project ? t("port.proj.editTitle") : t("port.proj.add");

  return (
    <dialog
      ref={ref}
      className="pf-dialog"
      aria-labelledby="pf-dialog-title"
      onClose={onClose}
      onCancel={(event) => {
        // Escape while saving would drop a request in flight on the floor.
        if (busy) event.preventDefault();
      }}
    >
      <form className="pf-form" onSubmit={save} noValidate>
        <div className="pf-dialog-head">
          <h2 id="pf-dialog-title" className="pf-h2">{heading}</h2>
          <button
            type="button"
            className="pf-dialog-x"
            onClick={onClose}
            aria-label={t("port.proj.close")}
            disabled={busy}
          >
            ×
          </button>
        </div>

        <label className="pf-field">
          <span className="pf-label">{t("port.proj.titleLabel")}</span>
          <input
            className="pf-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            required
            autoComplete="off"
          />
        </label>

        <label className="pf-field">
          <span className="pf-label">{t("port.proj.summaryLabel")}</span>
          <input
            className="pf-input"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={280}
            autoComplete="off"
          />
        </label>

        <label className="pf-field">
          <span className="pf-label">{t("port.proj.descriptionLabel")}</span>
          <textarea
            className="pf-input pf-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            rows={5}
          />
        </label>

        <fieldset className="pf-field pf-fieldset">
          <legend className="pf-label">{t("port.proj.skillsLabel")}</legend>
          {skills.length > 0 && (
            <ul className="pf-picked">
              {skills.map((skill) => {
                const name = tx(skill.name_i18n) || skill.slug;
                return (
                  <li key={skill.slug}>
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => setSkills((prev) => prev.filter((s) => s.slug !== skill.slug))}
                      aria-label={fill(t("port.proj.removeSkill"), { skill: name })}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <input
            className="pf-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("port.proj.skillsSearch")}
            aria-label={t("port.proj.skillsSearch")}
            aria-describedby="pf-skills-hint"
            autoComplete="off"
          />
          <span className="pf-hint" id="pf-skills-hint">{t("port.proj.skillsHint")}</span>
          {found !== null && (
            <div className="pf-found" role="list">
              {found.length ? (
                found
                  .filter((skill) => !skills.some((picked) => picked.slug === skill.slug))
                  .map((skill) => (
                    <button
                      key={skill.slug}
                      type="button"
                      role="listitem"
                      className="pf-found-item"
                      onClick={() => pick(skill)}
                    >
                      {tx(skill.name_i18n) || skill.slug}
                    </button>
                  ))
              ) : (
                <span className="pf-hint">{t("port.proj.skillsNone")}</span>
              )}
            </div>
          )}
        </fieldset>

        <div className="pf-links-grid">
          <label className="pf-field">
            <span className="pf-label">{t("port.proj.urlLabel")}</span>
            <input className="pf-input" type="url" inputMode="url" value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)} placeholder="https://" maxLength={500} />
          </label>
          <label className="pf-field">
            <span className="pf-label">{t("port.proj.demoLabel")}</span>
            <input className="pf-input" type="url" inputMode="url" value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://" maxLength={500} />
          </label>
          <label className="pf-field">
            <span className="pf-label">{t("port.proj.repoLabel")}</span>
            <input className="pf-input" type="url" inputMode="url" value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://" maxLength={500} />
          </label>
        </div>
        <span className="pf-hint">{t("port.proj.linksHint")}</span>

        <label className="pf-field">
          <span className="pf-label">{t("port.proj.completedLabel")}</span>
          <input
            className="pf-input pf-date"
            type="date"
            value={completedOn}
            onChange={(e) => setCompletedOn(e.target.value)}
            aria-describedby="pf-completed-hint"
          />
          <span className="pf-hint" id="pf-completed-hint">{t("port.proj.completedHint")}</span>
        </label>

        <label className="pf-check">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          <span>{t("port.proj.publicLabel")}</span>
        </label>

        <p className="pf-note">{t("port.proj.evidenceNote")}</p>

        {problem && (
          <p className="pf-error" role="alert">
            {problem}
          </p>
        )}

        {confirming ? (
          <div className="pf-confirm" role="group" aria-label={t("port.proj.delete")}>
            <p>{t("port.proj.deleteConfirm")}</p>
            <div className="pf-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirming(false)} disabled={busy}>
                {t("port.proj.cancel")}
              </button>
              <button type="button" className="btn pf-btn-danger btn-sm" onClick={remove} disabled={busy}>
                {t("port.proj.deleteYes")}
              </button>
            </div>
          </div>
        ) : (
          <div className="pf-actions">
            {project && (
              <button type="button" className="btn btn-ghost btn-sm pf-delete" onClick={() => setConfirming(true)} disabled={busy}>
                {t("port.proj.delete")}
              </button>
            )}
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={busy}>
              {t("port.proj.cancel")}
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {t(busy ? "port.proj.saving" : "port.proj.save")}
            </button>
          </div>
        )}
      </form>
    </dialog>
  );
}
