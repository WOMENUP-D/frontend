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
  type GuestAllowance,
} from "@/services/portal";
import { ErrorNote } from "@/components/ui";
import { useI18n, type MessageKey } from "@/i18n";

type Route = "auto" | "portal" | "education" | "health";
type Tab = Route | "daily";

/** The tabs are filters over one door, not separate assistants: "auto" lets the
 *  router choose, the rest pin the capability for a woman who already knows
 *  what she wants — and skip the routing call while they are at it. */
const TABS: ReadonlyArray<[Tab, MessageKey]> = [
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
}

export default function AssistantPage() {
  const { t, locale } = useI18n();
  const language = locale === "uz-Cyrl" ? "uz" : locale;

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("auto");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AssistantProfile | null>(null);
  const [allowance, setAllowance] = useState<GuestAllowance | null>(null);
  const [daily, setDaily] = useState<AssistantReply | null>(null);
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
    if (signedIn) void refreshProfile();
    else portal.assistantGuestAllowance().then(setAllowance).catch(() => {});
  }, [refreshProfile]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  useEffect(() => {
    if (tab !== "daily" || daily || !authed) return;
    portal.assistantDaily(language).then(setDaily).catch(() => setError(t("asst.err")));
  }, [tab, daily, authed, t, language]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;

    setTurns((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    setError(null);

    try {
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
        <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>{t("asst.title")}</h1>
        <p className="muted small" style={{ maxWidth: 620 }}>{t("asst.subtitle")}</p>
      </div>

      {authed && profile && <KnowsPanel profile={profile} />}

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
                <div className="row" style={{ gap: 8 }}>
                {SUGGESTIONS[tab].map((key) => (
                  <button key={key} type="button" className="chip" onClick={() => ask(t(key))}>
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
