"use client";

/**
 * Results & impact: what is actually happening on WomanUP, counted by the
 * server from records, with every figure's definition beside it.
 *
 * One filter row scopes everything below it. A regional coordinator has no
 * region picker — the server decides her scope from her role assignment, and
 * the page only says which region that is.
 */

import { useCallback, useMemo, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { fill } from "@/components/jobs/format";
import { portal, type ResultsFilters, type ResultsScope } from "@/services/portal";
import { Segmented, TabPanel, Tabs } from "@/components/ds";
import { REGIONS, regionKey } from "@/utils/format";
import { timeText } from "@/components/events/format";
import { bucketLabel, isReversed, periodOf, PRESETS, todayIn, type Period, type Preset } from "./model";
import {
  CareerSection,
  EventsSection,
  LearningSection,
  OverviewSection,
  ScoreSection,
  SkillsSection,
  type SectionKey,
} from "./Sections";

const SECTIONS: SectionKey[] = ["overview", "learning", "skills", "score", "career", "events"];

export function Results({ canPickRegion }: { canPickRegion: boolean }) {
  const { t, locale } = useI18n();
  const today = useMemo(() => todayIn(), []);
  const [preset, setPreset] = useState<Preset>("30");
  const [custom, setCustom] = useState<Period>({ date_from: "", date_to: "" });
  const [region, setRegion] = useState("");
  const [section, setSection] = useState<SectionKey>("overview");
  const [scope, setScope] = useState<ResultsScope | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);

  const period = periodOf(preset, today, custom);
  const reversed = isReversed(period);
  const { date_from: from, date_to: to } = period;
  const filters: ResultsFilters = useMemo(
    () => ({
      ...(from ? { date_from: from } : {}),
      ...(to ? { date_to: to } : {}),
      ...(region ? { region } : {}),
    }),
    [from, to, region],
  );
  const filterKey = `${filters.date_from ?? ""}|${filters.date_to ?? ""}|${filters.region ?? ""}`;
  const onScope = useCallback((next: ResultsScope | null) => setScope(next), []);

  const day = (value: string) => bucketLabel(value, "day", locale).long;
  const periodText =
    period.date_from && period.date_to
      ? period.date_from === period.date_to
        ? day(period.date_from)
        : `${day(period.date_from)} — ${day(period.date_to)}`
      : period.date_from
        ? `${day(period.date_from)} —`
        : period.date_to
          ? `— ${day(period.date_to)}`
          : t("res.p.all");
  const scopeRegion = scope?.region ?? null;

  async function download() {
    setExporting(true);
    setExportFailed(false);
    try {
      const csv = await portal.results.exportCsv(filters);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `womanup-results-${filters.date_from ?? "all"}-${filters.date_to ?? "all"}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  }

  const props = { filters, filterKey, onScope };

  return (
    <div className="rs">
      <div className="aw-head rs-head">
        <div>
          <h1 className="aw-h1">{t("res.title")}</h1>
          <p className="rs-lead">{t("res.lead")}</p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm rs-export"
          onClick={download}
          disabled={exporting || reversed}
        >
          {exporting ? t("res.exporting") : t("res.export")}
        </button>
      </div>
      {exportFailed && (
        <p className="rs-failure" role="alert">
          {t("res.exportError")}
        </p>
      )}

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
        {canPickRegion ? (
          <label className="rs-field">
            <span>{t("ap.colRegion")}</span>
            <select className="input" value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="">{t("ap.allRegions")}</option>
              {REGIONS.map((value) => (
                <option key={value} value={value}>
                  {t(regionKey(value))}
                </option>
              ))}
            </select>
          </label>
        ) : (
          scopeRegion && (
            <p className="rs-locked">
              <strong>{fill(t("res.regionLocked"), { region: t(regionKey(scopeRegion)) })}</strong>
              <span>{t("res.regionLockedHint")}</span>
            </p>
          )
        )}
      </div>

      <p className="rs-scope" aria-live="polite">
        <span>{section === "score" ? t("res.score.now") : periodText}</span>
        <span>{scopeRegion ? t(regionKey(scopeRegion)) : t("ap.allRegions")}</span>
        <span>{t("res.scope.who")}</span>
        {scope && <span>{fill(t("res.scope.counted"), { time: timeText(scope.generated_at, locale) })}</span>}
      </p>

      {reversed ? (
        <p className="rs-failure" role="alert">
          {t("res.reversed")}
        </p>
      ) : (
        <>
          <Tabs<SectionKey>
            label={t("res.title")}
            idPrefix="rs"
            value={section}
            onChange={(next) => {
              setScope(null);
              setSection(next);
            }}
            tabs={SECTIONS.map((value) => ({ value, label: t(`res.s.${value}` as MessageKey) }))}
          />
          <TabPanel idPrefix="rs" value={section}>
            {section === "overview" && <OverviewSection {...props} />}
            {section === "learning" && <LearningSection {...props} />}
            {section === "skills" && <SkillsSection {...props} />}
            {section === "score" && <ScoreSection {...props} />}
            {section === "career" && <CareerSection {...props} />}
            {section === "events" && <EventsSection {...props} />}
          </TabPanel>
        </>
      )}
    </div>
  );
}
