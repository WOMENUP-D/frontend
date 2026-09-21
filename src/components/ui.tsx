"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n";
import { dimensionKey } from "@/utils/format";

export function Bar({ value }: { value: number }) {
  return (
    <div className="bar">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/** The composite Development Score, drawn as a ring. */
export function ScoreRing({ value, size = 148 }: { value: number; size?: number }) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);

  return (
    <svg width={size} height={size} role="img" aria-label={`Development Score ${value}`}>
      <defs>
        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--navy)" />
          <stop offset="100%" stopColor="var(--gold-soft)" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--surface-2)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="url(#ringGradient)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.7s ease" }}
      />
      <text
        x="50%" y="47%" textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.28} fontWeight="700" fill="var(--ink)"
        fontFamily="'Source Serif 4', Georgia, serif"
      >
        {Math.round(value)}
      </text>
      <text
        x="50%" y="66%" textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.09} fill="var(--text-faint)" fontWeight="700"
        letterSpacing="1"
      >
        / 100
      </text>
    </svg>
  );
}

/** One dimension's score as a labelled bar.
 *
 *  Given `onToggle`, the row is the button that opens the dimension's detail.
 *  Collapsed, it names the band only when the dimension needs attention: eight
 *  badges down a rail would say nothing, one says where to look. */
export function DimensionRow({
  dimension, current, baseline, target, band, expanded, controls, onToggle,
}: {
  dimension: string;
  current: number;
  baseline: number;
  target: number | null;
  band?: "strong" | "developing" | "focus";
  expanded?: boolean;
  controls?: string;
  onToggle?: () => void;
}) {
  const { t } = useI18n();
  const delta = current - baseline;
  const figures = (
    <span className="small muted">
      {Math.round(current)}
      {target ? ` → ${Math.round(target)}` : ""}
      {delta > 0 && <span style={{ color: "var(--success)" }}> +{Math.round(delta)}</span>}
    </span>
  );

  if (!onToggle) {
    return (
      <div className="stack" style={{ gap: 6 }}>
        <div className="spread">
          <span style={{ fontSize: "0.93rem", fontWeight: 550 }}>
            {t(dimensionKey(dimension))}
          </span>
          {figures}
        </div>
        <Bar value={current} />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="dim-toggle"
      aria-expanded={Boolean(expanded)}
      aria-controls={controls}
      onClick={onToggle}
    >
      <span className="spread">
        <span className="dim-toggle-name">
          {t(dimensionKey(dimension))}
          {band === "focus" && <span className="badge badge-gold">{t("ins.band.focus")}</span>}
        </span>
        {figures}
      </span>
      <span className="bar" aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(100, current))}%` }} />
      </span>
    </button>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card center stack" style={{ alignItems: "center", padding: 40 }}>
      <div className="card-ico" style={{ margin: "0 auto" }}>✦</div>
      <h3>{title}</h3>
      {hint && <p className="muted small" style={{ maxWidth: 460 }}>{hint}</p>}
      {action}
    </div>
  );
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="stack">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton" style={{ height: 88 }} />
      ))}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <div className="notice notice-red">
      <strong>{t("common.error")}</strong> {message}
    </div>
  );
}

/** Shown when a screen needs a session and there is none. */
export function NeedsAuth() {
  const { t } = useI18n();
  return (
    <Empty
      title={t("auth.required")}
      hint={t("auth.requiredHint")}
      action={<Link href="/login" className="btn btn-primary">{t("nav.signIn")}</Link>}
    />
  );
}

/* ---- Editorial primitives -------------------------------------------
   The site reads as an article: eyebrow + serif head + lead, then rows
   with a numeral instead of a card grid. */

export function EdHead({
  eyebrow, title, lead, className,
}: { eyebrow?: string; title: string; lead?: string; className?: string }) {
  return (
    <div className={`ed-head ${className ?? ""}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {lead && <p className="muted">{lead}</p>}
    </div>
  );
}

/** One numbered row. `as="button"` when the whole row is clickable. */
export function EdRow({
  index, icon, title, meta, badges, side, done, onClick, arrow = true,
}: {
  index?: number | string;
  icon?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  side?: ReactNode;
  done?: boolean;
  onClick?: () => void;
  arrow?: boolean;
}) {
  const inner = (
    <>
      <span className={`ed-num ${done ? "ed-num-muted" : ""}`}>
        {typeof index === "number" ? String(index).padStart(2, "0") : index}
      </span>
      <span className="ed-row-body">
        <span className="ed-row-title">
          {icon && <span className="ed-row-ico">{icon}</span>}
          {title}
          {badges}
        </span>
        {meta && <span className="muted small">{meta}</span>}
      </span>
      <span className="ed-row-side">
        {side}
        {arrow && <span className="ed-arrow">→</span>}
      </span>
    </>
  );

  const className = `ed-row ${done ? "ed-row-done" : ""}`;
  return onClick ? (
    <button type="button" className={className} onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className={className}>{inner}</div>
  );
}

export function EdRows({ children }: { children: ReactNode }) {
  return <div className="ed-rows">{children}</div>;
}
