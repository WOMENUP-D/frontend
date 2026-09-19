"use client";

/**
 * The AI Assistant: education, health and the daily note.
 *
 * Two things shape this page. First, the answer depends on who is asking, so
 * what the assistant knows about her is shown rather than hidden — a panel she
 * can read and fill in, not a black box. Second, a rich education answer takes
 * the model a while, so the reply arrives first and the profession and roadmap
 * cards follow behind it instead of everything landing at once after a minute
 * of blank screen.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAccessToken } from "@/services/api";
import {
  portal,
  type AssistantProfile,
  type AssistantReply,
  type CoachContext,
  type CoachReply,
  type GuestAllowance,
} from "@/services/portal";
import { ErrorNote } from "@/components/ui";
import { CoachPanel, CoachReferences, suggestionText } from "@/components/Coach";
import { useI18n, type MessageKey } from "@/i18n";

type Route = "auto" | "portal" | "education" | "health";
type Tab = Route | "daily" | "coach";

/** The tabs are filters over one door, not separate assistants: "auto" lets the
 *  router choose, the rest pin the capability for a woman who already knows
 *  what she wants — and skip the routing call while they are at it.
 *
 *  "Coach" leads because it is the only one that already knows her: it reads
 *  her score, her skills and her courses before she has typed anything. It
 *  needs an account for the same reason — there is nothing to coach without a
 *  record. */
const TABS: ReadonlyArray<[Tab, MessageKey]> = [
  ["coach", "asst.tabCoach"],
  ["auto", "asst.tabAuto"],
  ["education", "asst.tabEducation"],
  ["health", "asst.tabHealth"],
  ["portal", "asst.tabPortal"],
  ["daily", "asst.tabDaily"],
];

const SUGGESTIONS: Record<Route, ReadonlyArray<MessageKey>> = {
  auto: ["asst.eduQ1", "nv.q1", "asst.healthQ1", "asst.eduQ3"],
  education: ["asst.eduQ1", "asst.eduQ2", "asst.eduQ3", "asst.eduQ4"],
  health: ["asst.healthQ1", "asst.healthQ2", "asst.healthQ3"],
  portal: ["nv.q1", "nv.q2", "nv.q3", "nv.q4"],
};

interface Turn {
  role: "user" | "assistant";
  text: string;
  reply?: AssistantReply;
  detail?: AssistantReply;
  detailPending?: boolean;
  /** Present when the Coach answered: its references are real records, already
   *  resolved on the server. */
  coach?: CoachReply;
}

export default function AssistantPage() {
  const { t, locale } = useI18n();
  const language = locale === "uz-Cyrl" ? "uz" : locale;

  const [authed, setAuthed] = useState<boolean | null>(null);
  /* A signed-in woman opens on the Coach: it is the only surface that already
     knows her, and the first thing she should see is a true statement about
     herself rather than an empty box. A guest is moved to the open door below,
     because there is nothing to coach without a record. */
  const [tab, setTab] = useState<Tab>("coach");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AssistantProfile | null>(null);
  const [allowance, setAllowance] = useState<GuestAllowance | null>(null);
  const [daily, setDaily] = useState<AssistantReply | null>(null);
  const [coach, setCoach] = useState<CoachContext | null>(null);
  const [coachFailed, setCoachFailed] = useState(false);
  /* The listing she came from, when she pressed "Ask the Coach" on one. Sent
     with her questions so the answer is about that real record. */
  const [about, setAbout] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      setProfile(await portal.assistantProfile());
    } catch {
      /* the panel is informative, not load-bearing */
    }
  }, []);

  useEffect(() => {
    const signedIn = Boolean(getAccessToken());
    setAuthed(signedIn);
    // A page elsewhere can hand over a question — "what else do I need for
    // this career?" — through `?ask=`. It is only put in the box: nothing is
    // sent to the Coach until she presses send herself.
    const params = new URLSearchParams(window.location.search);
    const handed = params.get("ask");
    if (signedIn && handed) setInput(handed.slice(0, 500));
    const listing = params.get("about");
    if (signedIn && listing && /^[0-9a-f-]{36}$/i.test(listing)) setAbout(listing);
    if (signedIn) {
      void refreshProfile();
      return;
    }
    setTab("auto");
    portal.assistantGuestAllowance().then(setAllowance).catch(() => {});
  }, [refreshProfile]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  useEffect(() => {
    if (tab !== "daily" || daily || !authed) return;
    portal.assistantDaily(language).then(setDaily).catch(() => setError(t("asst.err")));
  }, [tab, daily, authed, t, language]);

  /* Her situation is deterministic and cheap, so it is fetched as soon as the
     Coach is opened rather than waiting for her to ask something. */
  useEffect(() => {
    if (tab !== "coach" || coach || !authed) return;
    let live = true;
    portal
      .coachContext(language)
      .then((value) => live && setCoach(value))
      .catch(() => live && setCoachFailed(true));
    return () => {
      live = false;
    };
  }, [tab, coach, authed, language]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;

    setTurns((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    setError(null);

    try {
      if (tab === "coach") {
        const reply = await portal.coachAsk(question, language, about);
        setTurns((prev) => [...prev, { role: "assistant", text: reply.message, coach: reply }]);
        // Answering may have moved her on — a course enrolled in, a path
        // started — so the panel is re-read rather than left stale.
        portal.coachContext(language).then(setCoach).catch(() => {});
        return;
      }

      const route: Route = tab === "daily" ? "auto" : tab;
      const reply = await portal.assistantAsk(question, language, route);
      if (reply.guest_questions_left !== null) {
        setAllowance({
          unlimited: false,
          left: reply.guest_questions_left,
          allowance: allowance?.allowance ?? null,
        });
      }

      // Cards only exist for education answers that actually call for them.
      const wantsDetail =
        reply.route === "education" && reply.kind !== "general" && !reply.escalated;
      const index = turns.length + 1;
      setTurns((prev) => [
        ...prev,
        { role: "assistant", text: reply.answer, reply, detailPending: wantsDetail },
      ]);

      if (wantsDetail) {
        portal
          .assistantDetail(question, reply.answer, reply.kind, language)
          .then((detail) =>
            setTurns((prev) =>
              prev.map((turn, i) =>
                i === index ? { ...turn, detail, detailPending: false } : turn,
              ),
            ),
          )
          .catch(() =>
            setTurns((prev) =>
              prev.map((turn, i) => (i === index ? { ...turn, detailPending: false } : turn)),
            ),
          );
      }
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(status === 429 ? t("asst.guestSpent") : t("asst.err"));
    } finally {
      setBusy(false);
    }
  }

  const guestLeft = allowance && !allowance.unlimited ? (allowance.left ?? 0) : null;

  return (
    <main className="wrap page stack" style={{ maxWidth: 880, margin: "0 auto" }}>
      <div>
        <span className="eyebrow">{t("asst.nav")}</span>
        <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
          {t(tab === "coach" ? "coach.title" : "asst.title")}
        </h1>
        <p className="muted small" style={{ maxWidth: 620 }}>
          {t(tab === "coach" ? "coach.lead" : "asst.subtitle")}
        </p>
      </div>

      {authed && profile && tab !== "coach" && <KnowsPanel profile={profile} />}

      {authed === false && (
        <div className="notice notice-warn stack" style={{ gap: 8 }}>
          <strong className="small">
            {guestLeft === 0
              ? t("asst.guestSpent")
              : t("asst.guestLeft").replace("{n}", String(guestLeft ?? "3"))}
          </strong>
          <span className="small">{t("asst.guestHint")}</span>
          <Link href="/login" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
            {t("asst.signUp")}
          </Link>
        </div>
      )}

      <div className="row" style={{ gap: 8 }}>
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "chip chip-on" : "chip"}
            onClick={() => setTab(key)}
            disabled={key === "daily" && !authed}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {error && <ErrorNote message={error} />}

      {tab === "coach" && authed === false && (
        <div className="notice notice-warn stack" style={{ gap: 8 }}>
          <strong className="small">{t("coach.needsAccount")}</strong>
          <Link href="/login" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
            {t("asst.signUp")}
          </Link>
        </div>
      )}

      {tab === "coach" && authed && (
        coach ? (
          <CoachPanel context={coach} />
        ) : coachFailed ? (
          <ErrorNote message={t("coach.err")} />
        ) : (
          <div className="card"><p className="muted small">{t("common.loading")}</p></div>
        )
      )}

      {tab === "daily" ? (
        <div className="card stack">
          {daily ? (
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "1.2rem" }}>
              {daily.answer}
            </p>
          ) : (
            <p className="muted small">{t("asst.thinking")}</p>
          )}
        </div>
      ) : (
        <>
          <div className="card stack" style={{ minHeight: 220, gap: 16 }}>
            {turns.length === 0 && (
              <div className="stack" style={{ gap: 10 }}>
                {tab === "auto" && <p className="muted small">{t("asst.autoHint")}</p>}
                <div className="row coach-suggestions" style={{ gap: 8 }}>
                  {/* The Coach's questions come from her own state — the server
                      only offers one when the thing it refers to exists, so
                      there is never "what is next on my path" for a woman who
                      is on none. The other tabs keep their fixed list. */}
                  {tab === "coach"
                    ? (coach?.suggestions ?? []).map((suggestion) => {
                        const text = suggestionText(suggestion, t);
                        return (
                          <button
                            key={suggestion.key}
                            type="button"
                            className="chip"
                            onClick={() => ask(text)}
                          >
                            {text}
                          </button>
                        );
                      })
                    : SUGGESTIONS[tab as Route].map((key) => (
                        <button
                          key={key}
                          type="button"
                          className="chip"
                          onClick={() => ask(t(key))}
                        >
                          {t(key)}
                        </button>
                      ))}
                </div>
              </div>
            )}

            {turns.map((turn, i) =>
              turn.role === "user" ? (
                <p key={i} className="bubble-user">{turn.text}</p>
              ) : (
                <AssistantTurn key={i} turn={turn} />
              ),
            )}

            {busy && <p className="muted small">{t("asst.thinking")}</p>}
            <div ref={endRef} />
          </div>

          <form
            className="row"
            style={{ gap: 10 }}
            onSubmit={(event) => {
              event.preventDefault();
              void ask(input);
            }}
          >
            <input
              className="input grow"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("asst.placeholder")}
              disabled={busy || guestLeft === 0}
            />
            <button className="btn btn-primary" type="submit" disabled={busy || guestLeft === 0}>
              {t("asst.send")}
            </button>
          </form>
        </>
      )}

    </main>
  );
}

function KnowsPanel({ profile }: { profile: AssistantProfile }) {
  const { t } = useI18n();
  const rows: Array<[MessageKey, string]> = [];
  if (profile.age) rows.push(["asst.knowsAge", String(profile.age)]);
  if (profile.interests.length) rows.push(["asst.knowsInterests", profile.interests.join(", ")]);
  if (profile.goals.length) rows.push(["asst.knowsGoals", profile.goals[0]]);
  if (profile.in_progress.length) rows.push(["asst.knowsStudying", profile.in_progress[0]]);

  return (
    <div className="card stack" style={{ gap: 10 }}>
      <div className="spread">
        <span className="eyebrow">{t("asst.knows")}</span>
        <Link href="/welcome" className="btn btn-ghost btn-sm">
          {t("asst.setup")}
        </Link>
      </div>
      {rows.length ? (
        <div className="row" style={{ gap: 18, flexWrap: "wrap" }}>
          {rows.map(([key, value]) => (
            <span key={key} className="small">
              <span className="faint">{t(key)}: </span>
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="muted small">{t("asst.obLead")}</p>
      )}
    </div>
  );
}

function AssistantTurn({ turn }: { turn: Turn }) {
  const { t } = useI18n();
  const detail = turn.detail;

  // A coaching answer has its own shape: prose, then the real records it
  // points at. Nothing here is a card the model composed — every reference was
  // resolved against the catalogue on the server.
  if (turn.coach) {
    return (
      <div className="stack" style={{ gap: 12 }}>
        <div className="bubble-ai stack" style={{ gap: 10 }}>
          {!turn.coach.personalised && (
            <span className="badge badge-grey">{t("asst.generic")}</span>
          )}
          {/* Said out loud rather than hidden: an answer the provider did not
              write is still true, and she is owed the difference. */}
          {!turn.coach.generated && !turn.coach.escalated && (
            <span className="faint small">{t("coach.offline")}</span>
          )}
          <p style={{ whiteSpace: "pre-wrap" }}>{turn.text}</p>
          {turn.coach.unsupported && (
            <p className="faint small">{t("coach.unsupported")}</p>
          )}
          <CoachReferences references={turn.coach.references} />
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="bubble-ai stack" style={{ gap: 10 }}>
        {turn.reply && !turn.reply.personalised && (
          <span className="badge badge-grey">{t("asst.generic")}</span>
        )}
        <p style={{ whiteSpace: "pre-wrap" }}>{turn.text}</p>

        {!!turn.reply?.sources.length && (
          <div className="stack" style={{ gap: 6 }}>
            <hr className="hr" />
            <span className="faint">
              {t("asst.sources")}
              {turn.reply.confidence !== null
                ? ` · ${Math.round(turn.reply.confidence * 100)}%`
                : ""}
            </span>
            {turn.reply.sources.map((source) => (
              <div key={source.chunk_id} className="faint">
                <strong>{source.document_title}</strong> — {source.excerpt.slice(0, 130)}…
              </div>
            ))}
          </div>
        )}

        {turn.reply?.see_a_doctor && (
          <p className="small" style={{ color: "var(--gold)" }}>{t("asst.seeDoctor")}</p>
        )}

        {!!turn.reply?.next_actions.length && (
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">{t("asst.nextActions")}</span>
            {turn.reply.next_actions.map((action) => (
              <span key={action} className="small">→ {action}</span>
            ))}
          </div>
        )}
      </div>

      {turn.detailPending && <p className="muted small">{t("asst.detailLoading")}</p>}

      {!!detail?.professions.length && (
        <div className="stack" style={{ gap: 10 }}>
          <span className="eyebrow">{t("asst.professions")}</span>
          {detail.professions.map((p) => (
            <div key={p.title} className="card stack" style={{ gap: 8 }}>
              <strong>{p.title}</strong>
              {p.summary && <p className="muted small">{p.summary}</p>}
              {p.why_you && (
                <p className="small">
                  <span className="faint">{t("asst.whyYou")}: </span>
                  {p.why_you}
                </p>
              )}
              <Chips label={t("asst.skills")} items={p.skills} />
              <Chips label={t("asst.learn")} items={p.learn} />
              {!!p.path.length && (
                <p className="small">
                  <span className="faint">{t("asst.path")}: </span>
                  {p.path.join(" → ")}
                </p>
              )}
              {p.demand && (
                <p className="small">
                  <span className="faint">{t("asst.demand")}: </span>
                  {p.demand}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!!detail?.roadmap.length && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{t("asst.roadmap")}</span>
          {detail.roadmap.map((step, index) => (
            <div key={step.title} className="row" style={{ gap: 12, alignItems: "baseline" }}>
              <span className="ed-num" style={{ fontSize: "1.1rem" }}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <strong className="small">{step.title}</strong>
                {step.detail && <p className="muted small">{step.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!!detail?.programs.length && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{t("asst.courses")}</span>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {detail.programs.map((program) => (
              <Link key={program.id} href="/dasturlar" className="chip">
                {program.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chips({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <p className="small">
      <span className="faint">{label}: </span>
      {items.join(", ")}
    </p>
  );
}
