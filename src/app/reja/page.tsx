"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError, getAccessToken } from "@/services/api";
import { clearPlanGenerating, isPlanGenerating } from "@/services/planDraft";
import { portal, type Plan } from "@/services/portal";
import { EdRow, EdRows, Empty, ErrorNote, Loading, NeedsAuth } from "@/components/ui";
import { useI18n, type MessageKey } from "@/i18n";
import { dimensionKey } from "@/utils/format";

const PRIORITY_BADGE: Record<string, string> = {
  high: "badge badge-gold", medium: "badge", low: "badge badge-grey",
};
const PRIORITY_KEY: Record<string, MessageKey> = {
  high: "prio.high", medium: "prio.medium", low: "prio.low",
};

/** The newest proposal she has not accepted yet. */
async function findDraft(): Promise<Plan | null> {
  const mine = await portal.myPlans();
  return mine.find((candidate) => !candidate.is_active && !candidate.accepted_at) ?? null;
}

/** Polls until the draft started by the assessment lands. Bounded, because a
 *  marker can outlive the request that set it. */
async function waitForDraft(cancelled: () => boolean): Promise<Plan | null> {
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    if (cancelled()) return null;
    if (!isPlanGenerating()) return null;
    const found = await findDraft().catch(() => null);
    if (found) return found;
  }
  return null;
}

/**
 * Is this plan plainly not in the language she is reading?
 *
 * Asked this way round on purpose. "What language is it in" cannot be
 * answered for a Latin-script plan — Uzbek and English look alike to a
 * script test — but "is it obviously the wrong one" can, and that is the only
 * question worth acting on.
 *
 * New plans record the language they were written in and are compared
 * directly. Older ones record nothing, and those are precisely the rows
 * stranded in the wrong language, so treating "unknown" as "leave it" would
 * skip the only plans that need fixing. For them the script decides: Russian
 * is Cyrillic, Uzbek Latin and English are not.
 *
 * Where the script cannot settle it — a Latin plan read in Uzbek or English —
 * the answer is no. An unnecessary rebuild costs a model call and replaces a
 * draft she may be part-way through reading.
 */
function looksWrongLanguage(plan: Plan, reading: string): boolean {
  const recorded = plan.rationale?.language;
  if (typeof recorded === "string" && recorded) return recorded !== reading;

  const sample = `${plan.title} ${plan.summary ?? ""}`;
  const cyrillic = (sample.match(/[\u0400-\u04FF]/g) ?? []).length;
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
  if (cyrillic + latin < 12) return false;   // too little text to judge

  const isCyrillic = cyrillic > latin;
  // Reading Russian but the plan carries no Cyrillic, or reading a Latin
  // locale and the plan is Cyrillic. Both are unambiguous.
  return reading === "ru" ? !isCyrillic : isCyrillic;
}

/** QA I-05: plan generation spends the hourly AI allowance; a 429 says so in
 *  her language instead of "take the assessment first". */
function makeError(cause: unknown): MessageKey {
  return cause instanceof ApiError && cause.status === 429 ? "plan.errLimit" : "plan.errMake";
}

/** QA I-05 / D-17: after she discards a proposal, a later visit does not
 *  silently spend another model call on a new one — she asks for it. */
const DISCARDED_KEY = "womanup.planDiscarded";
function discardedBefore(): boolean {
  try { return localStorage.getItem(DISCARDED_KEY) === "1"; } catch { return false; }
}
function rememberDiscard(on: boolean): void {
  try {
    if (on) localStorage.setItem(DISCARDED_KEY, "1");
    else localStorage.removeItem(DISCARDED_KEY);
  } catch { /* private mode */ }
}

type Horizon = "1m" | "3m";
const HORIZONS: ReadonlyArray<Horizon> = ["1m", "3m"];
const DEFAULT_HORIZON: Horizon = "3m";
const asHorizon = (value: string | null | undefined): Horizon =>
  value === "1m" ? "1m" : "3m";

/** "A one-month plan" — older plans were written for six months and more. */
const HORIZON_LABEL: Record<string, MessageKey | undefined> = {
  "1m": "plan.for.1m",
  "3m": "plan.for.3m",
  "6m": "plan.for.6m",
  "12m": "plan.for.12m",
  "36m": "plan.for.36m",
};

/** One month or three, as a pair of pressed buttons rather than a select:
 *  two choices are read at a glance, and the chosen one says so in words. */
function HorizonPicker({
  value,
  onChange,
  disabled,
}: {
  value: Horizon;
  onChange: (next: Horizon) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="cat-view" role="group" aria-label={t("plan.horizon")}>
      {HORIZONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          disabled={disabled}
          onClick={() => onChange(option)}
        >
          {t(option === "1m" ? "plan.h.1m" : "plan.h.3m")}
        </button>
      ))}
    </div>
  );
}

export default function PlanPage() {
  const { t, tu, apiLocale } = useI18n();
  /* Read through a ref inside the mount effect rather than added to its
     dependency list. Widening that list restarts the effect on a language
     switch, and neither guard in it stops a second generation: `cancelled`
     only gates setState — the POST is already in flight — and the marker that
     would make the re-run wait for the first draft is cleared just before the
     call. The result would be two model calls and two orphan drafts, which is
     exactly what the draft check exists to prevent. */
  const localeRef = useRef(apiLocale);
  localeRef.current = apiLocale;
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  /* Generation calls the model, so it is worth several seconds of the user's
     patience — and a skeleton with no explanation is how those seconds get
     read as the page being broken. */
  const [building, setBuilding] = useState(false);
  const [busy, setBusy] = useState(false);
  /* How far ahead the plan looks. A month to get moving, a quarter to change
     something — the two she can actually hold in her head. A draft or plan
     she already has keeps the horizon it was written for. */
  const [horizon, setHorizon] = useState<Horizon>(DEFAULT_HORIZON);
    /* The key, not the sentence. Translating at the moment the request fails
     froze whatever language was current then — and the locale is restored from
     storage in an effect, so a request that failed first put an Uzbek sentence
     on a Russian page. Kept as a key, it is translated on every render and
     follows the language switch. */
  const [error, setError] = useState<MessageKey | null>(null);
  /* QA C-12: no diagnostic yet. The plan is built "from your assessment", so
     without one the page says so and links to it — no model call, no 30 s
     wait ending in an error. */
  const [noDiagnostic, setNoDiagnostic] = useState(false);
  /* QA I-05: a horizon picked on a draft is confirmed before the model is
     called — a tap on "1 month" used to regenerate at once. */
  const [pendingHorizon, setPendingHorizon] = useState<Horizon | null>(null);

  /**
   * The roadmap draws itself. Finishing the assessment used to leave her on an
   * empty page with a button that said "build a plan" — but the platform has
   * everything it needs by then, and asking for a click is asking her to
   * request something nobody would decline.
   *
   * The invariant is untouched: this generates a *proposal*, which is created
   * inactive and stays inactive until she accepts it. AI proposes, she decides —
   * what has gone is the click before the proposal, not the one after it.
   *
   * The existing-draft check is what keeps this from being expensive: without
   * it every visit to a planless roadmap would call the model again and leave
   * another abandoned draft behind.
   */
  useEffect(() => {
    const token = getAccessToken();
    setAuthed(Boolean(token));
    if (!token) { setLoading(false); return; }

    let cancelled = false;
    (async () => {
      try {
        const active = await portal.activePlan();
        if (!cancelled) setPlan(active);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) {
          if (!cancelled) setError("plan.errLoad");
        } else {
          try {
            const pending = await findDraft();
            if (cancelled) return;
            if (pending) { setDraft(pending); return; }

            // QA C-12: ask for the assessment before asking the model.
            const assessed = await portal
              .diagnosticResult()
              .then(() => true)
              .catch((cause: unknown) =>
                cause instanceof ApiError && cause.status === 404 ? false : true,
              );
            if (cancelled) return;
            if (!assessed && !isPlanGenerating()) { setNoDiagnostic(true); return; }
            // QA I-05: she discarded the last proposal — wait to be asked.
            if (discardedBefore() && !isPlanGenerating()) return;

            setBuilding(true);
            // The assessment may already have one in flight. The plan row only
            // appears once the model answers, so an empty list here does not
            // mean nothing is coming — waiting for it is what stops a second
            // call and a second draft.
            if (isPlanGenerating()) {
              const arrived = await waitForDraft(() => cancelled);
              if (cancelled) return;
              if (arrived) { clearPlanGenerating(); setDraft(arrived); return; }
            }
            clearPlanGenerating();
            const made = await portal.generatePlan(DEFAULT_HORIZON, localeRef.current);
            if (!cancelled) setDraft(made);
          } catch (cause) {
            if (!cancelled) setError(makeError(cause));
          }
        }
      } finally {
        if (!cancelled) { setBuilding(false); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* QA I-05: a proposal in another language used to be rebuilt by the model
     automatically on every visit after a language switch. Generation now
     spends her hourly AI allowance, so a draft is treated like an accepted
     plan here: the page offers the rebuild (see "plan.otherLang" below) and
     waits to be asked. */

  // The toggle follows whatever is on screen: a draft or plan written for one
  // month opens with "1 month" selected, so "build" rebuilds what she sees.
  useEffect(() => {
    const current = draft ?? plan;
    if (current) setHorizon(asHorizon(current.horizon));
  }, [draft, plan]);

  /** QA D-17: a replaced proposal is deleted, so old drafts do not pile up
   *  and cannot be accepted later through the API. */
  function discard(old: Plan | null, kept: Plan | null) {
    if (old && !old.is_active && !old.accepted_at && old.id !== kept?.id) {
      portal.deletePlan(old.id).catch(() => undefined);
    }
  }

  async function generate(chosen: Horizon = horizon) {
    setBusy(true); setError(null);
    try {
      const made = await portal.generatePlan(chosen, apiLocale);
      discard(draft, made);
      setDraft(made);
      setPendingHorizon(null);
    } catch (cause) {
      setError(makeError(cause));
    } finally { setBusy(false); }
  }

  async function accept() {
    if (!draft) return;
    setBusy(true);
    try {
      const accepted = await portal.acceptPlan(draft.id);
      setPlan(accepted); setDraft(null);
      rememberDiscard(false);
    } catch { setError("plan.errAccept"); }
    finally { setBusy(false); }
  }

  if (authed === false) return <main className="wrap page"><NeedsAuth /></main>;
  if (loading) {
    return (
      <main className="wrap page stack" style={{ gap: 14 }}>
        {building && (
          <div className="stack" style={{ gap: 6 }}>
            <h1>{t("plan.title")}</h1>
            <p className="muted">{t("plan.autoBuilding")}</p>
          </div>
        )}
        <Loading rows={4} />
      </main>
    );
  }

  const shown = draft ?? plan;

  return (
    <main className="wrap page stack" style={{ maxWidth: 760, margin: "0 auto" }}>
      <div className="spread">
        <div>
          <span className="eyebrow">{t("nav.cabinet")}</span>
          <h1>{t("plan.title")}</h1>
        </div>
        {plan && !draft && (
          <div className="plan-make">
            <HorizonPicker value={horizon} onChange={setHorizon} disabled={busy} />
            <button className="btn btn-outline btn-sm" onClick={() => generate()} disabled={busy}>
              {t(busy ? "plan.building" : "plan.new")}
            </button>
          </div>
        )}
      </div>

      {error && <ErrorNote message={t(error)} />}
      {/* QA C-12: the failure message says "take the assessment first" — so
          it links there instead of offering only the same button again. */}
      {error === "plan.errMake" && (
        <Link className="btn btn-outline btn-sm" href="/kabinet/diagnostika" style={{ alignSelf: "start" }}>
          {t("plan.toDiagnostic")}
        </Link>
      )}

      {!shown && noDiagnostic && (
        <Empty
          title={t("plan.needsDiagnostic")}
          hint={t("plan.needsDiagnosticHint")}
          action={
            <Link className="btn btn-primary" href="/kabinet/diagnostika">
              {t("plan.toDiagnostic")}
            </Link>
          }
        />
      )}

      {!shown && !noDiagnostic && (
        <Empty
          title={t("plan.none")}
          hint={t("plan.noneHint")}
          action={
            <div className="plan-make plan-make-center">
              <HorizonPicker value={horizon} onChange={setHorizon} disabled={busy} />
              <button className="btn btn-primary" onClick={() => generate()} disabled={busy}>
                {t(busy ? "plan.building" : "plan.make")}
              </button>
            </div>
          }
        />
      )}

      {shown && (
        <>
          {draft && (
            <div className="notice notice-warn">
              <strong>{t("plan.draftNotice1")}</strong> {t("plan.draftNotice2")}
            </div>
          )}

          {/* A proposal can be rewritten for the other horizon before she
              accepts it — the choice belongs before the commitment. */}
          {draft && (
            <div className="plan-make">
              <HorizonPicker
                value={horizon}
                onChange={(next) => {
                  setHorizon(next);
                  setPendingHorizon(next !== asHorizon(draft.horizon) ? next : null);
                }}
                disabled={busy}
              />
              {busy && <span className="faint small">{t("plan.building")}</span>}
            </div>
          )}
          {draft && pendingHorizon && !busy && (
            <div className="notice">
              {t(pendingHorizon === "1m" ? "plan.confirmRebuild1m" : "plan.confirmRebuild3m")}{" "}
              <span className="row" style={{ gap: 8, display: "inline-flex", flexWrap: "wrap" }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => generate(pendingHorizon)}>
                  {t("plan.rebuildConfirm")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setPendingHorizon(null); setHorizon(asHorizon(draft.horizon)); }}
                >
                  {t("plan.keepCurrent")}
                </button>
              </span>
            </div>
          )}

          {/* An accepted plan in another language is offered, never replaced.
              A draft is rewritten silently above — it is disposable — but this
              one she agreed to, and rebuilding it on a language switch would
              throw away something she chose. So the page says what it can do
              and waits to be asked. */}
          {looksWrongLanguage(shown, apiLocale) && (
            <div className="notice">
              {t("plan.otherLang")}{" "}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => generate()}
                disabled={busy}
              >
                {busy ? t("common.loading") : t("plan.rebuildHere")}
              </button>
            </div>
          )}

          <div className="card card-accent stack">
            <div className="spread">
              <div className="stack" style={{ gap: 4 }}>
                <h2 style={{ fontSize: "1.25rem" }}>{tu(shown.title)}</h2>
                {HORIZON_LABEL[shown.horizon] && (
                  <span className="small muted">{t(HORIZON_LABEL[shown.horizon]!)}</span>
                )}
                {shown.summary && <p className="muted small">{tu(shown.summary)}</p>}
              </div>
              <span className={shown.generated_by_ai ? "badge badge-gold" : "badge badge-grey"}>
                {t(shown.generated_by_ai ? "plan.byAi" : "plan.byRules")}
              </span>
            </div>

            {!draft && (
              <div className="stack" style={{ gap: 6 }}>
                <div className="spread small muted">
                  <span>{t("plan.progressLbl")}</span>
                  <span>{shown.progress_percent}%</span>
                </div>
                <div className="bar"><span style={{ width: `${shown.progress_percent}%` }} /></div>
              </div>
            )}

            {!shown.generated_by_ai && (
              <p className="faint">
                {t("plan.ruleNote")}
              </p>
            )}
          </div>

          <EdRows>
            {shown.items.map((item, position) => {
              const done = item.status === "done";
              return (
                <EdRow
                  key={item.id}
                  index={position + 1}
                  done={done}
                  arrow={false}
                  title={
                    // The step names a course: the name itself is the way in.
                    // A course hosted elsewhere opens on its own site, in a new
                    // tab, so the roadmap stays where she left it.
                    item.program_url ? (
                      // QA D-19: target was missing — the ↗ promised a new tab.
                      <a
                        href={item.program_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ed-title-link"
                      >
                        {tu(item.action)}
                      </a>
                    ) : item.program_id ? (
                      <Link href={`/dasturlar/${item.program_id}`} className="ed-title-link">
                        {tu(item.action)}
                      </Link>
                    ) : (
                      tu(item.action)
                    )
                  }
                  meta={
                    <>
                      {tu(item.description)}
                      {item.due_date && (
                        <>
                          {item.description ? " · " : ""}
                          {t("common.deadline")}: {item.due_date}
                        </>
                      )}
                    </>
                  }
                  badges={
                    <>
                      {item.dimension && (
                        <span className="badge">{t(dimensionKey(item.dimension))}</span>
                      )}
                      <span className={PRIORITY_BADGE[item.priority] ?? "badge"}>
                        {t(PRIORITY_KEY[item.priority] ?? "prio.medium")}
                      </span>
                    </>
                  }
                  side={
                    !draft && (
                      done ? (
                        <span className="badge badge-green">✓ {t("plan.isDone")}</span>
                      ) : item.status === "skipped" ? (
                        // QA D-16: a step she removed when accepting is not
                        // "awaiting" — and it no longer counts toward progress.
                        <span className="badge badge-grey">{t("plan.skipped")}</span>
                      ) : item.program_id ? (
                        // A step that is a course is closed by the course: the
                        // platform ticks the last module, sees the enrollment
                        // reach a hundred per cent and marks this done itself.
                        // Asking her to then confirm it here is asking her to
                        // restate what the system just recorded, so the only
                        // thing offered is the way in.
                        item.program_url ? (
                          <a
                            href={item.program_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline btn-sm"
                          >
                            {t("plan.toCourse")} ↗
                          </a>
                        ) : (
                          <Link
                            href={`/dasturlar/${item.program_id}`}
                            className="btn btn-outline btn-sm"
                          >
                            {t("plan.toCourse")}
                          </Link>
                        )
                      ) : (
                        // A step with no course behind it. It carries no
                        // control either — status on this page is something the
                        // platform reports, never something she asserts.
                        <span className="badge badge-grey">{t("plan.awaiting")}</span>
                      )
                    )
                  }
                />
              );
            })}
          </EdRows>

          {draft && (
            <div className="row">
              <button className="btn btn-primary" onClick={accept} disabled={busy}>
                {t(busy ? "plan.accepting" : "plan.accept")}
              </button>
              {/* QA D-17: cancelling discards the proposal on the server too
                  — it used to vanish only until the next reload. */}
              <button
                className="btn btn-outline"
                onClick={async () => {
                  const old = draft;
                  setBusy(true);
                  try {
                    await portal.deletePlan(old.id);
                    setDraft(null);
                    setPendingHorizon(null);
                    rememberDiscard(true);
                  } catch {
                    setError("plan.errDiscard");
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
              >
                {t("plan.discard")}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => generate()} disabled={busy}>
                {t("plan.another")}
              </button>
            </div>
          )}

          {!draft && (
            <div className="row">
              <Link href="/dasturlar" className="btn btn-outline btn-sm">{t("plan.toPrograms")}</Link>
              <Link href="/imkoniyatlar" className="btn btn-outline btn-sm">{t("nav.opportunities")}</Link>
            </div>
          )}
        </>
      )}
    </main>
  );
}
