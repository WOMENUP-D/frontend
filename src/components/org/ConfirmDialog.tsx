"use client";

/**
 * Ask once before something that cannot be quietly undone: accepting an
 * invitation, stopping sharing, closing a listing, moving an application,
 * suspending an organisation.
 *
 * A native `<dialog>` opened with `showModal()`, like the filter sheet and the
 * project dialog: focus is held inside it, Escape cancels, and the browser
 * returns focus to the button that opened it. The confirm button says what it
 * does ("Yes, stop") rather than "OK", and `tone="danger"` colours it as such.
 */

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useI18n } from "@/i18n";

export function ConfirmDialog({
  open,
  title,
  children,
  confirm,
  tone = "primary",
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirm: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="cf-dialog"
      aria-labelledby={titleId}
      aria-describedby={children ? bodyId : undefined}
      onCancel={(event) => {
        // Escape while a request is in flight would leave its result nowhere.
        if (busy) event.preventDefault();
      }}
      onClose={onCancel}
    >
      <h2 id={titleId} className="cf-title">
        {title}
      </h2>
      {children && (
        <div id={bodyId} className="cf-body">
          {children}
        </div>
      )}
      {error && (
        <p className="pf-error" role="alert">
          {error}
        </p>
      )}
      <div className="cf-actions">
        <button
          type="button"
          className={`btn ${tone === "danger" ? "pf-btn-danger" : "btn-primary"}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {confirm}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
          {t("confirm.cancel")}
        </button>
      </div>
    </dialog>
  );
}
