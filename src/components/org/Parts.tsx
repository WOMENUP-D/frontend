"use client";

/**
 * Small pieces shared by every screen that shows an organisation.
 *
 * * `OrgLine` — who published a listing: its name, a verified mark when
 *   WomanUP checked who it is (with the plain-words caveat behind a Hint), and
 *   a link to its page only when that page is published.
 * * `Expandable` — a heading that opens its body in place. Used for "Why
 *   you're seeing this", so the reasons are one tap away without crowding a
 *   card.
 * * `StateLine` — a state in words with a shape beside it (a filled dot, a
 *   ring, a cross), so colour is never the only signal.
 */

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import type { OrganizationBrief } from "@/services/portal";
import { Hint } from "@/components/guide/Parts";

export function VerifiedMark() {
  return (
    <svg className="og-verified" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M8 1.2l1.7 1.3 2.1-.1.6 2 1.8 1.1-.7 2 .7 2-1.8 1.1-.6 2-2.1-.1L8 14.8l-1.7-1.3-2.1.1-.6-2-1.8-1.1.7-2-.7-2 1.8-1.1.6-2 2.1.1z" />
      <path className="og-verified-tick" d="M5.4 8.1l1.8 1.8 3.4-3.7" />
    </svg>
  );
}

export function OrgLine({
  org,
  fallback,
  withHint = false,
}: {
  org: OrganizationBrief | null;
  /** The listing's own organisation text, for a partner listing. */
  fallback?: string | null;
  withHint?: boolean;
}) {
  const { t } = useI18n();
  if (!org) return fallback ? <p className="jb-org">{fallback}</p> : null;
  const name = org.slug ? (
    <Link href={`/tashkilot/${org.slug}`} className="og-name-link">
      {org.name}
    </Link>
  ) : (
    <span>{org.name}</span>
  );
  return (
    <div className="og-line">
      <span className="og-by">{name}</span>
      {org.is_verified && (
        <span className="og-badge">
          <VerifiedMark />
          {t("org.verified")}
        </span>
      )}
      {org.is_verified && withHint && (
        <Hint label={t("car.hint.label")}>{t("org.verifiedHint")}</Hint>
      )}
    </div>
  );
}

export function Expandable({
  title,
  count,
  children,
  initiallyOpen = false,
}: {
  title: string;
  count?: number;
  children: ReactNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  return (
    <div className="og-expand">
      <button
        type="button"
        className="og-expand-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M7.5 5l5 5-5 5" />
        </svg>
        <span>
          {title}
          {count !== undefined && <span className="og-expand-n"> ({count})</span>}
        </span>
      </button>
      <div id={id} className="og-expand-body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}

export function StateLine({
  tone,
  children,
}: {
  tone: "good" | "wait" | "stop" | "off";
  children: ReactNode;
}) {
  return (
    <span className={`og-state is-${tone}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {tone === "good" ? (
          <>
            <circle cx="8" cy="8" r="7" />
            <path d="M4.8 8.2l2.2 2.2 4.3-4.6" />
          </>
        ) : tone === "stop" ? (
          <>
            <circle cx="8" cy="8" r="6.2" />
            <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" />
          </>
        ) : tone === "wait" ? (
          <>
            <circle cx="8" cy="8" r="6.2" />
            <circle className="dot" cx="8" cy="8" r="2.4" />
          </>
        ) : (
          <circle cx="8" cy="8" r="6.2" />
        )}
      </svg>
      {children}
    </span>
  );
}
