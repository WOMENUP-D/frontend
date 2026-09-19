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
  const [error, setError] = useState<string | null>(null);

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
          if (!cancelled) setError(t("plan.errLoad"));
        } else {
          try {
            const pending = await findDraft();
            if (cancelled) return;
            if (pending) { setDraft(pending); return; }

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
            const made = await portal.generatePlan("6m", localeRef.current);
            if (!cancelled) setDraft(made);
          } catch {
            if (!cancelled) setError(t("plan.errMake"));
          }
        }
      } finally {
        if (!cancelled) { setBuilding(false); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /**
   * A proposal follows the language she is reading in.
   *
   * The plan is written by the model in one language and stored as plain
   * text, so switching the site to Russian used to leave a Uzbek roadmap on
   * the screen. Regenerating is the honest fix rather than translating in the
   * browser: the roadmap names programmes and deadlines, and a machine
   * translation of those in the client would drift from the catalogue.
   *
   * Only ever a DRAFT. An accepted plan is hers — rebuilding it because she
   * changed the interface language would throw away something she agreed to,
   * so an active plan keeps its language and the "rebuild" button stays the
   * way to change it deliberately.
   *
   * Both guards are refs so that neither retriggers the effect. `rebuilding`
   * stops a second call while the first is in flight; `attempted` stops the
   * loop that would otherwise follow if the model came back in the wrong
   * language anyway — one try per locale, then the plan is left as it is
   * rather than regenerated forever.
   */
  const rebuilding = useRef(false);
  const attempted = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!draft || busy || rebuilding.current) return;
    if (!looksWrongLanguage(draft, apiLocale)) return;
    if (attempted.current.has(apiLocale)) return;

    attempted.current.add(apiLocale);
    rebuilding.current = true;
    setBusy(true);
    portal
      .generatePlan("6m", apiLocale)
      .then(setDraft)
      .catch(() => setError(t("plan.errMake")))
      .finally(() => {
        rebuilding.current = false;
        setBusy(false);
      });
  }, [draft, apiLocale, busy, t]);

  async function generate() {
    setBusy(true); setError(null);
    try {
      setDraft(await portal.generatePlan("6m", apiLocale));
    } catch {
      setError(t("plan.errMake"));
    } finally { setBusy(false); }
  }

  async function accept() {
    if (!draft) return;
    setBusy(true);
    try {
      const accepted = await portal.acceptPlan(draft.id);
      setPlan(accepted); setDraft(null);
    } catch { setError(t("plan.errAccept")); }
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
          <button className="btn btn-outline btn-sm" onClick={generate} disabled={busy}>
            {t(busy ? "plan.building" : "plan.new")}
          </button>
        )}
      </div>

      {error && <ErrorNote message={error} />}

      {!shown && (
        <Empty
          title={t("plan.none")}
          hint={t("plan.noneHint")}
          action={
            <button className="btn btn-primary" onClick={generate} disabled={busy}>
              {t(busy ? "plan.building" : "plan.make")}
            </button>
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

          {/* An accepted plan in another language is offered, never replaced.
              A draft is rewritten silently above — it is disposable — but this
              one she agreed to, and rebuilding it on a language switch would
              throw away something she chose. So the page says what it can do
              and waits to be asked. */}
          {!draft && looksWrongLanguage(shown, apiLocale) && (
            <div className="notice">
              {t("plan.otherLang")}{" "}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={generate}
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
                  title={tu(item.action)}
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
                      ) : item.program_id ? (
                        // A step that is a course is closed by the course: the
                        // platform ticks the last module, sees the enrollment
                        // reach a hundred per cent and marks this done itself.
                        // Asking her to then confirm it here is asking her to
                        // restate what the system just recorded, so the only
                        // thing offered is the way in.
                        <Link
                          href={`/dasturlar/${item.program_id}`}
                          className="btn btn-outline btn-sm"
                        >
                          {t("plan.toCourse")}
                        </Link>
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
              <button className="btn btn-outline" onClick={() => setDraft(null)}>
                {t("common.cancel")}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={generate} disabled={busy}>
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
