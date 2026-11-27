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
  type AssistantReply,
  type CoachContext,
  type CoachReply,
  type GuestAllowance,
  isTimeout,
} from "@/services/portal";
import { ErrorNote } from "@/components/ui";
import { CoachReferences, suggestionText } from "@/components/Coach";
import { useI18n, type MessageKey } from "@/i18n";
import { toNewAlphabetIfUzbek } from "@/i18n/uzbek";
import { RichText } from "@/components/text/RichText";
import { HelpResources } from "@/components/HelpResources";
import { stripLeadingNumber } from "@/components/text/markdown";
import {
  conversationId,
  historyFor,
  loadConversations,
  ownerOf,
  saveConversations,
  titleFrom,
  turnId,
  turnsToKeep,
  type Conversation,
} from "./chatStore";
import { SignInLink } from "@/components/auth/SignInLink";
import { StreamBrokenError } from "@/services/assistantStream";

/** The longest question the assistant endpoints take (schemas/assistant.py). */
const MAX_MESSAGE = 1000;

/** What a failed question means (E-03). Pure. */
function askErrorKey(err: unknown, length: number): MessageKey {
  const status = (err as { status?: number })?.status;
  const detail = (err as { detail?: unknown })?.detail;
  if (status === 429) return detail === "guest_limit_reached" ? "asst.guestSpent" : "au.asst.limit";
  if (status === 422 && length > MAX_MESSAGE) return "au.asst.tooLong";
  return "asst.err";
}

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
  /** Stable id: a late card request finds its turn by id, not by an index
   *  read from a stale closure (QA E-16). */
  id: string;
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

  /* Known at the first render: the page is only drawn after SessionGate has
     resumed the session, so the token is already in memory. Waiting for an
     effect drew the page empty for a frame and then dropped the Coach panel
     in above the chat (QA H-01). */
  const [authed, setAuthed] = useState<boolean | null>(() =>
    typeof window === "undefined" ? null : Boolean(getAccessToken()),
  );
  /* A signed-in woman opens on the Coach: it is the only surface that already
     knows her, and the first thing she should see is a true statement about
     herself rather than an empty box. A guest is moved to the open door below,
     because there is nothing to coach without a record. */
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" && !getAccessToken() ? "auto" : "coach",
  );
  /* Her conversations, newest first, the way a chat app lists them. Each keeps
     the capability it was asked in, so a health thread never shows career
     moves (QA E-16). `activeId` null is a new, still empty conversation: it is
     only added to the list once she has asked something in it. */
  const [chats, setChats] = useState<Conversation<Turn>[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  /* On a wide screen the list can be folded away, the way a chat app does,
     and stays folded on this device until she opens it again. On a phone the
     same button opens and closes the drawer. */
  const [sideHidden, setSideHidden] = useState(false);
  useEffect(() => {
    try {
      setSideHidden(window.localStorage.getItem(SIDE_KEY) === "hidden");
    } catch {
      /* storage unavailable: the list starts open */
    }
  }, []);
  function toggleSide() {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setHistoryOpen((value) => !value);
      return;
    }
    setSideHidden((value) => {
      try {
        window.localStorage.setItem(SIDE_KEY, value ? "shown" : "hidden");
      } catch {
        /* the choice simply is not remembered */
      }
      return !value;
    });
  }
  const active = chats.find((chat) => chat.id === activeId) ?? null;
  const turns = active?.turns ?? [];
  /* Conversations changed since they were last saved to the server. */
  const dirty = useRef<Set<string>>(new Set());
  const appendTo = useCallback((chatId: string, turn: Turn) => {
    dirty.current.add(chatId);
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, turns: [...chat.turns, turn], updatedAt: Date.now() } : chat,
      ),
    );
  }, []);
  const patchTurn = useCallback((chatId: string, id: string, patch: Partial<Turn>) => {
    dirty.current.add(chatId);
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? { ...chat, turns: chat.turns.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)) }
          : chat,
      ),
    );
  }, []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  /* The answer while it is being written, and the tab it belongs to; null
     until its first words arrive — until then "thinking…" is shown. */
  const [live, setLive] = useState<{ chat: string; text: string } | null>(null);
    /* The key, not the sentence. Translating at the moment the request fails
     froze whatever language was current then — and the locale is restored from
     storage in an effect, so a request that failed first put an Uzbek sentence
     on a Russian page. Kept as a key, it is translated on every render and
     follows the language switch. */
  const [error, setError] = useState<MessageKey | null>(null);
  /* The question a timed-out request was for, so "Ask again" can resend it
     (QA H-04). */
  const [retryable, setRetryable] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<GuestAllowance | null>(null);
  const [daily, setDaily] = useState<AssistantReply | null>(null);
  const [coach, setCoach] = useState<CoachContext | null>(null);
  const [coachFailed, setCoachFailed] = useState(false);
  /* The listing she came from, when she pressed "Ask the Coach" on one. Sent
     with her questions so the answer is about that real record. */
  const [about, setAbout] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getAccessToken();
    const signedIn = Boolean(token);
    setAuthed(signedIn);
    const who = ownerOf(token);
    setOwner(who);
    if (signedIn) {
      // Her list lives on the server; the turns are fetched when she opens one.
      portal
        .conversations()
        .then((rows) =>
          setChats(
            rows.map((row) => ({
              id: row.id,
              tab: row.tab,
              title: row.title,
              updatedAt: Date.parse(row.updated_at) || 0,
              turns: [],
              loaded: false,
            })),
          ),
        )
        .catch(() => {});
    } else {
      setChats(loadConversations<Turn>(who));
    }
    // A page elsewhere can hand over a question — "what else do I need for
    // this career?" — through `?ask=`. It is only put in the box: nothing is
    // sent to the Coach until she presses send herself.
    const params = new URLSearchParams(window.location.search);
    const handed = params.get("ask");
    if (signedIn && handed) setInput(handed.slice(0, 500));
    const listing = params.get("about");
    if (signedIn && listing && /^[0-9a-f-]{36}$/i.test(listing)) setAbout(listing);
    // QA D-23: a page can open a given tab — the diagnostic's support card
    // links straight to "health". Only a known tab; the Coach needs an account.
    const wanted = TABS.find(([key]) => key === params.get("tab"))?.[0];
    if (signedIn) {
      if (wanted) setTab(wanted);
      return;
    }
    setTab(wanted && wanted !== "coach" ? wanted : "auto");
    portal.assistantGuestAllowance().then(setAllowance).catch(() => {});
  }, []);

  useEffect(() => {
    if (owner === "guest") saveConversations(owner, chats);
  }, [owner, chats]);

  /* Signed in: a conversation is saved once its answer has landed (and again
     when the cards under it arrive). A failed save stays marked and goes with
     the next change. */
  useEffect(() => {
    if (!owner || owner === "guest" || busy || dirty.current.size === 0) return;
    for (const id of Array.from(dirty.current)) {
      const chat = chats.find((item) => item.id === id);
      if (!chat || chat.turns.length === 0) {
        dirty.current.delete(id);
        continue;
      }
      dirty.current.delete(id);
      portal
        .saveConversation(id, { tab: chat.tab, title: chat.title, turns: turnsToKeep(chat.turns) })
        .catch(() => dirty.current.add(id));
    }
  }, [owner, chats, busy]);

  /* The capability a new conversation opens in: the Coach for an account, the
     open assistant for a visitor, or what a link asked for (QA D-23). */
  const [startTab, setStartTab] = useState<Tab | null>(null);
  useEffect(() => {
    if (startTab === null && authed !== null) setStartTab(tab);
  }, [authed, tab, startTab]);

  function newChat() {
    if (busy) return;
    setActiveId(null);
    if (startTab) setTab(startTab);
    setError(null);
    setRetryable(null);
    setInput("");
    setHistoryOpen(false);
  }
  function openChat(chat: Conversation<Turn>) {
    if (busy) return;
    if (chat.loaded === false) {
      portal
        .conversation(chat.id)
        .then((read) =>
          setChats((prev) =>
            prev.map((item) =>
              item.id === chat.id ? { ...item, turns: read.turns as unknown as Turn[], loaded: true } : item,
            ),
          ),
        )
        .catch(() => setError("asst.err"));
    }
    setActiveId(chat.id);
    setTab(chat.tab as Tab);
    setError(null);
    setRetryable(null);
    setHistoryOpen(false);
  }
  function deleteChat(id: string) {
    setChats((prev) => prev.filter((chat) => chat.id !== id));
    dirty.current.delete(id);
    if (owner && owner !== "guest") void portal.deleteConversation(id).catch(() => {});
    if (id === activeId) setActiveId(null);
  }

  const turnCount = turns.length;
  const liveShown = live !== null;
  useEffect(() => {
    if (turnCount) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turnCount, activeId, liveShown]);

  useEffect(() => {
    if (tab !== "daily" || daily || !authed) return;
    portal.assistantDaily(language).then(setDaily).catch(() => setError("asst.err"));
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
    if (question.length > MAX_MESSAGE) {
      setError("au.asst.tooLong");
      return;
    }

    // The conversation and capability she asked from, captured now: if she
    // opens another chat while the answer is on its way, it still lands in
    // the conversation it belongs to.
    const asked = tab;
    let chatId = activeId;
    const history = historyFor(active?.turns ?? []);
    if (!chatId) {
      const created: Conversation<Turn> = {
        id: conversationId(),
        tab: asked,
        title: titleFrom(question),
        updatedAt: Date.now(),
        turns: [],
        loaded: true,
      };
      chatId = created.id;
      setChats((prev) => [created, ...prev]);
      setActiveId(created.id);
    }
    const target = chatId;
    appendTo(target, { id: turnId(), role: "user", text: question });
    setInput("");
    setBusy(true);
    setLive(null);
    setError(null);
    setRetryable(null);

    try {
      if (asked === "coach") {
        const reply = await portal.coachAsk(question, language, about, history);
        appendTo(target, { id: turnId(), role: "assistant", text: reply.message, coach: reply });
        // Answering may have moved her on — a course enrolled in, a path
        // started — so the panel is re-read rather than left stale.
        portal.coachContext(language).then(setCoach).catch(() => {});
        return;
      }

      const route: Route = asked === "daily" ? "auto" : asked;
      // Streamed as it is written. A failure before the first words is retried
      // once, quietly, when it was the network or the server, not the question.
      const reply = await portal.assistantAskStream(question, language, route, history, (text) =>
        setLive({ chat: target, text }),
      );
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
      const id = turnId();
      appendTo(target, { id, role: "assistant", text: reply.answer, reply, detailPending: wantsDetail });

      if (wantsDetail) {
        portal
          .assistantDetail(question, reply.answer, reply.kind, language)
          .then((detail) => patchTurn(target, id, { detail, detailPending: false }))
          .catch(() => patchTurn(target, id, { detailPending: false }));
      }
    } catch (err) {
      // Broken part-way: what she already read stays, with the note under it.
      if (err instanceof StreamBrokenError && err.partial) {
        appendTo(target, { id: turnId(), role: "assistant", text: err.partial });
      }
      const cause = err instanceof StreamBrokenError && err.partial ? err.reason : err;
      // A model call that ran past 45 s says so and offers to ask again
      // (QA H-04); every other refusal says what it is (E-03): a visitor's
      // spent trial, a signed-in hourly limit, a message over the length the
      // API takes.
      if (isTimeout(cause)) {
        setError("asst.errTimeout");
        setRetryable(question);
      } else {
        setError(askErrorKey(cause, question.length));
      }
    } finally {
      setLive(null);
      setBusy(false);
    }
  }

  const guestLeft = allowance && !allowance.unlimited ? (allowance.left ?? 0) : null;
  const fetching = active?.loaded === false;
  const empty = turns.length === 0 && !(busy && activeId) && !fetching;

  /* The Coach's questions come from her own state — the server only offers one
     when the thing it refers to exists, so there is never "what is next on my
     path" for a woman who is on none. If her state could not be read, the
     general questions stand in rather than an empty list. */
  const suggestions: string[] =
    tab === "coach"
      ? coach
        ? coach.suggestions.map((suggestion) => suggestionText(suggestion, t))
        : coachFailed
          ? SUGGESTIONS.auto.map((key) => t(key))
          : []
      : tab === "daily"
        ? []
        : SUGGESTIONS[tab].map((key) => t(key));

  if (tab === "daily") {
    return (
      <main className="wrap page asst">
        {error && <ErrorNote message={t(error)} />}
        <div className="card stack">
          {daily ? (
            <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem" }}>
              {toNewAlphabetIfUzbek(daily.answer)}
            </p>
          ) : (
            <p className="muted small">{t("asst.thinking")}</p>
          )}
        </div>
      </main>
    );
  }

  /* One column, the way a conversation reads. Empty, it is a single question
     in the middle of the screen with the field under it and a few ways to
     begin below that — nothing to read before she can type. Once she has
     asked, the thread runs top to bottom and the field stays at the foot. */
  return (
    <div
      className={`asst-layout ${historyOpen ? "is-history-open" : ""} ${sideHidden ? "is-side-hidden" : ""}`}
    >
      <aside id="asst-history" className="asst-side" aria-label={t("asst.history")}>
        <div className="asst-side-top">
          <button
            type="button"
            className="asst-icon-btn"
            onClick={toggleSide}
            aria-controls="asst-history"
            aria-expanded="true"
            aria-label={t("asst.sideClose")}
            title={t("asst.sideClose")}
          >
            <PanelIcon />
          </button>
        </div>
        <button type="button" className="asst-new" onClick={newChat} disabled={busy}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M14.5 3.5l2 2L8 14l-3 1 1-3 8.5-8.5zM4 17h12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("asst.newChat")}
        </button>
        {chats.length === 0 ? (
          <p className="asst-side-empty">{t("asst.noChats")}</p>
        ) : (
          groupByDay(chats).map(([label, items]) => (
            <section key={label} className="asst-side-group">
              <h2 className="asst-side-head">{t(label)}</h2>
              <ul>
                {items.map((chat) => (
                  <li key={chat.id} className={chat.id === activeId ? "is-active" : undefined}>
                    <button
                      type="button"
                      className="asst-side-link"
                      onClick={() => openChat(chat)}
                      aria-current={chat.id === activeId ? "true" : undefined}
                      title={chat.title}
                    >
                      {chat.title || t("asst.newChat")}
                    </button>
                    <button
                      type="button"
                      className="asst-side-del"
                      onClick={() => deleteChat(chat.id)}
                      aria-label={`${t("asst.deleteChat")}: ${chat.title}`}
                      title={t("asst.deleteChat")}
                      disabled={busy && chat.id === activeId}
                    >
                      <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
                        <path d="M5 6h10M8 6V4.5h4V6M6.5 6l.7 9.5h5.6l.7-9.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        {authed === false && <p className="asst-side-note">{t("asst.guestHistory")}</p>}
      </aside>
      {historyOpen && (
        <button
          type="button"
          className="asst-side-scrim"
          aria-label={t("lms.nav.close")}
          onClick={() => setHistoryOpen(false)}
        />
      )}

      <main className={`asst ${empty ? "asst-empty" : "asst-chat"}`}>
        {/* Shown while the list is folded (wide screen) or closed (phone):
            the panel button to bring it back, and "New chat" beside it. */}
        <div className="asst-rail">
          <button
            type="button"
            className="asst-icon-btn"
            onClick={toggleSide}
            aria-controls="asst-history"
            aria-expanded="false"
            aria-label={t("asst.sideOpen")}
            title={t("asst.sideOpen")}
          >
            <PanelIcon />
          </button>
          <button
            type="button"
            className="asst-icon-btn"
            onClick={newChat}
            disabled={busy}
            aria-label={t("asst.newChat")}
            title={t("asst.newChat")}
          >
            <svg viewBox="0 0 20 20" width="19" height="19" aria-hidden="true">
              <path d="M14.5 3.5l2 2L8 14l-3 1 1-3 8.5-8.5zM4 17h12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {empty ? (
          <h1 className="asst-hello">{t("asst.ready")}</h1>
        ) : (
          <div className="asst-thread">
            {fetching && <p className="muted small asst-thinking">{t("common.loading")}</p>}
            {turns.map((turn) =>
              turn.role === "user" ? (
                <p key={turn.id} className="bubble-user">{turn.text}</p>
              ) : (
                <AssistantTurn key={turn.id} turn={turn} />
              ),
            )}
            {busy && live?.chat === activeId && (
              <AssistantTurn turn={{ id: "live", role: "assistant", text: live.text }} />
            )}
            {busy && !live && <p className="muted small asst-thinking">{t("asst.thinking")}</p>}
            <div ref={endRef} />
          </div>
        )}

        <div className="asst-dock">
          {error && (
            <div role="alert" className="asst-error">
              <ErrorNote message={t(error).replace("{max}", String(MAX_MESSAGE))} />
              {retryable && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 8 }}
                  onClick={() => void ask(retryable)}
                  disabled={busy}
                >
                  {t("asst.retry")}
                </button>
              )}
            </div>
          )}

          <form
            className="asst-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(input);
            }}
          >
            <input
              className="asst-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("asst.placeholder")}
              aria-label={t("asst.placeholder")}
              disabled={busy || guestLeft === 0}
              maxLength={MAX_MESSAGE}
              aria-describedby="asst-counter"
              autoFocus
            />
            <button
              className="asst-send"
              type="submit"
              disabled={busy || guestLeft === 0 || !input.trim()}
              aria-label={t("asst.send")}
              title={t("asst.send")}
            >
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <path d="M10 16V4M4.5 9.5 10 4l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          {/* Shown once it matters, so an empty field is not a number. */}
          <p
            id="asst-counter"
            className={input.length >= MAX_MESSAGE ? "au-counter is-over" : "au-counter"}
            aria-live="polite"
            hidden={input.length < MAX_MESSAGE * 0.8}
          >
            {t("au.asst.counter")
              .replace("{n}", String(input.length))
              .replace("{max}", String(MAX_MESSAGE))}
          </p>
        </div>

        {empty && suggestions.length > 0 && (
          <ul className="asst-sugg">
            {suggestions.map((text) => (
              <li key={text}>
                <button type="button" onClick={() => void ask(text)} disabled={guestLeft === 0}>
                  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h7A2.5 2.5 0 0 1 16 5.5v5a2.5 2.5 0 0 1-2.5 2.5H9l-3.5 3v-3H6.5A2.5 2.5 0 0 1 4 10.5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  </svg>
                  <span>{text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* A visitor learns what she has left and what an account changes in one
            line under the field, not a warning box above it. */}
        {authed === false && (
          <p className="asst-guest">
            {guestLeft === 0
              ? t("asst.guestSpent")
              : t("asst.guestLeft").replace("{n}", String(guestLeft ?? "3"))}
            {" "}
            <SignInLink mode="signup">{t("asst.signUp")}</SignInLink>
          </p>
        )}
      </main>
    </div>
  );
}

const DAY = 24 * 60 * 60 * 1000;
/** Whether the conversation list is folded away on this device. */
const SIDE_KEY = "womanup.assistant.sidebar";

/** The panel mark: a window with its left column drawn in. */
function PanelIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.75 4v12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Today, yesterday, the last seven days, and the rest — the way a chat app
 *  sorts a list too long to read as one column. Empty groups are left out. */
function groupByDay<T extends { updatedAt: number }>(chats: readonly T[]): Array<[MessageKey, T[]]> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const start = midnight.getTime();
  const groups: Array<[MessageKey, T[]]> = [
    ["asst.today", []],
    ["asst.yesterday", []],
    ["asst.week", []],
    ["asst.earlier", []],
  ];
  for (const chat of [...chats].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const at = chat.updatedAt;
    const index = at >= start ? 0 : at >= start - DAY ? 1 : at >= start - 6 * DAY ? 2 : 3;
    groups[index][1].push(chat);
  }
  return groups.filter(([, items]) => items.length > 0);
}


function AssistantTurn({ turn }: { turn: Turn }) {
  const { t } = useI18n();
  const detail = turn.detail;
  const programs = [...(turn.reply?.programs ?? []), ...(detail?.programs ?? [])].filter(
    (program, index, all) => all.findIndex((other) => other.id === program.id) === index,
  );

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
          <RichText text={toNewAlphabetIfUzbek(turn.text)} />
          {turn.coach.unsupported && (
            <p className="faint small">{t("coach.unsupported")}</p>
          )}
          <CoachReferences references={turn.coach.references} />
        </div>
        <HelpResources resources={turn.coach.resources} />
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="bubble-ai stack" style={{ gap: 10 }}>
        {turn.reply && !turn.reply.personalised && (
          <span className="badge badge-grey">{t("asst.generic")}</span>
        )}
        {/* Said, not hidden: without the model the answer is simpler (QA B-18). */}
        {turn.reply?.degraded && <span className="faint small">{t("asst.degraded")}</span>}
        <RichText text={toNewAlphabetIfUzbek(turn.text)} />

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

      <HelpResources resources={turn.reply?.resources} />

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
                <strong className="small">{stripLeadingNumber(step.title)}</strong>
                {step.detail && <p className="muted small">{step.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Courses from the first reply as well as from the card pass, once
          each (QA B-09): an answer that names courses links them at once. */}
      {programs.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{t("asst.courses")}</span>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {programs.map((program) => (
              // QA B-27: the chip opens the course it names, not the catalogue.
              <Link key={program.id} href={`/dasturlar/${program.id}`} className="chip">
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
