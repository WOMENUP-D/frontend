"use client";

/**
 * One learning path: where it leads, how far along she is, and the single
 * course to open next.
 *
 * The route is the page. Each step is a course that already exists, numbered,
 * with its own state — locked, open, in progress, finished — and the number is
 * the argument: a path is an order, and an ordered list has to look ordered.
 *
 * Two decisions worth defending.
 *
 * A locked step is shown, not hidden. She is owed the whole route before she
 * commits to it, and "finish the course before this one" is a reason she can
 * act on, while a list that quietly grows is a route she cannot judge. The lock
 * is also not a button state: the server refuses a locked step whatever this
 * page sends, and the page says so in words rather than only greying a control.
 *
 * Nothing here counts anything. The percentage, the step statuses, which course
 * is current and which is next all arrive computed — from the same enrollments
 * the course pages read. A browser that added the steps up itself would be a
 * second opinion about her own progress.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n";
import {
  portal,
  type LearningPathDetail,
  type LearningPathItem,
} from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import { art } from "@/components/learning/course";
import {
  Badge,
  Bar,
  Cover,
  EmptyState,
  ErrorState,
  PathBadge,
  Ring,
  SectionHead,
  Skeleton,
  SkeletonBlock,
  levelKey,
  pathItemKey,
} from "@/components/learning/ui";
import { dimensionKey } from "@/utils/format";

export default function LearningPathPage() {
  const { t, tx } = useI18n();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const { data, loading, error, retry } = useApi(
    () => portal.learningPath(slug),
    [slug],
  );

  /* Starting a path and enrolling in a step both return fresh server state, so
     the page updates in place rather than reloading — and it keeps showing the
     server's numbers, never a locally guessed one. */
  const [live, setLive] = useState<LearningPathDetail | null>(null);
  const path = live ?? data ?? null;

  if (error) {
    return (
      <>
        <Back />
        <ErrorState onRetry={retry} />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Back />
        <div className="lms-split">
          <div>
            <Skeleton height={140} radius={18} />
            <div style={{ marginTop: 22 }}>
              <SkeletonBlock rows={3} />
            </div>
          </div>
          <Skeleton height={280} radius={18} />
        </div>
      </>
    );
  }

  if (!path) {
    return (
      <>
        <Back />
        <EmptyState
          title={t("lms.path.notFound")}
          hint={t("lms.path.notFoundHint")}
          action={
            <Link className="lms-btn lms-btn-primary" href="/talim/yollar">
              {t("lms.path.back")}
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <Back />

      <header className="lms-head">
        <div className="lms-path-head">
          <h1 className="lms-h1">{tx(path.title_i18n)}</h1>
          <PathBadge status={path.progress.status} />
        </div>
        <p className="lms-lead">{tx(path.description_i18n)}</p>

        <div className="lms-rec-stats" style={{ marginTop: 14 }}>
          <span>
            {path.program_count} {t("lms.path.courses")}
          </span>
          {path.level && <span>{t(levelKey(path.level))}</span>}
          {path.total_hours ? (
            <span>
              {path.total_hours} {t("common.hours")}
            </span>
          ) : null}
          {path.total_weeks ? (
            <span>
              {path.total_weeks} {t("common.weeks")}
            </span>
          ) : null}
          {path.dimension && <span>{t(dimensionKey(path.dimension))}</span>}
        </div>
      </header>

      <div className="lms-split">
        <div style={{ minWidth: 0 }}>
          {path.skills.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <SectionHead title={t("lms.path.skills")} />
              <div className="lms-chips">
                {path.skills.map((skill) => (
                  <span key={skill.slug ?? skill.label} className="lms-chip lms-chip-static">
                    {tx(skill.name_i18n) || skill.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHead title={t("lms.path.curriculum")} />
            <ol className="lms-route">
              {path.items.map((item, index) => (
                <Step
                  key={item.program.id}
                  item={item}
                  index={index}
                  slug={path.slug}
                  onEnrolled={setLive}
                />
              ))}
            </ol>
          </section>
        </div>

        <Panel path={path} onStarted={setLive} />
      </div>
    </>
  );
}

/* ---- pieces ---------------------------------------------------------- */

function Back() {
  const { t } = useI18n();
  return (
    <Link className="lms-back" href="/talim/yollar">
      ← {t("lms.path.back")}
    </Link>
  );
}

/** One course in the route.
 *
 *  The action is the whole point of the row, so it says exactly one thing:
 *  open it, continue it, review it, or why it is not open yet. */
function Step({
  item,
  index,
  slug,
  onEnrolled,
}: {
  item: LearningPathItem;
  index: number;
  slug: string;
  onEnrolled: (path: LearningPathDetail) => void;
}) {
  const { t, tx } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { program, status } = item;
  const cover = art(program.category);
  const href = `/talim/kurslar/${program.slug}`;

  async function enrol() {
    setBusy(true);
    setFailed(false);
    try {
      await portal.enrollInPath(slug, program.id);
      // Re-read the route rather than patching it here: the enrollment may
      // have changed what is open further down, and the server is the only
      // thing that knows the order.
      onEnrolled(await portal.learningPath(slug));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={`lms-route-step ${status === "locked" ? "lms-route-step-locked" : ""}`}>
      <span className="lms-route-n" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="lms-route-body">
        <div className="lms-route-head">
          <Cover tone={cover.tone} emblem={cover.emblem} />
          <div style={{ minWidth: 0 }}>
            <h3 className="lms-course-title">
              {/* A locked course is still readable — the catalogue is open, and
                  a route may not hide a course from her. Only its place in the
                  order is closed. */}
              <Link href={href}>{tx(program.title_i18n)}</Link>
            </h3>
            <p className="lms-path-lead" style={{ margin: "4px 0 0" }}>
              {tx(program.goal_i18n)}
            </p>
          </div>
        </div>

        {item.skills.length > 0 && (
          <div className="lms-chips">
            {item.skills.slice(0, 4).map((skill) => (
              <span key={skill.slug ?? skill.label} className="lms-chip lms-chip-static">
                {tx(skill.name_i18n) || skill.label}
              </span>
            ))}
          </div>
        )}

        {item.progress_percent != null && (
          <div>
            <Bar percent={item.progress_percent} done={status === "completed"} />
            <div className="lms-course-meta" style={{ marginTop: 8 }}>
              <span>{t(pathItemKey(status))}</span>
              <strong style={{ color: "var(--ink)" }}>{item.progress_percent}%</strong>
            </div>
          </div>
        )}

        <div className="lms-route-foot">
          <Badge
            tone={
              status === "completed" ? "done" : status === "in_progress" ? "live" : "neutral"
            }
          >
            {t(pathItemKey(status))}
          </Badge>
          {!item.is_required && <Badge>{t("lms.path.optional")}</Badge>}

          <span className="lms-rec-stats" style={{ marginLeft: "auto" }}>
            {program.duration_hours ? (
              <span>
                {program.duration_hours} {t("common.hours")}
              </span>
            ) : null}
          </span>

          {status === "available" ? (
            <button
              type="button"
              className="lms-btn lms-btn-primary lms-btn-sm"
              onClick={enrol}
              disabled={busy}
            >
              {t("lms.path.enrol")}
            </button>
          ) : status === "locked" ? (
            <span className="lms-route-why">{t("lms.path.lockedHint")}</span>
          ) : (
            <Link className="lms-btn lms-btn-quiet lms-btn-sm" href={href}>
              {t(status === "completed" ? "lms.course.review" : "lms.course.continue")}
            </Link>
          )}
        </div>

        {failed && <p className="lms-route-why">{t("lms.path.failed")}</p>}
      </div>
    </li>
  );
}

/** Where she stands on the route, and the one thing to press. */
function Panel({
  path,
  onStarted,
}: {
  path: LearningPathDetail;
  onStarted: (path: LearningPathDetail) => void;
}) {
  const { t, tx } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { progress } = path;

  const current = path.items.find(
    (item) => item.program.id === progress.current_program_id,
  );
  const upcoming = path.items.find((item) => item.program.id === progress.next_program_id);

  async function start() {
    setBusy(true);
    setFailed(false);
    try {
      onStarted(await portal.startLearningPath(path.slug));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="lms-side-panel">
      <div className="lms-card lms-card-pad" style={{ display: "grid", gap: 16 }}>
        <SectionHead title={t("lms.path.progress")} />

        <div style={{ justifySelf: "center" }}>
          <Ring percent={progress.percent} size={116} />
        </div>

        <p className="lms-rec-stats" style={{ justifyContent: "center" }}>
          <span>
            {progress.completed_items} / {progress.required_items} {t("lms.path.required")}
          </span>
        </p>

        {current && <Line label={t("lms.path.current")} text={tx(current.program.title_i18n)} />}
        {!current && upcoming && (
          <Line label={t("lms.path.next")} text={tx(upcoming.program.title_i18n)} />
        )}

        {/* Starting is offered only while it would do something. She may
            already be walking the route through the open catalogue, and
            "start" on a path she is halfway along is a button that lies. */}
        {progress.started_at == null ? (
          <div>
            <button
              type="button"
              className="lms-btn lms-btn-primary"
              onClick={start}
              disabled={busy}
              style={{ width: "100%" }}
            >
              {t("lms.path.start")}
            </button>
            <p className="lms-route-why" style={{ marginTop: 10 }}>
              {t("lms.path.startHint")}
            </p>
          </div>
        ) : (
          <p className="lms-route-why" style={{ margin: 0 }}>
            {t("lms.path.started")}
          </p>
        )}

        {failed && <p className="lms-route-why">{t("lms.path.failed")}</p>}
      </div>
    </aside>
  );
}

function Line({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <span className="lms-route-label">{label}</span>
      <p className="lms-event-title" style={{ marginTop: 4 }}>
        {text}
      </p>
    </div>
  );
}