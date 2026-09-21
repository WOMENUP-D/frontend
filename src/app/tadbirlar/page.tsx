"use client";

/**
 * Events: seminars, workshops, forums, trainings, consultations, contests and
 * meet-ups — every one a real record an organisation or a partner published.
 *
 * The page answers "what is coming up that is worth my time". Signed in, three
 * events at most lead, each with the records that say why; then everything
 * ahead, either as a timeline by month or as a month calendar. The filters are
 * the ones the data can answer — online or in person, kind, topic, region, and
 * her own — and they live in the address, so the back button and a shared link
 * land on the same view.
 *
 * With no events at all there is no calendar: an empty grid would say "nothing
 * is happening" in the shape of a promise. The page says so in words and offers
 * what she can do instead.
 */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { getAccessToken } from "@/services/api";
import {
  portal,
  type EventCard as Event,
  type EventCatalogue,
  type EventFormat,
} from "@/services/portal";
import { ErrorNote, Loading } from "@/components/ui";
import { fill } from "@/components/jobs/format";
import { regionKey, typeKey } from "@/utils/format";
import { CTA, EmptyState, Help, Icon, Section, Segmented, Sheet } from "@/components/ds";
import { EventCard } from "@/components/events/EventCard";
import { Timeline } from "@/components/events/Timeline";
import { Calendar } from "@/components/events/Calendar";
import { dayKey } from "@/components/events/format";

type View = "list" | "calendar";

function EventsView() {
  const { t, tx } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();

  const view: View = query.get("view") === "calendar" ? "calendar" : "list";
  const format = (["online", "offline"] as const).find((f) => f === query.get("format")) ?? null;
  const type = query.get("type");
  const topic = query.get("topic");
  const region = query.get("region");
  const mine = query.get("mine") === "1";

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<EventCatalogue | null>(null);
  const [recommended, setRecommended] = useState<Event[]>([]);
  const [failed, setFailed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<{ year: number; month: number } | null>(null);

  useEffect(() => {
    const signedIn = Boolean(getAccessToken());
    setAuthed(signedIn);
    if (signedIn) portal.recommendedEvents().then(setRecommended).catch(() => setRecommended([]));
  }, []);

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(query.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, query, router],
  );

  const load = useCallback(() => {
    setFailed(false);
    portal
      .events({ type, format, topic, region, mine, size: 200 })
      .then(setData)
      .catch(() => setFailed(true));
  }, [type, format, topic, region, mine]);

  useEffect(load, [load]);

  // The calendar opens on the month of the first event it will show.
  const first = data?.items[0]?.starts_at ?? null;
  useEffect(() => {
    if (calendarMonth) return;
    const anchor = first ? dayKey(first) : dayKey(new Date());
    setCalendarMonth({ year: Number(anchor.slice(0, 4)), month: Number(anchor.slice(5, 7)) - 1 });
  }, [first, calendarMonth]);

  const facets = data?.facets ?? { types: {}, formats: {}, regions: {}, topics: [] };
  const filtered = Boolean(type || format || topic || region || mine);
  const more = [topic, region, mine].filter(Boolean).length;
  const nothingAtAll = data !== null && data.total === 0 && !filtered;
  const allFormats = Object.values(facets.formats).reduce((sum, n) => sum + n, 0);

  const kinds = useMemo(
    () => Object.entries(facets.types).sort((a, b) => b[1] - a[1]),
    [facets.types],
  );

  const moreFilters = (
    <div className="ev-more">
      <label className="ev-field">
        <span>{t("ev.topic")}</span>
        <select
          className="jb-select"
          value={topic ?? ""}
          onChange={(event) => update({ topic: event.target.value || null })}
        >
          <option value="">{t("ev.topic.any")}</option>
          {facets.topics.map(({ skill, count }) => {
            const value = skill.slug ?? skill.label;
            return (
              <option key={value} value={value}>
                {(tx(skill.name_i18n) || skill.label) + ` (${count})`}
              </option>
            );
          })}
        </select>
      </label>
      <label className="ev-field">
        <span>{t("ev.region")}</span>
        <select
          className="jb-select"
          value={region ?? ""}
          onChange={(event) => update({ region: event.target.value || null })}
        >
          <option value="">{t("ev.region.any")}</option>
          {Object.entries(facets.regions).map(([value, count]) => (
            <option key={value} value={value}>
              {t(regionKey(value)) + ` (${count})`}
            </option>
          ))}
        </select>
      </label>
      {authed && (
        <label className="jb-check ev-mine">
          <input
            type="checkbox"
            checked={mine}
            onChange={(event) => update({ mine: event.target.checked ? "1" : null })}
          />
          <span>
            <strong>{t("ev.mine")}</strong>
            <span className="ev-muted">{t("ev.mineHint")}</span>
          </span>
        </label>
      )}
    </div>
  );

  return (
    <main className="wrap page ev-page">
      <header className="ev-hero">
        <div className="ev-hero-text">
          <h1 className="ev-h1">{t("ev.title")}</h1>
          <p className="ev-lead">{t("ev.lead")}</p>
        </div>
        {!nothingAtAll && (
          <Segmented<View>
            label={t("ev.view")}
            value={view}
            onChange={(next) => update({ view: next === "list" ? null : next })}
            options={[
              { value: "list", label: t("ev.view.list"), icon: "filter" },
              { value: "calendar", label: t("ev.view.calendar"), icon: "calendar" },
            ]}
          />
        )}
      </header>

      {authed === false && (
        <p className="ev-guest">
          {t("ev.guest")}{" "}
          <Link href="/login" className="jb-inline-link">
            {t("car.signInCta")}
          </Link>
        </p>
      )}

      {authed && recommended.length > 0 && !filtered && (
        <Section title={t("ev.recommended")} lead={t("ev.recommendedLead")} className="ev-rec">
          <ul className="ev-rec-list">
            {recommended.map((item) => (
              <li key={item.id}>
                <EventCard item={item} showReasons />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {failed ? (
        <div className="stack" style={{ gap: 12 }}>
          <ErrorNote message={t("ev.loadError")} />
          <button type="button" className="btn btn-outline" onClick={load}>
            {t("lms.err.retry")}
          </button>
        </div>
      ) : data === null ? (
        <Loading rows={3} />
      ) : nothingAtAll ? (
        <EmptyState icon="calendar" title={t("ev.empty")} body={t("ev.emptyBody")}>
          <CTA href="/dasturlar" icon="book">
            {t("ev.empty.courses")}
          </CTA>
          <CTA href="/imkoniyatlar" variant="secondary" icon="briefcase">
            {t("ev.empty.opps")}
          </CTA>
          <CTA href="/yordamchi" variant="quiet" icon="spark">
            {t("ev.empty.coach")}
          </CTA>
        </EmptyState>
      ) : (
        <>
          <div className="ev-filterbar">
            <Segmented<EventFormat | "all">
              label={t("ev.format")}
              value={format ?? "all"}
              onChange={(next) => update({ format: next === "all" ? null : next })}
              options={[
                { value: "all", label: t("ev.format.all"), count: allFormats },
                { value: "online", label: t("ev.format.online"), icon: "globe", count: facets.formats.online ?? 0 },
                { value: "offline", label: t("ev.format.offline"), icon: "pin", count: facets.formats.offline ?? 0 },
              ]}
            />
            <button type="button" className="ds-cta is-secondary ev-filters-btn" onClick={() => setSheet(true)}>
              <Icon name="filter" />
              <span>{more ? fill(t("ev.filtersOn"), { n: more }) : t("ev.filters")}</span>
            </button>
          </div>

          {kinds.length > 0 && (
            <div className="ev-kinds" role="group" aria-label={t("ev.kinds")}>
              <button type="button" className="ev-kind-pill" aria-pressed={!type} onClick={() => update({ type: null })}>
                {t("ev.format.all")}
              </button>
              {kinds.map(([kind, count]) => (
                <button
                  key={kind}
                  type="button"
                  className="ev-kind-pill"
                  aria-pressed={type === kind}
                  onClick={() => update({ type: type === kind ? null : kind })}
                >
                  <Icon name={kind} />
                  {t(typeKey(kind))}
                  <span className="ev-kind-n">{count}</span>
                </button>
              ))}
            </div>
          )}
          {type && (
            <div className="ev-kind-help">
              <Help label={t("car.hint.label")}>{t(`ev.kind.${type}` as MessageKey)}</Help>
            </div>
          )}

          <div className="ev-more-inline">{moreFilters}</div>

          <div className="ev-results-head">
            <p className="ev-count" role="status">
              {data.total === 1 ? t("ev.countOne") : fill(t("ev.count"), { n: data.total })}
            </p>
            {filtered && (
              <button type="button" className="ds-cta is-quiet" onClick={() => router.replace(view === "calendar" ? `${pathname}?view=calendar` : pathname, { scroll: false })}>
                <span>{t("ev.clear")}</span>
              </button>
            )}
          </div>

          {data.total === 0 ? (
            <EmptyState icon="filter" title={t(mine ? "ev.emptyMine" : "ev.emptyFiltered")}>
              <CTA variant="secondary" onClick={() => update({ type: null, format: null, topic: null, region: null, mine: null })}>
                {t("ev.clear")}
              </CTA>
            </EmptyState>
          ) : view === "calendar" && calendarMonth ? (
            <Calendar
              year={calendarMonth.year}
              month={calendarMonth.month}
              items={data.items}
              loading={false}
              onMonth={(year, month) => setCalendarMonth({ year, month })}
            />
          ) : (
            <Timeline items={data.items} />
          )}
        </>
      )}

      <Sheet
        open={sheet}
        title={t("ev.filters")}
        onClose={() => setSheet(false)}
        footer={
          <CTA onClick={() => setSheet(false)}>{fill(t("ev.show"), { n: data?.total ?? 0 })}</CTA>
        }
      >
        {moreFilters}
      </Sheet>
    </main>
  );
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <main className="wrap page">
          <Loading rows={3} />
        </main>
      }
    >
      <EventsView />
    </Suspense>
  );
}
