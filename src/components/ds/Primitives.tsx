"use client";

/**
 * The small set of pieces every new WomanUP screen is built from, so that a
 * button, a badge or an empty page looks and behaves the same everywhere:
 *
 * * `Section` — a heading with an optional line under it and one action.
 * * `CTA` — the primary or secondary action: at least 48px tall, words that
 *   say what happens, a link or a button.
 * * `Badge` — a short state in words, with an icon when it helps. Never
 *   colour alone.
 * * `EmptyState` — what is missing, and what she can do instead.
 * * `Segmented` — two to four choices where one is always on (a view, a
 *   format). A real group of pressed buttons, so a screen reader hears it.
 * * `Tabs` — sections of one page, with arrow-key movement between them.
 * * `Sheet` — a panel from the bottom on a phone, a dialog on a desk.
 * * `StepIndicator` — a short, real sequence of steps.
 *
 * `Hint` (the "What's this?" tooltip that opens in place), `Meter` (progress),
 * `ConfirmDialog` (modal) and `Expandable` (progressive disclosure) already
 * existed and are re-exported from `./index`, not rebuilt.
 */

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useI18n } from "@/i18n";
import { Icon } from "./Icon";

export function Section({
  title,
  lead,
  action,
  level = 2,
  id,
  className,
  children,
}: {
  title: string;
  lead?: string;
  action?: ReactNode;
  level?: 2 | 3;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const auto = useId();
  const headingId = id ? `${id}-h` : auto;
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section className={`ds-section ${className ?? ""}`} aria-labelledby={headingId} id={id}>
      <div className="ds-section-head">
        <div className="ds-section-text">
          <Heading id={headingId} className={`ds-section-title is-h${level}`}>
            {title}
          </Heading>
          {lead && <p className="ds-section-lead">{lead}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function CTA({
  href,
  onClick,
  variant = "primary",
  icon,
  children,
  disabled,
  external,
  className,
  type = "button",
  ...rest
}: {
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "quiet";
  icon?: string;
  children: ReactNode;
  disabled?: boolean;
  external?: boolean;
  className?: string;
  type?: "button" | "submit";
  "aria-describedby"?: string;
}) {
  const classes = `ds-cta is-${variant} ${className ?? ""}`;
  const inner = (
    <>
      {icon && <Icon name={icon} />}
      <span>{children}</span>
    </>
  );
  if (href && external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...rest}>
        {inner}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={classes} {...rest}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled} {...rest}>
      {inner}
    </button>
  );
}

export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: "neutral" | "accent" | "good" | "muted" | "live";
  icon?: string;
  children: ReactNode;
}) {
  return (
    <span className={`ds-badge is-${tone}`}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

export function EmptyState({
  icon = "spark",
  title,
  body,
  children,
}: {
  icon?: string;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <div className="ds-empty">
      <span className="ds-empty-mark" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <p className="ds-empty-title">{title}</p>
      {body && <p className="ds-empty-body">{body}</p>}
      {children && <div className="ds-empty-actions">{children}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: string; count?: number }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="ds-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.icon && <Icon name={option.icon} />}
          <span>{option.label}</span>
          {option.count !== undefined && <span className="ds-segmented-n">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  label,
  value,
  tabs,
  onChange,
  idPrefix,
}: {
  label: string;
  value: T;
  tabs: { value: T; label: string; icon?: string }[];
  onChange: (value: T) => void;
  idPrefix: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div className="ds-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => onKey(event, index)}
          >
            {tab.icon && <Icon name={tab.icon} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** The panel a `Tabs` row controls. */
export function TabPanel({
  idPrefix,
  value,
  children,
}: {
  idPrefix: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel`}
      aria-labelledby={`${idPrefix}-tab-${value}`}
      className="ds-tabpanel"
    >
      {children}
    </div>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="ds-sheet" aria-labelledby={titleId} onClose={onClose}>
      <div className="ds-sheet-head">
        <h2 id={titleId} className="ds-sheet-title">
          {title}
        </h2>
        <button type="button" className="ds-sheet-x" onClick={onClose} aria-label={t("job.close")}>
          <Icon name="close" />
        </button>
      </div>
      <div className="ds-sheet-body">{children}</div>
      {footer && <div className="ds-sheet-foot">{footer}</div>}
    </dialog>
  );
}

export function StepIndicator({
  label,
  steps,
}: {
  label: string;
  steps: { title: string; body?: string; href?: string; icon?: string }[];
}) {
  return (
    <ol className="ds-steps" aria-label={label}>
      {steps.map((step, index) => {
        const inner = (
          <>
            <span className="ds-step-n" aria-hidden="true">
              {index + 1}
            </span>
            <span className="ds-step-text">
              <span className="ds-step-title">{step.title}</span>
              {step.body && <span className="ds-step-body">{step.body}</span>}
            </span>
          </>
        );
        return (
          <li key={step.title} className="ds-step">
            {step.href ? (
              <Link href={step.href} className="ds-step-link">
                {inner}
              </Link>
            ) : (
              <span className="ds-step-link">{inner}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
