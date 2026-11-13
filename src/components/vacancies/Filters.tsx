"use client";

/**
 * The marketplace's filters: only what the board can answer.
 *
 * Region, a salary floor, experience, employment, work format and the
 * board's professional category — each a plain control, each written to the
 * address. Two copies can be on the page (the sidebar and the phone's sheet),
 * so ids are prefixed. The options come from `/vacancies/meta`, so a board
 * with other regions or categories changes the list, not the component.
 */

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import type { VacancyMeta } from "@/services/portal";
import { REGIONS, regionKey } from "@/utils/format";
import {
  categoryKey,
  employmentKey,
  experienceKey,
  workFormatKey,
  type VacancyFilterState,
} from "./format";

// Used when `/vacancies/meta` is unavailable (the board is not connected yet)
// or sends an empty list, so the pickers still offer every region and sphere
// instead of a lone "any" option. Category ids are the board's 27 professional
// groups; their names come from the `vac.cat.<id>` messages.
const FALLBACK: Pick<VacancyMeta, "regions" | "experience" | "employment" | "work_format" | "categories"> = {
  regions: [...REGIONS],
  experience: ["noExperience", "between1And3", "between3And6", "moreThan6"],
  employment: ["full", "part", "project", "volunteer", "probation"],
  work_format: ["ON_SITE", "REMOTE", "HYBRID", "FIELD_WORK"],
  categories: Array.from({ length: 27 }, (_, i) => ({ id: String(i + 1), name: "", roles: 0 })),
};

type FilterOptions = typeof FALLBACK;

/** The board's lists where it sent them, the built-in ones where it did not. */
function filterOptions(meta: VacancyMeta | null): FilterOptions {
  const pick = <K extends keyof FilterOptions>(key: K): FilterOptions[K] =>
    meta && meta[key]?.length ? meta[key] : FALLBACK[key];
  return {
    regions: pick("regions"),
    experience: pick("experience"),
    employment: pick("employment"),
    work_format: pick("work_format"),
    categories: pick("categories"),
  };
}

export function VacancyFilterControls({
  meta,
  value,
  onChange,
  idPrefix,
}: {
  meta: VacancyMeta | null;
  value: VacancyFilterState;
  onChange: (next: Partial<VacancyFilterState>) => void;
  idPrefix: string;
}) {
  const { t } = useI18n();
  const options = filterOptions(meta);
  // The salary box is committed after a pause, so each digit is not a request.
  const [salary, setSalary] = useState(value.salaryFrom ?? "");
  useEffect(() => setSalary(value.salaryFrom ?? ""), [value.salaryFrom]);
  useEffect(() => {
    const clean = salary.replace(/\D/g, "");
    if ((clean || null) === value.salaryFrom) return;
    const timer = setTimeout(() => onChange({ salaryFrom: clean || null }), 500);
    return () => clearTimeout(timer);
  }, [salary, value.salaryFrom, onChange]);

  const categoryName = (group: VacancyMeta["categories"][number]) => {
    const key = categoryKey(group.id);
    const named = t(key);
    return named === key ? group.name : named;
  };

  return (
    <div className="jb-filters">
      <label className="jb-field" htmlFor={`${idPrefix}-region`}>
        <span className="jb-label">{t("job.region")}</span>
        <select
          id={`${idPrefix}-region`}
          className="jb-select"
          value={value.region ?? ""}
          onChange={(event) => onChange({ region: event.target.value || null })}
        >
          <option value="">{t("job.anyRegion")}</option>
          {options.regions.map((region) => (
            <option key={region} value={region}>
              {t(regionKey(region))}
            </option>
          ))}
          {value.region && !options.regions.includes(value.region) && (
            <option value={value.region}>{t(regionKey(value.region))}</option>
          )}
        </select>
      </label>

      <label className="jb-field" htmlFor={`${idPrefix}-category`}>
        <span className="jb-label">{t("vac.category")}</span>
        <select
          id={`${idPrefix}-category`}
          className="jb-select"
          value={value.category ?? ""}
          onChange={(event) => onChange({ category: event.target.value || null })}
        >
          <option value="">{t("vac.anyCategory")}</option>
          {options.categories.map((group) => (
            <option key={group.id} value={group.id}>
              {categoryName(group)}
            </option>
          ))}
        </select>
      </label>

      <label className="jb-field" htmlFor={`${idPrefix}-salary`}>
        <span className="jb-label">{t("vac.salaryFrom")}</span>
        <input
          id={`${idPrefix}-salary`}
          className="jb-select vc-salary-input"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="5 000 000"
          value={salary}
          onChange={(event) => setSalary(event.target.value)}
        />
      </label>

      <label className="jb-check">
        <input
          type="checkbox"
          checked={value.onlyWithSalary}
          onChange={(event) => onChange({ onlyWithSalary: event.target.checked })}
        />
        <span>{t("vac.withSalary")}</span>
      </label>

      <label className="jb-field" htmlFor={`${idPrefix}-experience`}>
        <span className="jb-label">{t("vac.experience")}</span>
        <select
          id={`${idPrefix}-experience`}
          className="jb-select"
          value={value.experience ?? ""}
          onChange={(event) => onChange({ experience: event.target.value || null })}
        >
          <option value="">{t("vac.anyExperience")}</option>
          {options.experience.map((id) => (
            <option key={id} value={id}>
              {t(experienceKey(id))}
            </option>
          ))}
        </select>
      </label>

      <label className="jb-field" htmlFor={`${idPrefix}-employment`}>
        <span className="jb-label">{t("vac.employment")}</span>
        <select
          id={`${idPrefix}-employment`}
          className="jb-select"
          value={value.employment ?? ""}
          onChange={(event) => onChange({ employment: event.target.value || null })}
        >
          <option value="">{t("vac.anyEmployment")}</option>
          {options.employment.map((id) => (
            <option key={id} value={id}>
              {t(employmentKey(id))}
            </option>
          ))}
        </select>
      </label>

      <label className="jb-field" htmlFor={`${idPrefix}-format`}>
        <span className="jb-label">{t("vac.workFormat")}</span>
        <select
          id={`${idPrefix}-format`}
          className="jb-select"
          value={value.workFormat ?? ""}
          onChange={(event) => onChange({ workFormat: event.target.value || null })}
        >
          <option value="">{t("vac.anyFormat")}</option>
          {options.work_format.map((id) => (
            <option key={id} value={id}>
              {t(workFormatKey(id))}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
