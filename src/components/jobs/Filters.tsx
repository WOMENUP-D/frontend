"use client";

/**
 * The filters that the data can actually answer: region, skill, whether to
 * include closed listings, and — for a woman who is signed in — the order.
 * There is no remote or experience filter because no listing records either.
 *
 * Every option comes from the server's facet counts, which are counted with
 * the other filters applied, so no option on offer leads to an empty page.
 * Native selects and a checkbox: large, familiar, and read correctly by every
 * screen reader. The kind of listing is not here — it is the row of pills
 * above the results, one tap away on every screen.
 */

import { useEffect, useRef } from "react";
import { useI18n } from "@/i18n";
import type { OpportunityFacets } from "@/services/portal";
import { regionKey } from "@/utils/format";
import { fill } from "./format";

export interface FilterValue {
  region: string | null;
  skill: string | null;
  closed: boolean;
  sort: "match" | "deadline" | null;
}

export function FilterControls({
  facets,
  value,
  signedIn,
  onChange,
  idPrefix,
}: {
  facets: OpportunityFacets;
  value: FilterValue;
  signedIn: boolean;
  onChange: (next: Partial<FilterValue>) => void;
  /** Two copies can be on the page (sidebar and sheet); ids must differ. */
  idPrefix: string;
}) {
  const { t, tx } = useI18n();
  const regions = Object.entries(facets.regions).sort((a, b) => b[1] - a[1]);

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
          {regions.map(([region, count]) => (
            <option key={region} value={region}>
              {t(regionKey(region))} ({count})
            </option>
          ))}
          {/* A region chosen from a link stays selectable even if the other
              filters leave it with nothing. */}
          {value.region && !(value.region in facets.regions) && (
            <option value={value.region}>{t(regionKey(value.region))} (0)</option>
          )}
        </select>
      </label>

      <label className="jb-field" htmlFor={`${idPrefix}-skill`}>
        <span className="jb-label">{t("job.skill")}</span>
        <select
          id={`${idPrefix}-skill`}
          className="jb-select"
          value={value.skill ?? ""}
          onChange={(event) => onChange({ skill: event.target.value || null })}
        >
          <option value="">{t("job.anySkill")}</option>
          {facets.skills.map(({ skill, count }) => {
            const key = skill.slug ?? skill.label;
            return (
              <option key={key} value={key}>
                {tx(skill.name_i18n) || skill.label} ({count})
              </option>
            );
          })}
          {value.skill && !facets.skills.some((f) => (f.skill.slug ?? f.skill.label) === value.skill) && (
            <option value={value.skill}>{value.skill} (0)</option>
          )}
        </select>
      </label>

      {signedIn && (
        <fieldset className="jb-field jb-radios">
          <legend className="jb-label">{t("job.sort")}</legend>
          {(["match", "deadline"] as const).map((sort) => (
            <label key={sort} className="jb-radio">
              <input
                type="radio"
                name={`${idPrefix}-sort`}
                checked={(value.sort ?? "match") === sort}
                onChange={() => onChange({ sort })}
              />
              <span>{t(`job.sort.${sort}`)}</span>
            </label>
          ))}
        </fieldset>
      )}

      <label className="jb-check">
        <input
          type="checkbox"
          checked={value.closed}
          onChange={(event) => onChange({ closed: event.target.checked })}
        />
        <span>{t("job.closed")}</span>
      </label>
    </div>
  );
}

/** The phone's filter panel: a real modal dialog, full screen, with the two
 *  buttons the brief asks for fixed at the bottom where a thumb reaches them. */
export function FilterSheet({
  open,
  onClose,
  total,
  onClear,
  children,
}: {
  open: boolean;
  onClose: () => void;
  total: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="jb-sheet" aria-labelledby="jb-sheet-title" onClose={onClose}>
      <div className="jb-sheet-head">
        <h2 id="jb-sheet-title" className="jb-sheet-title">
          {t("job.filters")}
        </h2>
        <button type="button" className="jb-sheet-x" onClick={onClose} aria-label={t("job.close")}>
          ×
        </button>
      </div>
      <div className="jb-sheet-body">{children}</div>
      <div className="jb-sheet-foot">
        <button type="button" className="btn btn-outline" onClick={onClear}>
          {t("job.clearAll")}
        </button>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {fill(t("job.showResults"), { n: total })}
        </button>
      </div>
    </dialog>
  );
}
