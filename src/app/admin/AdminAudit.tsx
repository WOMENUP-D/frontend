"use client";

/**
 * The audit log.
 *
 * Append-only by design: the service layer has no update path and production
 * grants withhold UPDATE and DELETE on the table. This view is read-only for
 * the same reason — a log an administrator can tidy is not a log.
 *
 * Admin-only, so a 403 here is expected for a coordinator and is shown as a
 * plain notice rather than an error.
 */

import { useEffect, useState } from "react";
import { ApiError } from "@/services/api";
import { portal, type AuditEntry } from "@/services/portal";
import { useI18n } from "@/i18n";
import { Loading } from "@/components/ui";

export function AdminAudit() {
  const { t } = useI18n();
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    portal
      .adminAudit(60)
      .then(setRows)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading rows={4} />;
  if (forbidden) return <p className="muted small">{t("ap.adminOnly")}</p>;
  if (rows.length === 0) return <p className="muted small">{t("ap.noAudit")}</p>;

  return (
    <div className="stack" style={{ gap: 12 }}>
      <p className="faint">{t("ap.auditNote")}</p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("ap.colWhen")}</th>
              <th>{t("ap.colActor")}</th>
              <th>{t("ap.colAction")}</th>
              <th>{t("ap.colEntity")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="faint nowrap">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td>{row.actor_role ?? "—"}</td>
                <td>
                  <code className="small">{row.action}</code>
                </td>
                <td className="faint">
                  {row.entity_type}
                  {row.classification !== "public" && (
                    <span className="badge badge-grey" style={{ marginLeft: 8 }}>
                      {row.classification}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
