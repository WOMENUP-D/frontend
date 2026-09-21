"use client";

/**
 * One event, as seven plain questions: what is it, why might it be useful,
 * when, where, who is it for, what do I need, how do I register.
 *
 * Every answer is the record's own or the server's reading of her records —
 * nothing is inferred to fill a section. A section the record cannot answer
 * says so ("the organiser hasn't added a description") rather than going
 * quiet. Registering is the listing's own flow: on the organiser's site when
 * the record says so, or here with the same consent step as applying.
 *
 * The reminder is in-app only and says so, next to the button; "Add to my
 * phone calendar" hands her a calendar file so her phone can remind her too.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { ApiError, getAccessToken } from "@/services/api";
import { portal, type EventDetail } from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import { ErrorNote, Loading } from "@/components/ui";
import { dimensionKey, typeKey } from "@/utils/format";
import { fill } from "@/components/jobs/format";
import { ApplyPanel } from "@/components/jobs/Detail";
import { SaveButton } from "@/components/jobs/JobCard";
import { OrgLine, StateLine } from "@/components/org/Parts";
import { Badge, CTA, Help, Icon } from "@/components/ds";
import { DateLeaf, placeOf } from "@/components/events/EventCard";
import {
  dateText,
  dayKey,
  forWhom,
  ics,
  longDate,
  reasonLine,
  timeText,
  whenLine,
} from "@/components/events/format";

export default function EventPage() {
  const { t, tx, locale } = useI18n();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [authed, setAuthed] = useState<boolean | null>(null);
  const { data, loading, error, retry } = useApi(() => portal.event(id), [id]);
  const [fresh, setFresh] = useState<EventDetail | null>(null);

  useEffect(() => setAuthed(Boolean(getAccessToken())), []);
  useEffect(() => setFresh(null), [id]);

  if (loading && !fresh) {
    return (
      <main className="wrap page ev-page" aria-busy="true">
        <Loading rows={4} />
      </main>
    );
  }
  const detail = fresh ?? data;
  if (data === undefined && !fresh) {
    return (
      <main className="wrap page ev-page">
        <h1 className="ev-h1">{t("ev.d.notFound")}</h1>
        <p className="ev-lead">{t("ev.d.notFoundHint")}</p>
        <CTA href="/tadbirlar">{t("ev.d.back")}</CTA>
      </main>
    );
  }
  if (error || !detail) {
    return (
      <main className="wrap page ev-page">
        <ErrorNote message={t("ev.loadError")} />
        <button type="button" className="btn btn-outline" onClick={retry}>
          {t("lms.err.retry")}
        </button>
      </main>
    );
  }

  const title = tx(detail.title_i18n);
  const description = tx(detail.description_i18n);
  const place = placeOf(detail, t);
  const who = forWhom(detail);
  const signedIn = Boolean(authed && detail.eligibility);
  const reasons = detail.reasons
    .map((reason) => reasonLine(reason, tx, (d) => t(dimensionKey(d))))
    .filter((line): line is NonNullable<typeof line> => line !== null);
  const ageBlocked =
    detail.eligibility !== null &&
    ["too_young", "too_old", "adults_only"].includes(detail.eligibility.reason ?? "");
  const range = fill(t(who.key), who.values);
  const question = fill(t("ev.d.coachQuestion"), { event: title });

  return (
    <main className="wrap page ev-page ev-detail">
      <Link href="/tadbirlar" className="jb-back">
        <Icon name="chevronLeft" />
        {t("ev.d.back")}
      </Link>

      <header className="ev-d-head">
        <DateLeaf iso={detail.starts_at} size="lg" />
        <div className="ev-d-head-text">
          <p className="ev-kind">
            <Icon name={detail.type} />
            {t(typeKey(detail.type))}
            {detail.happening && (
              <Badge tone="live" icon="spark">
                {t("ev.happening")}
              </Badge>
            )}
          </p>
          <h1 className="ev-h1">{title}</h1>
          <OrgLine org={detail.organization} fallback={detail.organisation} withHint />
        </div>
      </header>

      <div className="ev-d-side">
        <section className="ev-panel ev-register" aria-labelledby="ev-reg-h">
          <h2 id="ev-reg-h" className="ev-panel-title">
            <Icon name="check" />
            {t("ev.d.register")}
          </h2>
          {!detail.is_open ? (
            <p className="ev-note">{t("ev.regClosed")}</p>
          ) : detail.registration === "external" && detail.external_url ? (
            <>
              <CTA href={detail.external_url} external icon="external">
                {t("ev.d.registerExternal")}
              </CTA>
              <p className="ev-muted">{t("ev.d.externalNote")}</p>
            </>
          ) : (
            <ApplyPanel
              detail={detail}
              signedIn={Boolean(authed)}
              mode="event"
              embedded
              onApplied={(application) =>
                setFresh({ ...detail, application, application_status: application.status })
              }
            />
          )}
          {signedIn && (
            <div className="ev-actions">
              <SaveButton id={detail.id} title={title} saved={detail.saved} />
              {detail.is_open && !ageBlocked && (
                <Reminder
                  id={detail.id}
                  at={detail.reminder_at}
                  onChange={(at) => setFresh({ ...detail, reminder_at: at })}
                />
              )}
            </div>
          )}
          <Help label={t("ev.d.how")}>{t("ev.d.howBody")}</Help>
        </section>
        {signedIn && (
          <CTA
            href={`/yordamchi?ask=${encodeURIComponent(question)}&about=${detail.id}`}
            variant="secondary"
            icon="spark"
          >
            {t("ev.d.askCoach")}
          </CTA>
        )}
      </div>

      <div className="ev-d-main">
        <section className="ev-panel" aria-labelledby="ev-what-h">
          <h2 id="ev-what-h" className="ev-panel-title">
            <Icon name={detail.type} />
            {t("ev.d.what")}
          </h2>
          <p className="ev-kind-meaning">
            <strong>{t(typeKey(detail.type))}.</strong> {t(`ev.kind.${detail.type}` as MessageKey)}
          </p>
          <p className={description ? "ev-description" : "ev-muted"}>
            {description || t("ev.d.noDescription")}
          </p>
          {detail.skills.length > 0 && (
            <>
              <h3 className="ev-sub">{t("ev.d.topics")}</h3>
              <ul className="ev-topics">
                {detail.skills.map((skill) => (
                  <li key={skill.slug ?? skill.label}>{tx(skill.name_i18n) || skill.label}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="ev-panel" aria-labelledby="ev-why-h">
          <h2 id="ev-why-h" className="ev-panel-title">
            <Icon name="spark" />
            {t("ev.d.why")}
          </h2>
          {!signedIn ? (
            <p className="ev-muted">
              {t("ev.d.whyGuest")}{" "}
              <Link href="/login" className="jb-inline-link">
                {t("car.signInCta")}
              </Link>
            </p>
          ) : reasons.length ? (
            <ul className="ev-reasons">
              {reasons.map((line, index) => (
                <li key={index}>
                  <StateLine tone="good">{fill(t(line.key), line.values)}</StateLine>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ev-muted">{t("ev.d.whyNone")}</p>
          )}
        </section>

        <div className="ev-grid">
          <section className="ev-panel" aria-labelledby="ev-when-h">
            <h2 id="ev-when-h" className="ev-panel-title">
              <Icon name="clock" />
              {t("ev.d.when")}
            </h2>
            <p className="ev-big">{longDate(detail.starts_at, locale)}</p>
            <p>
              {timeText(detail.starts_at, locale)}
              {detail.ends_at &&
                (dayKey(detail.ends_at) === dayKey(detail.starts_at)
                  ? `–${timeText(detail.ends_at, locale)}`
                  : ` — ${fill(t("ev.until"), { time: whenLine(detail.ends_at, null, locale) })}`)}
            </p>
            <button type="button" className="ds-cta is-quiet ev-ics" onClick={() => download(detail, title, place.text)} aria-describedby="ev-ics-hint">
              <Icon name="download" />
              <span>{t("ev.d.addCalendar")}</span>
            </button>
            <p id="ev-ics-hint" className="ev-muted ev-small">
              {t("ev.d.addCalendarHint")}
            </p>
          </section>

          <section className="ev-panel" aria-labelledby="ev-where-h">
            <h2 id="ev-where-h" className="ev-panel-title">
              <Icon name={place.icon} />
              {t("ev.d.where")}
            </h2>
            <p className="ev-big">{place.text}</p>
          </section>

          <section className="ev-panel" aria-labelledby="ev-who-h">
            <h2 id="ev-who-h" className="ev-panel-title">
              <Icon name="people" />
              {t("ev.d.forWhom")}
            </h2>
            <p className="ev-big">{range}</p>
            {ageBlocked && <p className="ev-note">{t("ev.notForYou")}</p>}
          </section>

          <section className="ev-panel" aria-labelledby="ev-need-h">
            <h2 id="ev-need-h" className="ev-panel-title">
              <Icon name="task" />
              {t("ev.d.need")}
            </h2>
            <ul className="ev-needs">
              <li>{t(detail.format === "online" ? "ev.d.needOnline" : "ev.d.needOffline")}</li>
              {(detail.age_min !== null || detail.age_max !== null) && (
                <li>{fill(t("ev.d.needAge"), { range })}</li>
              )}
              {detail.other_requirements.length > 0 && (
                <li>{fill(t("ev.d.needOther"), { list: detail.other_requirements.join(", ") })}</li>
              )}
              <li>
                {detail.deadline
                  ? fill(t("ev.d.needDeadline"), { date: dateText(detail.deadline, locale) })
                  : t("ev.d.needStart")}
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

function download(detail: EventDetail, title: string, place: string) {
  const file = ics({
    id: detail.id,
    title,
    starts_at: detail.starts_at,
    ends_at: detail.ends_at,
    place,
    url: `${window.location.origin}/tadbirlar/${detail.id}`,
  });
  const url = URL.createObjectURL(new Blob([file], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "womanup-event.ics";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Remind me" — an in-app reminder the server schedules for the day before,
 *  or an hour before when that is sooner. The button says where it arrives. */
function Reminder({
  id,
  at,
  onChange,
}: {
  id: string;
  at: string | null;
  onChange: (at: string | null) => void;
}) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function set() {
    setBusy(true);
    setProblem(null);
    try {
      onChange((await portal.setReminder(id)).remind_at);
    } catch (cause) {
      const reason =
        cause instanceof ApiError ? (cause.detail as { reason?: string } | undefined)?.reason : undefined;
      setProblem(t(reason === "too_soon" ? "ev.d.reminderSoon" : "ev.d.reminderErr"));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setProblem(null);
    try {
      await portal.cancelReminder(id);
      onChange(null);
    } catch {
      setProblem(t("ev.d.reminderErr"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ev-reminder">
      {at ? (
        <>
          <p className="ev-reminder-set" role="status">
            <Icon name="bell" />
            {fill(t("ev.d.reminderSet"), {
              date: `${dateText(at, locale)}, ${timeText(at, locale)}`,
            })}
          </p>
          <button type="button" className="ds-cta is-quiet" onClick={cancel} disabled={busy}>
            <span>{t("ev.d.reminderCancel")}</span>
          </button>
        </>
      ) : (
        <button type="button" className="ds-cta is-secondary" onClick={set} disabled={busy} aria-describedby="ev-remind-how">
          <Icon name="bell" />
          <span>{t("ev.d.remind")}</span>
        </button>
      )}
      <p id="ev-remind-how" className="ev-muted ev-small">
        {t("ev.d.reminderHow")}
      </p>
      {problem && (
        <p className="pf-error" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
