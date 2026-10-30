"use client";

/**
 * Analytics: did anyone come, who registered, who is still here, where they
 * drop out, which courses they use, is anything broken — counted by the server
 * from records, with every figure's definition and its "since when" beside it.
 *
 * One filter row scopes everything below it: a period in Tashkent days and a
 * switch for counting staff's own browsing, off by default. National figures
 * only, for administrators and moderators; a coordinator's screen is Results.
 */

import { useCallback, useMemo, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { fill } from "@/components/jobs/format";
import type { AnalyticsFilters, AnalyticsScope } from "@/services/portal";
import { Segmented, TabPanel, Tabs } from "@/components/ds";
import { timeText } from "@/components/events/format";
import { bucketLabel, isReversed, periodOf, todayIn, type Period, type Preset } from "@/components/results/model";
import {
  AccountsSection,
  ActivitySection,
  EngagementSection,
  ErrorsSection,
  FeaturesSection,
  FunnelSection,
  OverviewSection,
  ProgramsSection,
  TrafficSection,
  type SectionKey,
} from "./Sections";

const PRESETS: readonly Preset[] = ["today", "7", "30", "90", "custom"];
const SECTIONS: SectionKey[] = [
  "overview",
  "traffic",
  "accounts",
  "engagement",
  "funnel",
  "programs",
  "features",
  "activity",
  "errors",
];

export function Analytics({ initial = "overview" }: { initial?: SectionKey }) {
  const { t, locale } = useI18n();
  const today = useMemo(() => todayIn(), []);
  const [preset, setPreset] = useState<Preset>("30");
  const [custom, setCustom] = useState<Period>({ date_from: "", date_to: "" });
  const [withStaff, setWithStaff] = useState(false);
  const [section, setSection] = useState<SectionKey>(initial);
  const [scope, setScope] = useState<AnalyticsScope | null>(null);

  const period = periodOf(preset, today, custom);
  const reversed = isReversed(period);
  const filters: AnalyticsFilters = useMemo(
    () => ({
      ...(period.date_from ? { date_from: period.date_from } : {}),
      ...(period.date_to ? { date_to: period.date_to } : {}),
      ...(withStaff ? { include_staff: true } : {}),
    }),
    [period.date_from, period.date_to, withStaff],
  );
  const filterKey = `${filters.date_from ?? ""}|${filters.date_to ?? ""}|${withStaff ? "staff" : ""}`;
  const onScope = useCallback((next: AnalyticsScope | null) => setScope(next), []);

  const day = (value: string) => bucketLabel(value, "day", locale).long;
  const periodText =
    period.date_from && period.date_to
      ? period.date_from === period.date_to
        ? day(period.date_from)
        : `${day(period.date_from)} — ${day(period.date_to)}`
      : t("an.lastThirty");

  const props = { filters, filterKey, onScope };

  return (
    <div className="rs an">
      <div className="aw-head rs-head">
        <div>
          <h1 className="aw-h1">{t("an.title")}</h1>
          <p className="rs-lead">{t("an.lead")}</p>
        </div>
      </div>

      <div className="rs-filters">
        <Segmented<Preset>
          label={t("res.period")}
          value={preset}
          onChange={setPreset}
          options={PRESETS.map((value) => ({ value, label: t(`res.p.${value}` as MessageKey) }))}
        />
        {preset === "custom" && (
          <div className="rs-dates">
            <label className="rs-field">
              <span>{t("ap.dateFrom")}</span>
              <input
                type="date"
                className="input"
                value={custom.date_from ?? ""}
                max={today}
                onChange={(event) => setCustom({ ...custom, date_from: event.target.value })}
              />
            </label>
            <label className="rs-field">
              <span>{t("ap.dateTo")}</span>
              <input
                type="date"
                className="input"
                value={custom.date_to ?? ""}
                max={today}
                onChange={(event) => setCustom({ ...custom, date_to: event.target.value })}
              />
            </label>
          </div>
        )}
        <label className="an-switch">
          <input type="checkbox" checked={withStaff} onChange={(event) => setWithStaff(event.target.checked)} />
          <span>{t("an.includeStaff")}</span>
        </label>
      </div>

      <p className="rs-scope" aria-live="polite">
        <span>{periodText}</span>
        <span>{t("an.tz")}</span>
        <span>{withStaff ? t("an.scope.withStaff") : t("an.scope.noStaff")}</span>
        {scope && (
          <span>
            {fill(t("res.scope.counted"), { time: timeText(scope.generated_at, locale) })}
            {scope.cached && ` · ${fill(t("an.cached"), { s: String(scope.cache_ttl_seconds) })}`}
          </span>
        )}
      </p>

      {reversed ? (
        <p className="rs-failure" role="alert">{t("res.reversed")}</p>
      ) : (
        <>
          <Tabs<SectionKey>
            label={t("an.title")}
            idPrefix="an"
            value={section}
            onChange={(next) => {
              setScope(null);
              setSection(next);
            }}
            tabs={SECTIONS.map((value) => ({ value, label: t(`an.s.${value}` as MessageKey) }))}
          />
          <TabPanel idPrefix="an" value={section}>
            {section === "overview" && <OverviewSection {...props} />}
            {section === "traffic" && <TrafficSection {...props} />}
            {section === "accounts" && <AccountsSection {...props} />}
            {section === "engagement" && <EngagementSection {...props} />}
            {section === "funnel" && <FunnelSection {...props} />}
            {section === "programs" && <ProgramsSection {...props} />}
            {section === "features" && <FeaturesSection {...props} />}
            {section === "activity" && <ActivitySection {...props} />}
            {section === "errors" && <ErrorsSection {...props} />}
          </TabPanel>
        </>
      )}
    </div>
  );
}
