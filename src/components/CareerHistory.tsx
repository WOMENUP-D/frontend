"use client";

/**
 * Where she has worked and where she has studied — the CV half of her profile.
 *
 * Read the way a CV is read: the place first, what she did there under it, and
 * when, newest at the top and whatever is still running above all of it. A thin
 * line down the left joins the entries, because a working life is one path and
 * not a stack of cards; the dot of the entry that is still running is filled.
 *
 * Editing happens in place. The form opens where the entry was, so she never
 * loses sight of the rest of the list, and it asks for the month and the year
 * only — nobody remembers the day she started a job.
 */

import { useEffect, useMemo, useState } from "react";
import {
  portal,
  type StudyEntry,
  type StudyEntryIn,
  type WorkEntry,
  type WorkEntryIn,
} from "@/services/portal";
import { typeset, useI18n, type MessageKey } from "@/i18n";

type Kind = "work" | "study";
type Entry = WorkEntry | StudyEntry;

const MONTHS: MessageKey[] = [
  "mn.1", "mn.2", "mn.3", "mn.4", "mn.5", "mn.6",
  "mn.7", "mn.8", "mn.9", "mn.10", "mn.11", "mn.12",
];

/** The level codes the questionnaire already uses, plus the two it does not. */
const DEGREES: ReadonlyArray<[string, MessageKey]> = [
  ["school", "cv.deg.school"],
  ["college", "cv.deg.college"],
  ["bachelor", "cv.deg.bachelor"],
  ["master", "cv.deg.master"],
  ["phd", "cv.deg.phd"],
  ["courses", "cv.deg.courses"],
  ["other", "cv.deg.other"],
];

interface Draft {
  primary: string;
  secondary: string;
  degree: string;
  location: string;
  startM: string;
  startY: string;
  endM: string;
  endY: string;
  current: boolean;
  description: string;
  clientRef?: string;
}

const EMPTY: Draft = {
  primary: "", secondary: "", degree: "", location: "",
  startM: "", startY: "", endM: "", endY: "", current: false, description: "",
};

function parts(iso: string | null): [string, string] {
  if (!iso) return ["", ""];
  const [y, m] = iso.split("-");
  return [String(Number(m)), y];
}

function iso(month: string, year: string): string | null {
  return month && year ? `${year}-${month.padStart(2, "0")}-01` : null;
}

/** Months from start to end, both counted — a job from March to March is a month. */
function monthsBetween(start: string, end: string | null): number {
  const [sy, sm] = start.split("-").map(Number);
  const now = new Date();
  const [ey, em] = end ? end.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  return Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
}

function toDraft(kind: Kind, entry: Entry | null): Draft {
  if (!entry) return { ...EMPTY, clientRef: crypto.randomUUID() };
  const [startM, startY] = parts(entry.start_date);
  const [endM, endY] = parts(entry.end_date);
  const work = kind === "work" ? (entry as WorkEntry) : null;
  const study = kind === "study" ? (entry as StudyEntry) : null;
  return {
    primary: work?.organization ?? study?.institution ?? "",
    secondary: work?.position ?? study?.field_of_study ?? "",
    degree: study?.degree ?? "",
    location: work?.location ?? "",
    startM, startY, endM, endY,
    // No end date on a saved entry means she is still there.
    current: !entry.end_date,
    description: entry.description ?? "",
  };
}

export function CareerHistory() {
  return (
    <>
      <CvSection kind="work" />
      <CvSection kind="study" />
    </>
  );
}

function CvSection({ kind }: { kind: Kind }) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  // Which entry the form is open on: its id, "new", or nothing.
  const [open, setOpen] = useState<string | null>(null);

  const load = useMemo(
    () => (kind === "work" ? portal.experience : portal.education),
    [kind],
  );

  useEffect(() => {
    load()
      .then((rows) => setEntries(rows))
      .catch(() => setEntries([]));
  }, [load]);

  function saved(entry: Entry) {
    // The server orders the list; ask it rather than guess where this one goes.
    load().then(setEntries).catch(() => {
      setEntries((prev) => [entry, ...(prev ?? []).filter((e) => e.id !== entry.id)]);
    });
    setOpen(null);
  }

  function removed(id: string) {
    setEntries((prev) => (prev ?? []).filter((e) => e.id !== id));
    setOpen(null);
  }

  const title = t(kind === "work" ? "cv.work" : "cv.study");

  return (
    <section className="pcard-block cv" aria-label={title}>
      <h3>
        {kind === "work" ? <IconWork /> : <IconStudy />} {title}
      </h3>

      {entries === null ? null : (
        <>
          {entries.length === 0 && open !== "new" && (
            <p className="cv-empty">{t(kind === "work" ? "cv.emptyWork" : "cv.emptyStudy")}</p>
          )}

          {(entries.length > 0 || open === "new") && (
            <ol className="cv-list">
              {open === "new" && (
                <li className="cv-item cv-item-editing">
                  <CvForm kind={kind} entry={null} onSaved={saved} onCancel={() => setOpen(null)} />
                </li>
              )}
              {entries.map((entry) =>
                open === entry.id ? (
                  <li key={entry.id} className="cv-item cv-item-editing">
                    <CvForm
                      kind={kind}
                      entry={entry}
                      onSaved={saved}
                      onDeleted={() => removed(entry.id)}
                      onCancel={() => setOpen(null)}
                    />
                  </li>
                ) : (
                  <CvItem
                    key={entry.id}
                    kind={kind}
                    entry={entry}
                    onEdit={open === null ? () => setOpen(entry.id) : undefined}
                  />
                ),
              )}
            </ol>
          )}

          {open === null && (
            <button type="button" className="cv-add" onClick={() => setOpen("new")}>
              <span aria-hidden="true">+</span> {t(kind === "work" ? "cv.addWork" : "cv.addStudy")}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function CvItem({ kind, entry, onEdit }: { kind: Kind; entry: Entry; onEdit?: () => void }) {
  const { t } = useI18n();
  const month = (iso: string) => {
    const [y, m] = iso.split("-").map(Number);
    return `${t(MONTHS[m - 1])} ${y}`;
  };

  let primary: string;
  let secondary: string;
  let place: string | null = null;
  let when = "";

  if (kind === "work") {
    const job = entry as WorkEntry;
    primary = job.organization;
    secondary = job.position;
    place = job.location;
    if (job.start_date) {
      const span = monthsBetween(job.start_date, job.end_date);
      const years = Math.floor(span / 12);
      const months = span % 12;
      const length = [
        years ? `${years} ${t("cv.yr")}` : "",
        months ? `${months} ${t("cv.mo")}` : "",
      ].filter(Boolean).join(" ");
      when = `${month(job.start_date)} — ${job.end_date ? month(job.end_date) : t("cv.present")} · ${length}`;
    } else if (job.end_date) {
      when = month(job.end_date);
    }
  } else {
    // A place of study is remembered by its years, not its months.
    const study = entry as StudyEntry;
    primary = study.institution;
    const degree = DEGREES.find(([code]) => code === study.degree);
    secondary = [degree ? t(degree[1]) : study.degree, study.field_of_study].filter(Boolean).join(", ");
    const from = study.start_date?.slice(0, 4);
    const to = study.end_date ? study.end_date.slice(0, 4) : from ? t("cv.present") : "";
    when = [from, to].filter(Boolean).join(" — ");
  }

  const current = !entry.end_date && Boolean(entry.start_date);

  return (
    <li className={current ? "cv-item cv-item-current" : "cv-item"}>
      <div className="cv-head">
        {/* Her own words, typed with the Uzbek okina, get the same glyph swap the
            interface strings do — otherwise "doʻkon" breaks apart in the body face. */}
        <span className="cv-primary">{typeset(primary)}</span>
        {onEdit && (
          <button type="button" className="cv-edit" onClick={onEdit}>
            {t("cv.edit")}
          </button>
        )}
      </div>
      {secondary && <span className="cv-secondary">{typeset(secondary)}</span>}
      {(when || place) && (
        <span className="cv-when">{typeset([when, place].filter(Boolean).join(" · "))}</span>
      )}
      {entry.description && <p className="cv-desc">{typeset(entry.description)}</p>}
    </li>
  );
}

function CvForm({
  kind,
  entry,
  onSaved,
  onDeleted,
  onCancel,
}: {
  kind: Kind;
  entry: Entry | null;
  onSaved: (entry: Entry) => void;
  onDeleted?: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft>(() => toDraft(kind, entry));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [confirming, setConfirming] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const start = iso(draft.startM, draft.startY);
  const end = draft.current ? null : iso(draft.endM, draft.endY);
  // A half-picked date (a month and no year) is not a date yet.
  const halfStart = Boolean(draft.startM) !== Boolean(draft.startY);
  const halfEnd = !draft.current && Boolean(draft.endM) !== Boolean(draft.endY);
  const backwards = Boolean(start && end && end < start);
  const valid =
    draft.primary.trim().length > 0 &&
    (kind === "study" || draft.secondary.trim().length > 0) &&
    !halfStart && !halfEnd && !backwards;

  const idBase = entry?.id ?? "new";
  const years = useMemo(() => {
    const top = new Date().getFullYear() + 1;
    return Array.from({ length: top - 1950 + 1 }, (_, i) => String(top - i));
  }, []);

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const common = {
      start_date: start,
      end_date: end,
      description: draft.description.trim() || null,
      client_ref: draft.clientRef,
    };
    try {
      let result: Entry;
      if (kind === "work") {
        const body: WorkEntryIn = {
          ...common,
          organization: draft.primary.trim(),
          position: draft.secondary.trim(),
          location: draft.location.trim() || null,
        };
        result = entry
          ? await portal.saveExperience(entry.id, body)
          : await portal.addExperience(body);
      } else {
        const body: StudyEntryIn = {
          ...common,
          institution: draft.primary.trim(),
          degree: draft.degree || null,
          field_of_study: draft.secondary.trim() || null,
        };
        result = entry
          ? await portal.saveEducation(entry.id, body)
          : await portal.addEducation(body);
      }
      onSaved(result);
    } catch {
      setError("cv.err");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!entry || busy) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    try {
      await (kind === "work" ? portal.deleteExperience(entry.id) : portal.deleteEducation(entry.id));
      onDeleted?.();
    } catch {
      setError("cv.err");
      setBusy(false);
    }
  }

  const monthYear = (
    which: "start" | "end",
    month: string,
    year: string,
    disabled = false,
  ) => (
    <div className="cv-when-pick">
      <select
        className="input"
        aria-label={`${t(which === "start" ? "cv.start" : "cv.end")} — ${t("cv.month")}`}
        value={month}
        disabled={disabled}
        onChange={(e) => set(which === "start" ? "startM" : "endM", e.target.value)}
      >
        <option value="">{t("cv.month")}</option>
        {MONTHS.map((key, i) => (
          <option key={key} value={String(i + 1)}>{t(key)}</option>
        ))}
      </select>
      <select
        className="input"
        aria-label={`${t(which === "start" ? "cv.start" : "cv.end")} — ${t("cv.year")}`}
        value={year}
        disabled={disabled}
        onChange={(e) => set(which === "start" ? "startY" : "endY", e.target.value)}
      >
        <option value="">{t("cv.year")}</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );

  return (
    <form
      className="cv-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="field">
        <label className="label" htmlFor={`${idBase}-primary`}>
          {t(kind === "work" ? "cv.org" : "cv.institution")}
        </label>
        <input
          id={`${idBase}-primary`}
          className="input"
          value={draft.primary}
          maxLength={200}
          placeholder={t(kind === "work" ? "cv.orgPh" : "cv.institutionPh")}
          onChange={(e) => set("primary", e.target.value)}
          autoFocus
        />
      </div>

      {kind === "work" ? (
        <>
          <div className="field">
            <label className="label" htmlFor={`${idBase}-secondary`}>{t("cv.position")}</label>
            <input
              id={`${idBase}-secondary`}
              className="input"
              value={draft.secondary}
              maxLength={160}
              placeholder={t("cv.positionPh")}
              onChange={(e) => set("secondary", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor={`${idBase}-location`}>{t("cv.location")}</label>
            <input
              id={`${idBase}-location`}
              className="input"
              value={draft.location}
              maxLength={120}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label className="label" htmlFor={`${idBase}-degree`}>{t("cv.degree")}</label>
            <select
              id={`${idBase}-degree`}
              className="input"
              value={draft.degree}
              onChange={(e) => set("degree", e.target.value)}
            >
              <option value="">{t("cv.degreePick")}</option>
              {DEGREES.map(([code, key]) => (
                <option key={code} value={code}>{t(key)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor={`${idBase}-secondary`}>{t("cv.field")}</label>
            <input
              id={`${idBase}-secondary`}
              className="input"
              value={draft.secondary}
              maxLength={160}
              onChange={(e) => set("secondary", e.target.value)}
            />
          </div>
        </>
      )}

      <fieldset className="cv-dates">
        <div className="field">
          <span className="label">{t("cv.start")}</span>
          {monthYear("start", draft.startM, draft.startY)}
        </div>
        <div className="field">
          <span className="label">{t("cv.end")}</span>
          {monthYear("end", draft.endM, draft.endY, draft.current)}
        </div>
      </fieldset>
      <label className="auth-consent">
        <input
          type="checkbox"
          checked={draft.current}
          onChange={(e) => set("current", e.target.checked)}
        />
        <span>{t(kind === "work" ? "cv.nowWork" : "cv.nowStudy")}</span>
      </label>
      {backwards && <span className="cv-error small">{t("cv.endBeforeStart")}</span>}

      <div className="field">
        <label className="label" htmlFor={`${idBase}-about`}>{t("cv.about")}</label>
        <textarea
          id={`${idBase}-about`}
          className="input"
          rows={3}
          maxLength={2000}
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      {error && <div className="notice notice-red small">{t(error)}</div>}

      <div className="cv-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={!valid || busy}>
          {t(busy ? "cv.saving" : "cv.save")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>
          {t("cv.cancel")}
        </button>
        {entry && (
          <button
            type="button"
            className={confirming ? "cv-delete cv-delete-armed" : "cv-delete"}
            onClick={remove}
            disabled={busy}
          >
            {t(confirming ? "cv.deleteConfirm" : "cv.delete")}
          </button>
        )}
      </div>
    </form>
  );
}

/** Briefcase. */
function IconWork() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="7.5" width="19" height="12.5" rx="2.5" />
      <path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7" />
      <path d="M2.5 12.5h19" />
    </svg>
  );
}

/** Graduation cap. */
function IconStudy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4 2.5 8.6 12 13.2l9.5-4.6L12 4Z" />
      <path d="M6.6 10.8v4.6c0 1.6 2.4 2.9 5.4 2.9s5.4-1.3 5.4-2.9v-4.6" />
      <path d="M21.5 8.6v5.2" />
    </svg>
  );
}
