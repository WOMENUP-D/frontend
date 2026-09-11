"use client";

/**
 * One real question from a real course, answerable before signing up.
 *
 * Every other section of the landing page describes the teaching. This is the
 * teaching — a visitor picks an answer, finds out immediately whether she was
 * right, and reads the explanation the course itself would have given her.
 * That is a different promise from "26 programmes available", and it is the
 * only part of the page that can be kept before an account exists.
 *
 * The rules it is built to:
 *
 * **The explanation shows whichever answer she picked.** Getting it wrong is
 * the moment something is learnt, so a wrong answer is marked plainly and then
 * taught — never scored, never mocked, no running tally.
 *
 * **Nothing is remembered and nothing is sent.** No account, no storage, no
 * request: the state lives for as long as the page is open. A visitor testing
 * the water should not have to wonder what was recorded about her.
 */

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n";
import { quiz } from "@/content/quiz";

export function TryQuestion() {
  const { t, tx } = useI18n();

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);

  const item = quiz[index];
  const answered = chosen !== null;
  const right = answered && item.options.find((option) => option.id === chosen)?.correct === true;
  const last = index === quiz.length - 1;

  function next() {
    setChosen(null);
    setIndex((current) => (current + 1) % quiz.length);
  }

  return (
    <section className="section try-sec">
      <div className="wrap">
        <div className="sec-head">
          <h2>{t("try.title")}</h2>
          <p>{t("try.lead")}</p>
        </div>

        <div className="try-card" style={{ ["--cat" as string]: item.tone }}>
          <div className="try-top">
            <span className="try-course">{tx(item.course)}</span>
            <span className="try-count">
              {index + 1}/{quiz.length}
            </span>
          </div>

          <h3 className="try-q">{tx(item.question)}</h3>

          {/* A radiogroup, not a row of buttons: these are one choice among
              several, and the keyboard should treat them that way. */}
          <div className="try-opts" role="radiogroup" aria-label={tx(item.question)}>
            {item.options.map((option) => {
              const picked = chosen === option.id;
              const state = !answered
                ? ""
                : option.correct
                  ? "is-right"
                  : picked
                    ? "is-wrong"
                    : "is-dim";
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  className={`try-opt ${state}`.trim()}
                  disabled={answered}
                  onClick={() => setChosen(option.id)}
                >
                  <span className="try-mark" aria-hidden="true">
                    {answered && option.correct ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5 10 17.5 19 7" />
                      </svg>
                    ) : answered && picked ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 7l10 10M17 7 7 17" />
                      </svg>
                    ) : null}
                  </span>
                  {tx(option.label)}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="try-explain" role="status">
              <span className={right ? "try-verdict is-right" : "try-verdict"}>
                {right ? t("try.right") : t("try.wrong")}
              </span>
              <p>{tx(item.explain)}</p>
              <div className="try-after">
                <button type="button" className="btn btn-outline btn-sm" onClick={next}>
                  {last ? t("try.again") : t("try.next")}
                </button>
                <Link className="btn btn-primary btn-sm" href="/dasturlar">
                  {t("try.toCourse")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
