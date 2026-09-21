"use client";

/**
 * Small, reusable pieces for guided pages — the career path first, and any
 * page after it that has to be understood by somebody who has never used a
 * dashboard.
 *
 * * `SkillChip` — a skill, and in words whether she has it.
 * * `Hint` — "What's this?" beside a word that needs explaining. It opens in
 *   place rather than floating, so it works by touch, never covers the thing
 *   it explains, and needs no hover.
 * * `Meter` — "2 of 5", written out, with a bar beside it that only repeats
 *   what the words say.
 * * `NextStepCard` — the one thing to do now, with one large button.
 */

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

export function SkillChip({
  label,
  tone,
  note,
}: {
  label: string;
  /** `have` draws a filled check, `claimed` a ring with a dot (her own word,
   *  not yet shown), `need` an open circle — shape as well as colour. */
  tone: "have" | "claimed" | "need";
  /** A word or two under the name: how she has it, or why it is hard to get. */
  note?: string | null;
}) {
  return (
    <li className={`skillchip is-${tone}`}>
      <svg className="skillchip-mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {tone === "have" ? (
          <>
            <circle cx="8" cy="8" r="7" />
            <path d="M4.8 8.2l2.2 2.2 4.3-4.6" />
          </>
        ) : tone === "claimed" ? (
          <>
            <circle cx="8" cy="8" r="6.2" />
            <circle className="skillchip-dot" cx="8" cy="8" r="2.4" />
          </>
        ) : (
          <circle cx="8" cy="8" r="6.2" />
        )}
      </svg>
      <span className="skillchip-text">
        <span className="skillchip-label">{label}</span>
        {note && <span className="skillchip-note">{note}</span>}
      </span>
    </li>
  );
}

export function Hint({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="hint">
      <button
        type="button"
        className="hint-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="7" />
          <path d="M6.2 6.2a1.9 1.9 0 113 1.5c-.7.4-1.2.9-1.2 1.7M8 11.6v.1" />
        </svg>
        {label}
      </button>
      <span id={id} className="hint-body" hidden={!open}>
        {children}
      </span>
    </span>
  );
}

export function Meter({ value, max, text }: { value: number; max: number; text: string }) {
  const share = max > 0 ? Math.min(1, value / max) : 0;
  // Segments while they can be counted at a glance; a plain bar after that.
  const segmented = max > 0 && max <= 10;
  return (
    <div className="meter">
      <span className="meter-text">{text}</span>
      <span className="meter-bar" aria-hidden="true">
        {segmented ? (
          Array.from({ length: max }, (_, index) => (
            <span key={index} className={index < value ? "is-on" : ""} />
          ))
        ) : (
          <span className="meter-fill" style={{ width: `${share * 100}%` }} />
        )}
      </span>
    </div>
  );
}

export function NextStepCard({
  label,
  context,
  title,
  body,
  href,
  action,
  children,
}: {
  label: string;
  /** Where in the flow this step sits — "Learn", "Practise". */
  context?: string | null;
  title: string;
  body?: string | null;
  href?: string;
  action?: string;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <section className="nextcard" aria-labelledby={id}>
      <p className="nextcard-label" id={id}>
        {label}
        {context && <span className="nextcard-context">{context}</span>}
      </p>
      <p className="nextcard-title">{title}</p>
      {body && <p className="nextcard-body">{body}</p>}
      {href && action && (
        <Link href={href} className="btn btn-primary nextcard-action">
          {action}
        </Link>
      )}
      {children}
    </section>
  );
}
