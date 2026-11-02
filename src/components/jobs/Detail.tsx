"use client";

/**
 * The parts of a listing's page: what it means for her, what it asks for, and
 * applying.
 *
 * "What this means for you" is built from records only — each skill she holds
 * with how she holds it and where it came from, each one she is missing with
 * the real course that teaches it (or a plain "no course yet"), her career
 * direction, her region — and it ends by saying who decides.
 *
 * Applying is two steps on purpose: the button, then a confirm panel that says
 * exactly which fields leave WomanUP and for which platform, and what does not.
 * For a partner listing she ticks a box that is her consent; it is recorded
 * before anything is sent. For a listing an organisation published on WomanUP
 * nothing leaves the platform: the box is her consent for that one
 * organisation to read the listed fields here. The server checks all of it
 * again. A vacancy read from hh.uz is applied to on hh.uz: the panel is one
 * link out, and it says that nothing is sent.
 *
 * "Courses for this vacancy's requirements" is the server's choice, the same
 * for everyone: the catalogue's courses that teach what the listing asks for,
 * chosen by the model when it is on and by skill overlap when it is not — the
 * panel says which, and that the choice is a suggestion.
 */

import Link from "next/link";
import { useId, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { ApiError } from "@/services/api";
import {
  portal,
  type ApplicationRecord,
  type OpportunityDetail,
  type SuggestedCourse,
} from "@/services/portal";
import { proficiencyKey, skillStatusKey, sourceKey } from "@/utils/format";
import { Hint, Meter } from "@/components/guide/Parts";
import { OrgLine } from "@/components/org/Parts";
import { useApi } from "@/components/learning/useApi";
import { ErrorNote } from "@/components/ui";
import { fill, ineligibleReason, statusKey } from "./format";

/* ---- what this means for you ------------------------------------------ */

export function FitPanel({ detail }: { detail: OpportunityDetail }) {
  const { t, tx } = useI18n();
  const fit = detail.fit;

  if (!fit) {
    return (
      <section className="jb-panel" aria-labelledby="jb-fit-h">
        <h2 id="jb-fit-h" className="jb-h2">
          {t("job.fit.title")}
        </h2>
        <p className="jb-muted">{t("job.fit.guest")}</p>
        <Link href="/login" className="btn btn-primary">
          {t("car.signInCta")}
        </Link>
      </section>
    );
  }

  const held = fit.reasons.filter((reason) => reason.kind === "skill" && reason.skill);
  const career = fit.reasons.find((reason) => reason.kind === "career");
  const region = fit.reasons.some((reason) => reason.kind === "region");

  return (
    <section className="jb-panel jb-fit" aria-labelledby="jb-fit-h">
      <h2 id="jb-fit-h" className="jb-h2">
        {t("job.fit.title")}
      </h2>

      {fit.total > 0 ? (
        <Meter
          value={fit.have}
          max={fit.total}
          text={fill(t("job.have"), { have: fit.have, total: fit.total })}
        />
      ) : (
        <p className="jb-muted">{t("job.fit.none")}</p>
      )}

      {held.length > 0 && (
        <div className="jb-fit-group">
          <p className="jb-fit-label">{t("car.skill.have")}</p>
          <ul className="jb-fit-list">
            {held.map((reason) => {
              const skill = reason.skill!;
              const claimed = reason.status === "self_reported";
              return (
                <li key={skill.slug ?? skill.label} className={claimed ? "is-claimed" : "is-have"}>
                  <Mark kind={claimed ? "claimed" : "have"} />
                  <div>
                    <p className="jb-fit-name">
                      {tx(skill.name_i18n) || skill.label}
                      {reason.status && (
                        <span className="jb-fit-status">{t(skillStatusKey(reason.status))}</span>
                      )}
                    </p>
                    {Object.keys(reason.source_i18n).length > 0 && (
                      <p className="jb-fit-source">
                        {fill(t("job.from"), { source: tx(reason.source_i18n) })}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {fit.missing.length > 0 && (
        <div className="jb-fit-group">
          <p className="jb-fit-label">{t("job.fit.missing")}</p>
          <ul className="jb-fit-list">
            {fit.missing.map((gap) => (
              <li key={gap.skill.slug ?? gap.skill.label} className="is-need">
                <Mark kind="need" />
                <div>
                  <p className="jb-fit-name">{tx(gap.skill.name_i18n) || gap.skill.label}</p>
                  {gap.programs.length ? (
                    <p className="jb-fit-source">
                      {t("job.fit.course")}{" "}
                      {gap.programs.map((program, index) => (
                        <span key={program.id}>
                          {index > 0 && ", "}
                          <Link href={`/dasturlar/${program.id}`} className="jb-inline-link">
                            {tx(program.title_i18n)}
                          </Link>
                          {program.in_progress && ` (${t("job.fit.courseOn")})`}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="jb-fit-source">{t("job.fit.noCourse")}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(career || region) && (
        <ul className="jb-fit-extra">
          {career && (
            <li>
              <Mark kind="have" />
              <span>{fill(t("job.fit.career"), { career: tx(career.career_title_i18n) })}</span>
            </li>
          )}
          {region && (
            <li>
              <Mark kind="have" />
              {t("job.fit.region")}
            </li>
          )}
        </ul>
      )}

      <Hint label={t("car.hint.label")}>{t("car.hint.skills")}</Hint>
      <p className="jb-note">{t("job.fit.note")}</p>
    </section>
  );
}

function Mark({ kind }: { kind: "have" | "claimed" | "need" }) {
  return (
    <svg className={`jb-mark is-${kind}`} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {kind === "have" ? (
        <>
          <circle cx="8" cy="8" r="7" />
          <path d="M4.8 8.2l2.2 2.2 4.3-4.6" />
        </>
      ) : kind === "claimed" ? (
        <>
          <circle cx="8" cy="8" r="6.2" />
          <circle className="dot" cx="8" cy="8" r="2.4" />
        </>
      ) : (
        <circle cx="8" cy="8" r="6.2" />
      )}
    </svg>
  );
}

/* ---- requirements ------------------------------------------------------ */

export function Requirements({ detail }: { detail: OpportunityDetail }) {
  const { t, tx } = useI18n();
  const [open, setOpen] = useState(false);
  const panel = useId();
  const description = tx(detail.description_i18n);
  const age = detail.eligibility;
  const ageRange =
    age && (age.age_min !== null || age.age_max !== null)
      ? [
          age.age_min !== null ? fill(t("job.req.from"), { min: age.age_min }) : null,
          age.age_max !== null ? fill(t("job.req.to"), { max: age.age_max }) : null,
        ]
          .filter(Boolean)
          .join(", ")
      : null;

  return (
    <section className="jb-panel">
      <button
        type="button"
        className="jb-disclosure"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="jb-h2">{t("job.req.title")}</span>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={panel} className="jb-disclosure-body" hidden={!open}>
        {detail.skills.length > 0 && (
          <>
            <p className="jb-fit-label">{t("job.req.skills")}</p>
            <ul className="jb-req-skills">
              {detail.skills.map((skill) => (
                <li key={skill.slug ?? skill.label}>{tx(skill.name_i18n) || skill.label}</li>
              ))}
            </ul>
          </>
        )}
        {ageRange && <p>{fill(t("job.req.age"), { range: ageRange })}</p>}
        {detail.other_requirements.length > 0 && (
          <p>{fill(t("job.req.other"), { list: detail.other_requirements.join(", ") })}</p>
        )}
        <p className="jb-description">{description || t("job.req.none")}</p>
      </div>
    </section>
  );
}

/* ---- applying ---------------------------------------------------------- */

type Stage = "idle" | "confirm" | "sending" | "done";

/** The words that change when "applying" is registering for an event. */
const WORDS = {
  job: {
    title: "job.apply.title",
    cta: "job.apply.cta",
    signIn: "job.apply.signIn",
    send: "job.apply.send",
    done: "job.apply.done",
    doneHint: "job.apply.doneHint",
    already: "job.apply.already",
  },
  event: {
    title: "ev.reg.title",
    cta: "ev.reg.cta",
    signIn: "ev.reg.signIn",
    send: "ev.reg.send",
    done: "ev.reg.done",
    doneHint: "ev.reg.doneHint",
    already: "ev.reg.already",
  },
} as const satisfies Record<string, Record<string, MessageKey>>;

export function ApplyPanel({
  detail,
  signedIn,
  onApplied,
  mode = "job",
  embedded = false,
}: {
  detail: OpportunityDetail;
  signedIn: boolean;
  onApplied: (application: ApplicationRecord) => void;
  mode?: "job" | "event";
  /** Inside a panel that already has its own heading and frame. */
  embedded?: boolean;
}) {
  const { t, tx } = useI18n();
  const words = WORDS[mode];
  const [stage, setStage] = useState<Stage>("idle");
  const [agreed, setAgreed] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // A listing an organisation published here names that organisation: she
  // agrees to share with it alone, not with every organisation on WomanUP.
  const org = detail.sharing.organization;
  const partner = org
    ? org.name
    : detail.sharing.partner
      ? t(sourceKey(detail.sharing.partner))
      : null;
  const needsConsent = Boolean(detail.sharing.partner && !detail.sharing.consent_given);
  const blocked = ineligibleReason(detail.eligibility);
  const sourceName = t(sourceKey(detail.source));

  async function send() {
    if (needsConsent && !agreed) {
      setProblem(t("job.apply.consentNeeded"));
      return;
    }
    setStage("sending");
    setProblem(null);
    try {
      const application = await portal.applyTo(detail.id, needsConsent ? agreed : false);
      setStage("done");
      onApplied(application);
    } catch (cause) {
      setStage("confirm");
      const reason =
        cause instanceof ApiError
          ? (cause.detail as { reason?: string } | undefined)?.reason
          : undefined;
      const key = reason ? (`job.why.${reason}` as MessageKey) : null;
      setProblem(key && t(key) !== key ? t(key) : t("job.apply.err"));
    }
  }

  let body;
  if (detail.apply_url) {
    // Applying happens on the source site. No sign-in is needed to get
    // there, nothing is recorded here, and the panel says so plainly.
    body = (
      <>
        <a
          href={detail.apply_url}
          className="btn btn-primary jb-btn-lg"
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {fill(t("job.applyOn"), { source: sourceName })}
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="M8 4H4.5A1.5 1.5 0 003 5.5v10A1.5 1.5 0 004.5 17h10a1.5 1.5 0 001.5-1.5V12M12 3h5v5M17 3l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <p className="jb-muted">
          {fill(t("job.apply.external"), { source: sourceName })} {t("job.apply.externalOpens")}
        </p>
      </>
    );
  } else if (!signedIn) {
    body = (
      <Link href="/login" className="btn btn-primary jb-btn-lg">
        {t(words.signIn)}
      </Link>
    );
  } else if (detail.application && stage !== "done") {
    body = (
      <>
        <p className="jb-applied">
          {/* "Application sent" is a job's word; a registration is just that. */}
          {mode === "job" && (
            <span className={`jb-status is-${detail.application.status}`}>
              {t(statusKey(detail.application.status))}
            </span>
          )}{" "}
          {t(words.already)}
        </p>
        <Link href="/imkoniyatlar/arizalarim" className="btn btn-outline">
          {t("job.apply.track")}
        </Link>
      </>
    );
  } else if (stage === "done") {
    body = (
      <div className="jb-done" role="status">
        <p className="jb-done-title">{t(words.done)}</p>
        <p className="jb-muted">{t(words.doneHint)}</p>
        <Link href="/imkoniyatlar/arizalarim" className="btn btn-primary">
          {t("job.apply.track")}
        </Link>
      </div>
    );
  } else if (blocked) {
    body = (
      <>
        <p className="jb-blocked-text">{fill(t(blocked.key), blocked.values)}</p>
        {detail.eligibility?.reason === "age_unknown" && (
          <Link href="/welcome" className="btn btn-outline">
            {t("job.addBirthDate")}
          </Link>
        )}
      </>
    );
  } else if (stage === "idle") {
    body = (
      <>
        {detail.eligibility?.reason === "other_requirements" && (
          <p className="jb-muted">{t("job.why.other_requirements")}</p>
        )}
        <button type="button" className="btn btn-primary jb-btn-lg" onClick={() => setStage("confirm")}>
          {t(words.cta)}
        </button>
      </>
    );
  } else {
    body = (
      <div className="jb-confirm">
        <h3 className="jb-confirm-title">{t("job.apply.check")}</h3>
        {partner ? (
          <>
            {org ? (
              <>
                <OrgLine org={org} withHint />
                <p>{fill(t("job.apply.orgGets"), { org: partner })}</p>
              </>
            ) : (
              <p>{fill(t("job.apply.partnerGets"), { partner })}</p>
            )}
            <ul className="jb-fields">
              {detail.sharing.fields.map((field) => (
                <li key={field}>{t(`job.field.${field}` as MessageKey)}</li>
              ))}
            </ul>
            <p className="jb-muted">{t(org ? "job.apply.orgNotSent" : "job.apply.notSent")}</p>
            {needsConsent ? (
              <label className="jb-check jb-consent">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                />
                <span>
                  {org
                    ? fill(t("job.apply.orgConsent"), { org: partner })
                    : fill(t("job.apply.consent"), { partner })}
                </span>
              </label>
            ) : (
              <p className="jb-muted">
                {org
                  ? fill(t("job.apply.orgConsentGiven"), { org: partner })
                  : fill(t("job.apply.consentGiven"), { partner })}
              </p>
            )}
          </>
        ) : (
          <p>{t("job.apply.internal")}</p>
        )}
        <p className="jb-confirm-for">{tx(detail.title_i18n)}</p>
        <div className="jb-actions">
          <button
            type="button"
            className="btn btn-primary jb-btn-lg"
            onClick={send}
            disabled={stage === "sending"}
          >
            {t(stage === "sending" ? "job.apply.sending" : words.send)}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setStage("idle");
              setProblem(null);
            }}
            disabled={stage === "sending"}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    );
  }

  const error = problem && (
    <p className="pf-error" role="alert">
      {problem}
    </p>
  );
  if (embedded) {
    return (
      <div className="jb-apply-embedded">
        {body}
        {error}
      </div>
    );
  }
  return (
    <section className="jb-panel jb-apply" aria-labelledby="jb-apply-h">
      <h2 id="jb-apply-h" className="jb-h2">
        {t(words.title)}
      </h2>
      {body}
      {error}
    </section>
  );
}


/* ---- courses for the requirements ------------------------------------- */

const META_SEP = " · ";

export function CoursesPanel({
  id,
  load,
}: {
  id: string;
  /** Where the choice comes from: the catalogue listing by default, or a
   *  marketplace vacancy's. Either answers with the same shape. */
  load?: () => Promise<{ mode: "ai" | "rules"; items: SuggestedCourse[] }>;
}) {
  const { t, tx } = useI18n();
  const { data, loading, error, retry } = useApi(
    () => (load ? load() : portal.opportunityCourses(id)),
    [id, load],
  );
  const items = data?.items ?? [];

  return (
    <section className="jb-panel jb-courses" aria-labelledby="jb-courses-h" aria-busy={loading}>
      <div className="jb-courses-head">
        <h2 id="jb-courses-h" className="jb-h2">
          {t("job.courses.title")}
        </h2>
        {data && items.length > 0 && (
          <span className={`jb-mode is-${data.mode}`}>
            {t(data.mode === "ai" ? "job.courses.ai" : "job.courses.rules")}
          </span>
        )}
      </div>
      <p className="jb-muted">{t("job.courses.lead")}</p>

      {loading ? (
        <p className="jb-muted" role="status">
          {t("job.courses.loading")}
        </p>
      ) : error || !data ? (
        <div className="stack" style={{ gap: 10 }}>
          <ErrorNote message={t("job.courses.error")} />
          <button type="button" className="btn btn-outline btn-sm" onClick={retry}>
            {t("lms.err.retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="jb-muted">{t("job.courses.none")}</p>
      ) : (
        <ul className="jb-course-list">
          {items.map((item) => {
            const program = item.program;
            const href = `/dasturlar/${program.id}`;
            const meta = [
              program.provider,
              program.duration_hours ? fill(t("job.courses.hours"), { n: program.duration_hours }) : null,
              program.level ? t(proficiencyKey(program.level)) : null,
            ]
              .filter(Boolean)
              .join(META_SEP);
            const reason = tx(item.reason_i18n);
            return (
              <li key={program.id}>
                <div className="jb-course-main">
                  <Link href={href} className="jb-course-title">
                    {tx(program.title_i18n)}
                  </Link>
                  {meta && <p className="jb-course-meta">{meta}</p>}
                  {reason && <p className="jb-course-reason">{reason}</p>}
                  {item.covers.length > 0 && (
                    <p className="jb-fit-source">
                      {fill(t("job.courses.covers"), { skills: item.covers.join(", ") })}
                    </p>
                  )}
                </div>
                <Link href={href} className="btn btn-outline btn-sm">
                  {t("job.courses.open")}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {data && items.length > 0 && (
        <p className="jb-note">{t(data.mode === "ai" ? "job.courses.note" : "job.courses.noteRules")}</p>
      )}
    </section>
  );
}
