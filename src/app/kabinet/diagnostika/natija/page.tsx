"use client";

/**
 * The check-in result: where she stands, what she is already good at, where
 * she can grow most right now, and three steps to take.
 *
 * Read like a map, not a report card. The number is "your development
 * point", every score carries a stage name that describes rather than judges
 * (starting point … advanced), and what to work on is ranked by her goals and
 * situation as well as by need — the server's priority, explained here.
 *
 * An earlier attempt opens with `?attempt=<id>`; the server only ever returns
 * her own.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, getAccessToken } from "@/services/api";
import {
  portal,
  type DiagnosticHistoryItem,
  type DiagnosticLevel,
  type DiagnosticPriority,
  type DiagnosticResult,
} from "@/services/portal";
import { Bar, Empty, ErrorNote, Loading, NeedsAuth } from "@/components/ui";
import { useStepCopy } from "@/components/Recommendations";
import { useI18n, type MessageKey } from "@/i18n";
import { dimensionKey } from "@/utils/format";

/** The stages in order, with where each starts — the ruler's zones. */
const STAGES: ReadonlyArray<[DiagnosticLevel, number]> = [
  ["starting_point", 0],
  ["building_foundation", 25],
  ["good_foundation", 50],
  ["strong_area", 75],
  ["advanced", 90],
];

export default function DiagnosticResultPage() {
  const { t, locale } = useI18n();
  const copy = useStepCopy();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [history, setHistory] = useState<DiagnosticHistoryItem[]>([]);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    setAuthed(Boolean(token));
    if (!token) return;
    const attempt = new URLSearchParams(window.location.search).get("attempt") ?? undefined;
    portal
      .diagnosticResult(attempt)
      .then(setResult)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setMissing(true);
        else setFailed(true);
      });
    portal.diagnosticHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  if (authed === false) return <main className="wrap page"><NeedsAuth /></main>;
  if (failed) return <main className="wrap page"><ErrorNote message={t("lms.err.title")} /></main>;
  if (missing) {
    return (
      <main className="wrap page">
        <Empty
          title={t("dr.none")}
          hint={t("dr.noneHint")}
          action={
            <Link href="/kabinet/diagnostika" className="btn btn-primary">
              {t("dr.start")}
            </Link>
          }
        />
      </main>
    );
  }
  if (!result) return <main className="wrap page"><Loading rows={5} /></main>;

  const levelLabel = (level: DiagnosticLevel) => t(`dr.level.${level}` as MessageKey);
  const scoreOf = (dimension: string) =>
    result.dimensions.find((d) => d.dimension === dimension)?.score ?? 0;
  const date = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale === "uz-Cyrl" ? "uz" : locale) : "";
  const earlier = history.filter((item) => item.attempt_id !== result.attempt_id);

  return (
    <main className="wrap page">
      <div className="dr">
        {/* ---- her point -------------------------------------------------- */}
        <section className="dr-hero" aria-labelledby="dr-point">
          <h1 id="dr-point" className="dr-kicker" style={{ fontSize: "1rem", margin: 0 }}>
            {t("dr.point")}
          </h1>
          <div className="dr-figure">
            <span className="dr-number">{result.overall}</span>
            <span className="dr-of">/ 100</span>
            <span className="dr-stage">{levelLabel(result.level)}</span>
          </div>
          <p className="dr-lead">{t(`dr.lead.${result.level}` as MessageKey)}</p>

          <div className="dr-ruler" aria-hidden="true">
            <span className="dr-ruler-pin" style={{ left: `${result.overall}%` }} />
            <div className="dr-ruler-track">
              {STAGES.map(([level, from]) => (
                <span
                  key={level}
                  className={result.overall >= from ? "dr-ruler-zone reached" : "dr-ruler-zone"}
                />
              ))}
            </div>
            <div className="dr-ruler-labels">
              {STAGES.map(([level]) => (
                <span key={level} className={level === result.level ? "here" : undefined}>
                  {levelLabel(level)}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ---- the eight -------------------------------------------------- */}
        <section aria-labelledby="dr-dims">
          <h2 id="dr-dims" className="dr-h2">{t("dr.dimensions")}</h2>
          <ul className="dr-dims">
            {result.dimensions.map((d) => {
              const moved = d.current !== null && Math.round(d.current) > d.score;
              return (
                <li key={d.dimension} className="dr-dim">
                  <span className="dr-dim-name">
                    {t(dimensionKey(d.dimension))}
                    <span className="dr-dim-level">
                      {levelLabel(d.level)} — {t(`dr.levelHint.${d.level}` as MessageKey)}
                    </span>
                  </span>
                  <Bar value={d.score} />
                  <span className="dr-dim-score">{d.score}</span>
                  {moved && (
                    <span className="dr-dim-now">
                      {t("dr.now").replace("{value}", String(Math.round(d.current!)))}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---- strengths and growth --------------------------------------- */}
        <div className="dr-pair">
          <section aria-labelledby="dr-strong">
            <h2 id="dr-strong" className="dr-h2">{t("dr.strongest")}</h2>
            <ul className="dr-list">
              {result.strongest.map((dimension) => (
                <li key={dimension} className="dr-item">
                  <span className="dr-item-head">
                    <span>{t(dimensionKey(dimension))}</span>
                    <span>{scoreOf(dimension)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="dr-grow">
            <h2 id="dr-grow" className="dr-h2">{t("dr.growth")}</h2>
            <p className="muted small" style={{ marginTop: -6 }}>{t("dr.growthLead")}</p>
            <ul className="dr-list">
              {result.growth.map((item) => (
                <li key={item.dimension} className="dr-item">
                  <span className="dr-item-head">
                    <span>{t(dimensionKey(item.dimension))}</span>
                    <span>{scoreOf(item.dimension)}</span>
                  </span>
                  <span className="dr-why">
                    {reasons(item).map((key) => (
                      <span key={key} className="badge badge-grey">{t(key)}</span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---- next steps ------------------------------------------------- */}
        <section aria-labelledby="dr-steps">
          <h2 id="dr-steps" className="dr-h2">{t("dr.steps")}</h2>
          {result.next_steps.length === 0 ? (
            <p className="muted">{t("dr.noSteps")}</p>
          ) : (
            <ol className="dr-steps">
              {result.next_steps.map((step, index) => (
                <li key={`${step.kind}-${step.program?.id ?? step.path?.slug ?? index}`} className="dr-step">
                  <span className="dr-step-title">{copy.title(step)}</span>
                  {step.dimension && (
                    <span className="dr-step-area">{t(dimensionKey(step.dimension))}</span>
                  )}
                  <Link href={copy.href(step)} className="btn btn-outline btn-sm">
                    {copy.action(step)}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="dr-foot">
          <Link href="/kabinet" className="btn btn-primary">{t("dr.toCabinet")}</Link>
          <Link href="/kabinet/diagnostika" className="btn btn-ghost">{t("dr.retake")}</Link>
        </div>

        {earlier.length > 0 && (
          <section aria-labelledby="dr-history">
            <h2 id="dr-history" className="dr-h2">{t("dr.history")}</h2>
            <ul className="dr-history">
              {earlier.map((item) => (
                <li key={item.attempt_id}>
                  <span>{date(item.completed_at)}</span>
                  {item.overall !== null ? (
                    <a href={`/kabinet/diagnostika/natija?attempt=${item.attempt_id}`}>
                      {item.overall} / 100
                    </a>
                  ) : (
                    <span className="faint">{t("dr.historyOld")}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

/** Why an area is among her priorities, in words — the four parts of the
 *  server's priority that actually apply to it. */
function reasons(item: DiagnosticPriority): MessageKey[] {
  const out: MessageKey[] = [];
  if (item.goal_match >= 100) out.push("dr.why.goal");
  else if (item.goal_match >= 50) out.push("dr.why.goalNear");
  if (item.urgency > 50) out.push("dr.why.now");
  if (item.need >= 50) out.push("dr.why.room");
  return out;
}
