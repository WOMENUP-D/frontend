"use client";

/**
 * Operational user list.
 *
 * Deliberately identifier-free: the API returns region, status and activity but
 * never a phone number or a name, and this table shows exactly what it returns.
 * A coordinator's job is coverage and drop-off, not looking people up.
 */

import { useCallback, useEffect, useState } from "react";
import { portal, type AdminUser } from "@/services/portal";
import { useI18n, type MessageKey } from "@/i18n";
import { regionKey } from "@/utils/format";
import { Loading } from "@/components/ui";

const PAGE = 25;

const REGIONS = [
  "tashkent_city", "tashkent_region", "andijan", "bukhara", "fergana",
  "jizzakh", "karakalpakstan", "kashkadarya", "khorezm", "namangan",
  "navoi", "samarkand", "sirdarya", "surkhandarya",
] as const;

function when(value: string | null, never: string): string {
  if (!value) return never;
  return new Date(value).toLocaleDateString();
}

export function AdminUsers() {
  const { t } = useI18n();
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [region, setRegion] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  const load = useCallback(
    async (nextOffset: number, nextRegion: string, replace: boolean) => {
      setLoading(true);
      try {
        const page = await portal.adminUsers({
          region: nextRegion || undefined,
          limit: PAGE,
          offset: nextOffset,
        });
        setRows((prev) => (replace ? page : [...prev, ...page]));
        setDone(page.length < PAGE);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setOffset(0);
    void load(0, region, true);
  }, [region, load]);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="row" style={{ gap: 10 }}>
        <select
          className="input"
          style={{ maxWidth: 260 }}
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          aria-label={t("ap.colRegion")}
        >
          <option value="">{t("ap.allRegions")}</option>
          {REGIONS.map((value) => (
            <option key={value} value={value}>
              {t(regionKey(value) as MessageKey)}
            </option>
          ))}
        </select>
      </div>

      {loading && rows.length === 0 ? (
        <Loading rows={4} />
      ) : rows.length === 0 ? (
        <p className="muted small">{t("ap.noUsers")}</p>
      ) : (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("ap.colRegion")}</th>
                  <th>{t("ap.colStatus")}</th>
                  <th>{t("ap.colLang")}</th>
                  <th>{t("ap.colOnboard")}</th>
                  <th>{t("ap.colActive")}</th>
                  <th>{t("ap.colJoined")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.region ? t(regionKey(row.region) as MessageKey) : "—"}</td>
                    <td>
                      <span className="badge badge-grey">{row.status}</span>
                    </td>
                    <td className="uppercase">{row.language}</td>
                    <td>
                      <span className={row.onboarded ? "badge badge-green" : "badge badge-grey"}>
                        {t(row.onboarded ? "ap.yes" : "ap.no")}
                      </span>
                    </td>
                    <td className="faint">{when(row.last_active_at, t("ap.never"))}</td>
                    <td className="faint">{when(row.created_at, "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!done && (
            <button
              className="btn btn-outline btn-sm"
              disabled={loading}
              onClick={() => {
                const next = offset + PAGE;
                setOffset(next);
                void load(next, region, false);
              }}
            >
              {t("ap.more")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
