"use client";

/**
 * The study assistant, given a room of its own.
 *
 * It is not a bubble in the corner: asking "why does align-items do nothing
 * here" is study, not support, so it gets a page with the same furniture as
 * the rest of the section — head, one panel, one disclaimer she can read
 * without opening anything.
 *
 * The decision worth defending is what the assistant answers with. There is no
 * model behind this screen yet, and a mock that replies with plausible tutoring
 * text would be teaching her something nobody checked. So the reply says only
 * that the question was received and that the live assistant arrives with the
 * API — and the standing guardrail ("the assistant advises, the decision is
 * yours") sits under the conversation permanently, not behind an expander.
 *
 * The panel keeps the soft ground of the dashboard's assistant card rather than
 * a plain surface: her own messages are the accent, the assistant's are raised
 * surface, and neither needs a second bold block on a screen that already spent
 * that budget on the dashboard.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n";
import { assistantActions } from "@/content/learning";
import { useMockData } from "@/components/learning/useMockData";
import {
  EmptyState,
  ErrorState,
  PageHead,
  Skeleton,
  SkeletonBlock,
} from "@/components/learning/ui";

/** Long enough that the thinking line is actually read, short enough that it
 *  never feels like the page hung. */
const REPLY_MS = 900;

/**
 * A turn in the conversation.
 *
 * Hers carries text, because what she typed is her own words and must survive
 * a language switch untouched. The assistant's carries nothing: it is rendered
 * from the catalogue at paint time, so switching language re-reads the reply in
 * the new one instead of leaving a frozen sentence behind.
 */
type Turn =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "ai" };

function AssistantView() {
  const { t, tx } = useI18n();
  const params = useSearchParams();
  const ask = params.get("ask");

  // The actions come through the async boundary like every other screen's data,
  // so the loading and error paths here are the same ones the API will use.
  const { data, loading, error, retry } = useMockData(() => assistantActions);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  const nextId = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // `?ask=` fills the composer rather than sending: she arrives here from a
  // chip on the dashboard, and the question is worth a glance — and an edit —
  // before it is asked.
  useEffect(() => {
    if (!ask) return;
    const action = assistantActions.find((item) => item.id === ask);
    if (action) setDraft(tx(action.prompt));
    // Deliberately keyed on the URL alone: re-running on a language change
    // would overwrite whatever she has since typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask]);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setTurns((prev) => [...prev, { id: nextId.current++, role: "user", text: trimmed }]);
    setDraft("");
    setPending(true);

    timer.current = setTimeout(() => {
      setTurns((prev) => [...prev, { id: nextId.current++, role: "ai" }]);
      setPending(false);
    }, REPLY_MS);
  }, [pending]);

  // The newest bubble is the one she is waiting for, so keep it in view.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [turns.length, pending]);

  // What the assistant answers with until the live model is wired in. It
  // acknowledges and explains itself rather than imitating a tutor.
  const replyText = t("lms.ai.reply");

  if (error) {
    return (
      <>
        <PageHead title={t("lms.ai.title")} lead={t("lms.ai.lead")} />
        <ErrorState onRetry={retry} />
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        <PageHead title={t("lms.ai.title")} lead={t("lms.ai.lead")} />
        <ConversationSkeleton />
      </>
    );
  }

  return (
    <>
      <PageHead title={t("lms.ai.title")} lead={t("lms.ai.lead")} />

      <section className="lms-ai lms-sec">
        <div className="lms-ai-head">
          <span className="lms-ai-mark" aria-hidden="true">◈</span>
          <h2 className="lms-ai-title">{t("lms.nav.assistant")}</h2>
        </div>

        <div
          className="lms-chat"
          role="log"
          aria-live="polite"
          aria-label={t("lms.nav.assistant")}
          style={{ minHeight: 260, marginTop: 18 }}
        >
          {turns.length === 0 && !pending ? (
            <EmptyState
              title={t("lms.ai.empty")}
              hint={t("lms.ai.emptyHint")}
              action={
                data.length > 0 && (
                  <div className="lms-chips" style={{ justifyContent: "center" }}>
                    {data.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        // The chip she arrived on reads as chosen: the question
                        // is already sitting in the composer below.
                        className={`lms-chip ${action.id === ask ? "lms-chip-on" : ""}`}
                        onClick={() => send(tx(action.prompt))}
                      >
                        {tx(action.label)}
                      </button>
                    ))}
                  </div>
                )
              }
            />
          ) : (
            turns.map((turn) => (
              <p
                key={turn.id}
                className={`lms-msg ${turn.role === "user" ? "lms-msg-user" : "lms-msg-ai"}`}
              >
                {turn.role === "user" ? turn.text : replyText}
              </p>
            ))
          )}

          {pending && (
            <p className="lms-msg lms-msg-ai">{t("lms.ai.thinking")}</p>
          )}

          <div ref={end} aria-hidden="true" />
        </div>

        <form
          className="lms-composer"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <input
            type="text"
            value={draft}
            placeholder={t("lms.ai.placeholder")}
            aria-label={t("lms.ai.placeholder")}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            type="submit"
            className="lms-btn lms-btn-primary"
            disabled={pending || draft.trim().length === 0}
          >
            {t("lms.ai.send")}
          </button>
        </form>

        {/* Permanently visible, by rule: the guardrail is worth nothing if she
            has to open something to find it. */}
        <p className="lms-disclaimer">{t("lms.ai.disclaimer")}</p>
      </section>
    </>
  );
}

/** Matches the panel's real shape, so nothing jumps when the actions land. */
function ConversationSkeleton() {
  return (
    <div className="lms-sec">
      <Skeleton height={286} radius={18} />
      <div style={{ marginTop: 16 }}>
        <SkeletonBlock rows={1} />
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<ConversationSkeleton />}>
      <AssistantView />
    </Suspense>
  );
}
