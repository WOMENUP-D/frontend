"use client";

/**
 * Says so when the session is in trouble, instead of letting the page look
 * signed in while every call fails (C-25) or signed out while the session is
 * alive (C-02).
 *
 * `expired` — the server no longer honours it: sign in again, and come back
 * to this page. `offline` — the refresh could not be answered (a throttle, an
 * outage, no network): nothing was forgotten, and "Try again" asks once more.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { getSessionTrouble, onSessionTrouble, retrySession, type SessionTrouble } from "@/services/api";
import { loginHref } from "@/utils/url";

export function SessionNotice() {
  const { t } = useI18n();
  const pathname = usePathname() ?? "/";
  const [trouble, setTrouble] = useState<SessionTrouble>(() => getSessionTrouble());
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => onSessionTrouble((value) => {
    setTrouble(value);
    setDismissed(false);
  }), []);

  if (!trouble || dismissed || pathname.startsWith("/login")) return null;

  return (
    <div className="au-session" role="status" aria-live="polite">
      <span className="au-session-text">
        {t(trouble === "expired" ? "au.session.expired" : "au.session.offline")}
      </span>
      <span className="au-session-actions">
        {trouble === "expired" ? (
          <Link
            className="btn btn-primary btn-sm"
            href={loginHref("signin", pathname)}
            onClick={() => setDismissed(true)}
          >
            {t("nav.signIn")}
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await retrySession();
              setBusy(false);
              // Pages read the session when they mount; a resumed session
              // is shown by loading the page again.
              if (ok) window.location.reload();
            }}
          >
            {t(busy ? "login.working" : "au.session.retry")}
          </button>
        )}
        <button
          type="button"
          className="au-session-close"
          aria-label={t("wu.close")}
          onClick={() => setDismissed(true)}
        >
          ×
        </button>
      </span>
    </div>
  );
}
