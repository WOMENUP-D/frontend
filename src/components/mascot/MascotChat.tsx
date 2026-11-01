"use client";

/**
 * The companion's chat: the portal assistant, in a small window.
 *
 * It is the same assistant as /yordamchi — the same endpoint, the same
 * guardrails, the same three-question allowance for a visitor without an
 * account — in the shape of a conversation that opens over the page she is on.
 * The quick questions are routed straight to the portal documentation, so the
 * first answer arrives without the classification call; a typed question goes
 * through the router like anywhere else.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { fill } from "@/components/jobs/format";
import { ApiError, getAccessToken } from "@/services/api";
import { portal, type AssistantReply, type GuestAllowance } from "@/services/portal";
import { MascotFigure } from "./Mascot";

interface Turn {
  role: "user" | "assistant";
  text: string;
  source?: string | null;
}

const HISTORY_KEY = "womanup.mascot.chat";
const QUICK: { key: MessageKey; route: string }[] = [
  { key: "wu.q.what", route: "portal" },
  { key: "wu.q.programs", route: "portal" },
  { key: "wu.q.register", route: "portal" },
  { key: "wu.q.score", route: "portal" },
  { key: "wu.q.assistant", route: "portal" },
];

function readHistory(): Turn[] {
  try {
    const raw = window.sessionStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as Turn[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(turns: Turn[]) {
  try {
    window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(turns.slice(-40)));
  } catch {
    /* without storage the conversation lives as long as the window */
  }
}

export function MascotChat({ onClose }: { onClose: () => void }) {
  const { t, tu, apiLocale } = useI18n();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [allowance, setAllowance] = useState<GuestAllowance | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTurns(readHistory());
    const authed = Boolean(getAccessToken());
    setSignedIn(authed);
    if (!authed) portal.assistantGuestAllowance().then(setAllowance).catch(() => {});
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, busy]);

  // Escape closes; focus comes back to the blossom through the parent.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const spent = Boolean(allowance && !allowance.unlimited && (allowance.left ?? 1) <= 0);

  async function ask(question: string, route = "auto") {
    const text = question.trim();
    if (!text || busy || spent) return;
    const next: Turn[] = [...turns, { role: "user", text }];
    setTurns(next);
    writeHistory(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const reply: AssistantReply = await portal.assistantAsk(text, apiLocale, route);
      if (reply.guest_questions_left !== null && reply.guest_questions_left !== undefined) {
        setAllowance({
          unlimited: false,
          left: reply.guest_questions_left,
          allowance: allowance?.allowance ?? null,
        });
      }
      const answered: Turn[] = [
        ...next,
        { role: "assistant", text: reply.answer, source: reply.sources?.[0]?.document_title ?? null },
      ];
      setTurns(answered);
      writeHistory(answered);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? "wu.err.limit" : "asst.err");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div
      id="wu-chat"
      ref={panelRef}
      className="wu-chat"
      role="dialog"
      aria-modal="false"
      aria-label={t("wu.title")}
    >
      <header className="wu-chat-head">
        <MascotFigure size={34} mood="happy" />
        <div className="wu-chat-title">
          <strong>{t("wu.title")}</strong>
          <span>{t("wu.subtitle")}</span>
        </div>
        <button type="button" className="wu-chat-close" onClick={onClose} aria-label={t("wu.close")}>
          ×
        </button>
      </header>

      <div className="wu-chat-log" aria-live="polite">
        <div className="wu-msg wu-msg-assistant">
          <p>{t("wu.greeting")}</p>
        </div>
        {turns.map((turn, index) => (
          <div key={index} className={`wu-msg wu-msg-${turn.role}`}>
            <p>{turn.role === "assistant" ? tu(turn.text) : turn.text}</p>
            {turn.source && <span className="wu-msg-source">{t("asst.sources")}: {tu(turn.source)}</span>}
          </div>
        ))}
        {busy && (
          <div className="wu-msg wu-msg-assistant wu-msg-typing" aria-label={t("asst.thinking")}>
            <span className="ai-typing"><i /><i /><i /></span>
          </div>
        )}
        {error && (
          <div className="wu-msg wu-msg-error" role="alert">
            <p>{t(error)}</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setError(null)}>
              {t("wu.dismiss")}
            </button>
          </div>
        )}
        {turns.length === 0 && !busy && (
          <div className="wu-quick">
            {QUICK.map((item) => (
              <button key={item.key} type="button" className="wu-quick-btn" onClick={() => ask(t(item.key), item.route)}>
                {t(item.key)}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {!signedIn && allowance && !allowance.unlimited && (
        <p className={`wu-allowance${spent ? " is-spent" : ""}`}>
          {spent ? t("asst.guestSpent") : fill(t("asst.guestLeft"), { n: String(allowance.left ?? 0) })}
          {spent && (
            <Link href="/login" className="btn btn-primary btn-sm" onClick={onClose}>
              {t("asst.signUp")}
            </Link>
          )}
        </p>
      )}

      <form
        className="wu-chat-input"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(input);
        }}
      >
        <input
          ref={inputRef}
          className="input"
          value={input}
          maxLength={500}
          placeholder={spent ? t("asst.guestSpent") : t("asst.placeholder")}
          disabled={busy || spent}
          onChange={(event) => setInput(event.target.value)}
          aria-label={t("asst.placeholder")}
        />
        <button type="submit" className="btn btn-primary wu-send" disabled={busy || spent || !input.trim()} aria-label={t("asst.send")}>
          <span aria-hidden="true">➤</span>
        </button>
      </form>
    </div>
  );
}
