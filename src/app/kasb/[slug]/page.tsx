"use client";

/**
 * One career direction, read as a journey.
 *
 * The screen makes one decision easy: what to do next. It opens on the
 * direction in plain words, then — for a woman who is signed in — the single
 * next step with one large button, then the route itself: where she is, and
 * the four stages after it, each opening in place.
 *
 * Everything is the server's reading of real records. Which stage she is on,
 * what is done, which courses, tasks and listings belong here: all decided in
 * `services.career_path`. Choosing the direction only records the choice — it
 * signs her up for nothing, and the page says so beside the button.
 *
 * A visitor gets the same route without a position on it, and one line
 * inviting her to sign in to see where she stands.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { getAccessToken } from "@/services/api";
import { portal, type CareerDetail, type CareerStage } from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import { ErrorNote, Loading } from "@/components/ui";
import { useStepCopy } from "@/components/Recommendations";
import { Journey, JourneyStep } from "@/components/guide/Journey";
import { NextStepCard } from "@/components/guide/Parts";
import { CareerIcon } from "@/components/career/CareerIcon";
import {
  BuildStage,
  ExploreStage,
  HereStage,
  LearnStage,
  PracticeStage,
} from "@/components/career/Stages";
import {
  fill,
  glyphFor,
  stageProgress,
  stageState,
  stageTitleKey,
  stateLabelKey,
} from "@/components/career/model";

export default function CareerPage() {
  const { t, tx } = useI18n();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [authed, setAuthed] = useState<boolean | null>(null);
  const { data, loading, error, retry } = useApi(() => portal.career(slug), [slug]);
  // A choice returns the fresh reading; it replaces what was loaded.
  const [fresh, setFresh] = useState<CareerDetail | null>(null);

  useEffect(() => setAuthed(Boolean(getAccessToken())), []);
  useEffect(() => setFresh(null), [slug]);

  if (loading && !fresh) {
    return (
      <main className="wrap page cp-page" aria-busy="true">
        <Loading rows={4} />
      </main>
    );
  }

  const detail = fresh ?? data;

  if (data === undefined && !fresh) {
    return (
      <main className="wrap page cp-page">
        <h1 className="cp-h1">{t("car.notFound")}</h1>
        <p className="cp-lead">{t("car.notFoundHint")}</p>
        <Link href="/kasb" className="btn btn-primary">
          {t("car.back")}
        </Link>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="wrap page cp-page">
        <ErrorNote message={t("car.loadError")} />
        <button type="button" className="btn btn-outline" onClick={retry}>
          {t("lms.err.retry")}
        </button>
      </main>
    );
  }

  return (
    <main className="wrap page cp-page cp-detail">
      <Link href="/kasb" className="cp-back">
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path
            d="M12.5 5l-5 5 5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t("car.back")}
      </Link>

      <header className="cp-head">
        <span className="cp-head-icon">
          <CareerIcon glyph={glyphFor(detail.slug, detail.category)} size={34} />
        </span>
        <div className="cp-head-text">
          <p className="cp-kind">{t(`car.cat.${detail.category}`)}</p>
          <h1 className="cp-h1">{tx(detail.title_i18n)}</h1>
          <p className="cp-lead">{tx(detail.description_i18n)}</p>
        </div>
      </header>

      {/* Beside the route on a wide screen, and kept in view while she reads
          it; above the route on a phone, where it is the first thing to do. */}
      <div className="cp-side">
        <Choice detail={detail} authed={authed} onChange={setFresh} />
        {detail.journey && <Next detail={detail} />}
      </div>

      <section className="cp-route" aria-labelledby="cp-route-h">
        <h2 id="cp-route-h" className="cp-h2">
          {t("car.cab.title")}
        </h2>
        {authed === false && <p className="cp-signin">{t("car.guest.stage")}</p>}
        <Route detail={detail} />
      </section>
    </main>
  );
}

/* ---- choosing --------------------------------------------------------- */

function Choice({
  detail,
  authed,
  onChange,
}: {
  detail: CareerDetail;
  authed: boolean | null;
  onChange: (detail: CareerDetail) => void;
}) {
  const { t, tx } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const chosen = detail.journey?.chosen ?? false;

  if (authed === null) return null;

  if (!authed) {
    return (
      <div className="cp-choice">
        <p className="cp-choice-hint">{t("car.signIn")}</p>
        <Link href="/login" className="btn btn-primary cp-btn-lg">
          {t("car.signInCta")}
        </Link>
      </div>
    );
  }

  async function choose() {
    setBusy(true);
    setFailed(false);
    try {
      onChange(await portal.chooseCareer(detail.slug));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function unchoose() {
    setBusy(true);
    setFailed(false);
    try {
      await portal.clearCareer();
      onChange(await portal.career(detail.slug));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const question = fill(t("coach.q.career"), { career: tx(detail.title_i18n) });

  return (
    <div className="cp-choice">
      {chosen ? (
        <p className="cp-chosen">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <circle cx="8" cy="8" r="7" />
            <path d="M4.8 8.2l2.2 2.2 4.3-4.6" />
          </svg>
          {t("car.chosen")}
        </p>
      ) : (
        <p className="cp-choice-hint">{t("car.chooseHint")}</p>
      )}
      <div className="cp-actions">
        {chosen ? (
          <button type="button" className="btn btn-outline" onClick={unchoose} disabled={busy}>
            {t("car.unchoose")}
          </button>
        ) : (
          <button type="button" className="btn btn-primary cp-btn-lg" onClick={choose} disabled={busy}>
            {t("car.choose")}
          </button>
        )}
        <Link href={`/yordamchi?ask=${encodeURIComponent(question)}`} className="btn btn-outline">
          {t("car.askCoach")}
        </Link>
      </div>
      {/* Said, not only drawn: a changed button is easy to miss. */}
      <p className="sr-only" aria-live="polite">
        {chosen ? t("car.chosen") : ""}
      </p>
      {failed && (
        <p className="pf-error" role="alert">
          {t("car.chooseError")}
        </p>
      )}
    </div>
  );
}

/* ---- the one next step ------------------------------------------------ */

function Next({ detail }: { detail: CareerDetail }) {
  const { t } = useI18n();
  const copy = useStepCopy();
  const journey = detail.journey!;
  const step = journey.next_step;

  if (!step) {
    return journey.current === null ? (
      <NextStepCard label={t("car.next")} title={t("car.allDone")} />
    ) : null;
  }

  return (
    <NextStepCard
      label={t("car.next")}
      context={journey.current ? t(stageTitleKey(journey.current)) : null}
      title={copy.title(step)}
      body={copy.reason(step)}
      href={copy.href(step)}
      action={copy.action(step)}
    />
  );
}

/* ---- the route -------------------------------------------------------- */

function Route({ detail }: { detail: CareerDetail }) {
  const { t } = useI18n();
  const journey = detail.journey;
  const current = journey?.current ?? null;

  function summary(stage: CareerStage): string | null {
    const reading = stageProgress(stage);
    return reading ? fill(t(reading.key), reading.values) : null;
  }

  return (
    <Journey label={t("car.cab.title")}>
      <JourneyStep
        state={journey ? "you" : "neutral"}
        title={journey ? t("car.here") : t("car.here.guestTitle")}
        summary={
          journey
            ? fill(t("car.here.summary"), { have: journey.have, total: journey.total })
            : null
        }
        defaultOpen
      >
        <HereStage detail={detail} />
      </JourneyStep>

      {detail.stages.map((stage) => {
        const state = stageState(stage, current);
        const label = stateLabelKey(state, stage);
        return (
          <JourneyStep
            key={stage.stage}
            id={`stage-${stage.stage}`}
            state={state}
            title={t(stageTitleKey(stage.stage))}
            stateLabel={label ? t(label) : null}
            summary={summary(stage)}
            // Her stage opens by itself; for a visitor, the first one does.
            defaultOpen={state === "now" || (!journey && stage.stage === "learn")}
          >
            {stage.stage === "learn" && <LearnStage detail={detail} stage={stage} />}
            {stage.stage === "practice" && <PracticeStage detail={detail} stage={stage} />}
            {stage.stage === "build" && <BuildStage detail={detail} />}
            {stage.stage === "explore" && <ExploreStage detail={detail} stage={stage} />}
          </JourneyStep>
        );
      })}
    </Journey>
  );
}
