"use client";

/**
 * A password field she can check before she submits it.
 *
 * Hidden characters are the right default on a shared office machine, but a
 * wrong password is usually a slipped key or the wrong keyboard layout — the
 * same dots whether she typed "parol" or "зфкщд" — and nothing on
 * the page lets her see which. The eye shows what is actually in the field,
 * including whatever the browser's autofill put there.
 *
 * While shown, the browser is told not to correct or capitalise it: a phone
 * that "fixes" a visible password changes it.
 */

import { useState, type InputHTMLAttributes } from "react";
import { useI18n } from "@/i18n";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className = "input input-lg", ...props }: Props) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);

  return (
    <div className="password-field">
      <input
        {...props}
        type={shown ? "text" : "password"}
        className={className}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShown((value) => !value)}
        aria-pressed={shown}
        aria-controls={props.id}
        aria-label={t(shown ? "pw.hide" : "pw.show")}
        title={t(shown ? "pw.hide" : "pw.show")}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path
            d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          {shown && (
            <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          )}
        </svg>
      </button>
    </div>
  );
}
