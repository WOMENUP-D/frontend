"use client";

/**
 * The distance from a first lesson to a job, in named steps.
 *
 * The badges above this answer "what have I earned"; they do not answer the
 * question a learner actually asks in month two, which is "is any of this
 * going anywhere". A ladder answers it by naming the whole route at once and
 * marking where she stands on it — the point being that the route is short
 * and the remaining rungs are visible, not that the current rung is impressive.
 *
 * Two decisions worth keeping:
 *
 * **Every rung is derived, none is stored.** A stored "current step" is wrong
 * from the moment a lesson is finished until something updates it, and there
 * is nothing scheduled to update it. Each rung reads the same numbers the rest
 * of the section reads, so the ladder cannot drift away from the dashboard.
 *
 * **A rung that is not reached is not hidden or greyed into unreadability.**
 * What is still ahead is the useful half of this picture: it stays legible,
 * and the next one up is marked as the one being worked on rather than as a
 * locked door.
 */

import Link from "next/link";
import { useI18n, type MessageKey } from "@/i18n";
import { courses, courseStatus, learner, learningStats } from "@/content/learning";

type RungState = "done" | "now" | "ahead";

interface Rung {
  id: string;
  label: MessageKey;
  note: MessageKey;
  state: RungState;
  /** Shown on the rung she is on, as the one concrete thing to do next. */
  href?: string;
  cta?: MessageKey;
}

/**
 * Where she actually stands.
 *
 * Read in order, first unmet rung wins: the ladder has no branches, so the
 * position is simply the length of the completed prefix.
 */
function buildRungs(): Rung[] {
  const started = courses.some((course) => courseStatus(course) !== "not_started");
  const anyModule = learner.learningHours > 0;
  const finished = learningStats.completed > 0;
  // The certificate and what follows it are not in the dataset yet; they are
  // real steps of the programme, so they are named and left ahead rather than
  // invented as complete.
  const certificate = false;
  const resume = false;
  const placed = false;

  const reached = [started, anyModule, finished, certificate, resume, placed];
  const at = reached.findIndex((value) => !value);

  const spec: { id: string; label: MessageKey; note: MessageKey; href: string; cta: MessageKey }[] = [
    { id: "lesson", label: "lms.ladder.lesson", note: "lms.ladder.lessonNote", href: "/talim/kurslar", cta: "lms.ladder.goLesson" },
    { id: "module", label: "lms.ladder.module", note: "lms.ladder.moduleNote", href: "/talim/kurslar", cta: "lms.ladder.goModule" },
    { id: "course", label: "lms.ladder.course", note: "lms.ladder.courseNote", href: "/talim/kurslar", cta: "lms.ladder.goCourse" },
    { id: "cert", label: "lms.ladder.cert", note: "lms.ladder.certNote", href: "/dasturlar", cta: "lms.ladder.goCert" },
    { id: "resume", label: "lms.ladder.resume", note: "lms.ladder.resumeNote", href: "/dasturlar", cta: "lms.ladder.goResume" },
    { id: "job", label: "lms.ladder.job", note: "lms.ladder.jobNote", href: "/imkoniyatlar", cta: "lms.ladder.goJob" },
  ];

  return spec.map((rung, index) => {
    const state: RungState = reached[index] ? "done" : index === at ? "now" : "ahead";
    return {
      ...rung,
      state,
      href: state === "now" ? rung.href : undefined,
      cta: state === "now" ? rung.cta : undefined,
    };
  });
}

export function Ladder() {
  const { t } = useI18n();
  const rungs = buildRungs();
  const done = rungs.filter((rung) => rung.state === "done").length;

  return (
    <section className="lms-ladder" aria-label={t("lms.ladder.title")}>
      <div className="lms-ladder-head">
        <h2>{t("lms.ladder.title")}</h2>
        <span>
          {done}/{rungs.length} {t("lms.ladder.passed")}
        </span>
      </div>

      <ol className="lms-ladder-list">
        {rungs.map((rung) => (
          <li key={rung.id} className={`lms-rung is-${rung.state}`}>
            {/* The marker carries the state as a shape, so the rail reads
                without relying on the fill colour alone. */}
            <span className="lms-rung-mark" aria-hidden="true">
              {rung.state === "done" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5 10 17.5 19 7" />
                </svg>
              ) : null}
            </span>

            <span className="lms-rung-body">
              <b>{t(rung.label)}</b>
              <i>{t(rung.note)}</i>
            </span>

            {rung.state === "now" && (
              <span className="lms-rung-now">{t("lms.ladder.here")}</span>
            )}

            {rung.href && rung.cta && (
              <Link className="lms-btn lms-btn-quiet lms-rung-cta" href={rung.href}>
                {t(rung.cta)}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
