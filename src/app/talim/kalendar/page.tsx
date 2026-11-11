"use client";

/**
 * The learning calendar: the deadlines of her own plan steps. (QA J-03)
 *
 * Courses on WomanUP are self-paced and carry no dates, so the only dated
 * things in her learning are the steps of the plan she accepted — each has a
 * due date. They used to be visible only inside the plan, while this address
 * redirected to the events calendar, which knew nothing about them. Now the
 * steps are laid out by month here, overdue first, and the events calendar is
 * one link away for what she attends.
 *
 * Read-only on purpose: a step's status is reported by the platform (a course
 * step closes when the course does), so the place to act on one is the plan.
 */

import Link from "next/link";
import { useI18n } from "@/i18n";
import { ApiError } from "@/services/api";
import { portal, type Plan, type PlanItem } from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import {
  Badge,
  EmptyState,
  ErrorState,
  NeedsAccount,
  PageHead,
  SectionHead,
  SkeletonBlock,
  monthKey,
} from "@/components/learning/ui";

interface Month {
  key: string;
  month: number;
  year: number;
  items: PlanItem[];
}

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function LearningCalendar() {
  const { t, tu } = useI18n();

  const { data, loading, error, unauthorised, retry } = useApi(async () => {
    try {
      return await portal.activePlan();
    } catch (cause) {
      // No accepted plan is an answer, not a failure.
      if (cause instanceof ApiError && cause.status === 404) return null as Plan | null;
      throw cause;
    }
  });

  const head = <PageHead title={t("lms.dl.title")} lead={t("lms.dl.lead")} />;
  const toEvents = (
    <Link className="lms-btn lms-btn-quiet" href="/tadbirlar?view=calendar">
      {t("lms.dl.events")}
    </Link>
  );

  if (unauthorised) {
    return (
      <>
        {head}
        <NeedsAccount />
      </>
    );
  }
  if (error) {
    return (
      <>
        {head}
        <ErrorState onRetry={retry} />
      </>
    );
  }
  if (loading) {
    return (
      <>
        {head}
        <SkeletonBlock rows={3} />
      </>
    );
  }

  const plan = data ?? null;
  const dated = (plan?.items ?? [])
    .filter((item) => item.due_date && item.status !== "skipped")
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));

  if (!plan || dated.length === 0) {
    return (
      <>
        {head}
        <EmptyState
          mark="◷"
          title={t(plan ? "lms.dl.noDates" : "lms.dl.noPlan")}
          hint={t("lms.dl.emptyHint")}
          action={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <Link className="lms-btn lms-btn-primary" href="/reja">
                {t("lms.dl.toPlan")}
              </Link>
              {toEvents}
            </div>
          }
        />
      </>
    );
  }

  const now = today();
  const months: Month[] = [];
  for (const item of dated) {
    const [year, month] = String(item.due_date).split("-").map(Number);
    const key = `${year}-${month}`;
    const last = months[months.length - 1];
    if (last && last.key === key) last.items.push(item);
    else months.push({ key, year, month, items: [item] });
  }

  return (
    <>
      {head}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
        <Link className="lms-btn lms-btn-primary" href="/reja">
          {t("lms.dl.toPlan")}
        </Link>
        {toEvents}
      </div>

      {months.map((group) => (
        <section key={group.key} className="lms-sec" style={{ marginTop: 0, marginBottom: 26 }}>
          <SectionHead title={`${t(monthKey(group.month))} ${group.year}`} />
          <div className="lms-card lms-card-pad lms-events">
            {group.items.map((item) => {
              const done = item.status === "done";
              const late = !done && String(item.due_date) < now;
              const day = Number(String(item.due_date).slice(8, 10));
              return (
                <div key={item.id} className="lms-event">
                  <div className="lms-event-date" aria-hidden="true"><span className="lms-event-day">{day}</span></div>
                  <div className="lms-event-body">
                    <div className="lms-event-title">{tu(item.action)}</div>
                    <div className="lms-event-meta">
                      <time dateTime={String(item.due_date)}>
                        {day} {t(monthKey(group.month))}
                      </time>
                    </div>
                  </div>
                  {done ? (
                    <Badge tone="done">{t("plan.isDone")}</Badge>
                  ) : late ? (
                    <Badge tone="warn">{t("lms.dl.overdue")}</Badge>
                  ) : (
                    <Badge>{t("plan.awaiting")}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
