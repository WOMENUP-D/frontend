"use client";

/**
 * Date of birth, as three selects.
 *
 * Not `<input type="date">`, for three reasons that all bite this audience: on
 * iOS the native picker opens on today and a thirty-year-old has to spin the
 * year wheel back three hundred and sixty notches; the rendered order is
 * locale-dependent, so 03.09 is ambiguous between a Russian and an English
 * reader on the same page; and Firefox on desktop degrades it to a free-text
 * box with no validation at all. Three labelled selects are unambiguous in
 * every locale and reachable with a keyboard.
 *
 * The validation lives here rather than in the two pages that use it, so
 * /welcome and /login cannot drift apart on what counts as a usable answer —
 * and so that what the browser accepts matches what the API accepts.
 */

import type { RefObject } from "react";
import { useI18n, type MessageKey } from "@/i18n";

/** Mirrors MIN_SUPPORTED_AGE / MAX_SUPPORTED_AGE in backend/app/core/constants.py.
 *  The server is the authority; these exist so she is told before she submits. */
export const MIN_AGE = 10;
export const MAX_AGE = 100;

export interface BirthParts {
  day: string;
  month: string;
  year: string;
}

export const EMPTY_BIRTH: BirthParts = { day: "", month: "", year: "" };

/** Nominative month names. The catalogue's `mon.N` are genitive in Russian
 *  ("сентября") because they always follow a day number there; standing alone
 *  in a select that is simply a mis-declined noun. */
const MONTH_KEYS: MessageKey[] = [
  "mn.1", "mn.2", "mn.3", "mn.4", "mn.5", "mn.6",
  "mn.7", "mn.8", "mn.9", "mn.10", "mn.11", "mn.12",
];

function daysInMonth(month: number, year: number): number {
  if (!month) return 31;
  if (!year) return month === 2 ? 29 : [4, 6, 9, 11].includes(month) ? 30 : 31;
  return new Date(year, month, 0).getDate();
}

/** Whole years, the same arithmetic the server does. */
export function yearsBetween(born: Date, today: Date): number {
  const hadBirthday =
    today.getMonth() > born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate());
  return Math.max(0, today.getFullYear() - born.getFullYear() - (hadBirthday ? 0 : 1));
}

/** "YYYY-MM-DD", or null when the three parts are not yet a real date.
 *  Built by hand rather than through `toISOString`, which would shift the date
 *  across a timezone boundary for anyone east of UTC — which is everyone here. */
export function isoBirthDate(parts: BirthParts): string | null {
  const day = Number(parts.day);
  const month = Number(parts.month);
  const year = Number(parts.year);
  if (!day || !month || !year) return null;
  if (day > daysInMonth(month, year)) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The message key for what is wrong, or null when the date is usable.
 *  Returns null while the answer is merely incomplete — an empty form is not
 *  an error, it is an unfinished one, and saying so before she has typed is
 *  how a form starts shouting at people. */
export function birthError(parts: BirthParts, today: Date): MessageKey | null {
  const iso = isoBirthDate(parts);
  if (iso === null) {
    const someChosen = parts.day || parts.month || parts.year;
    const allChosen = parts.day && parts.month && parts.year;
    return someChosen && allChosen ? "wel.birthInvalid" : null;
  }
  const born = new Date(`${iso}T00:00:00`);
  if (born > today) return "wel.birthFuture";
  const age = yearsBetween(born, today);
  if (age < MIN_AGE) return "wel.birthTooYoung";
  if (age > MAX_AGE) return "wel.birthTooOld";
  return null;
}

export function BirthDateField({
  value,
  onChange,
  dayRef,
  error,
}: {
  value: BirthParts;
  onChange: (next: BirthParts) => void;
  dayRef?: RefObject<HTMLSelectElement | null>;
  error?: MessageKey | null;
}) {
  const { t } = useI18n();
  const thisYear = new Date().getFullYear();
  const month = Number(value.month);
  const year = Number(value.year);

  const days = Array.from({ length: daysInMonth(month, year) }, (_, i) => i + 1);
  // Newest first: far more sign-ups are eighteen than ninety, and a year list
  // that opens on 1926 is a long scroll to the common case.
  const years = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => thisYear - MIN_AGE - i);

  const set = (patch: Partial<BirthParts>) => onChange({ ...value, ...patch });

  // Shortening February under a chosen 31st would otherwise leave an
  // impossible day silently selected.
  const clampDay = (next: BirthParts) => {
    const limit = daysInMonth(Number(next.month), Number(next.year));
    return Number(next.day) > limit ? { ...next, day: String(limit) } : next;
  };

  const message = error ? t(error).replace("{n}", String(MIN_AGE)) : null;

  return (
    <fieldset className="field birth-field">
      <legend className="label">{t("wel.birthDate")}</legend>
      <div className="birth-row">
        <label className="birth-part">
          <span className="small faint">{t("wel.birthDay")}</span>
          <select
            className="input"
            ref={dayRef}
            value={value.day}
            aria-invalid={Boolean(message)}
            onChange={(event) => set({ day: event.target.value })}
          >
            <option value="">–</option>
            {days.map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
        </label>

        <label className="birth-part birth-part-month">
          <span className="small faint">{t("wel.birthMonth")}</span>
          <select
            className="input"
            value={value.month}
            aria-invalid={Boolean(message)}
            onChange={(event) =>
              onChange(clampDay({ ...value, month: event.target.value }))}
          >
            <option value="">–</option>
            {MONTH_KEYS.map((key, index) => (
              <option key={key} value={index + 1}>{t(key)}</option>
            ))}
          </select>
        </label>

        <label className="birth-part">
          <span className="small faint">{t("wel.birthYear")}</span>
          <select
            className="input"
            value={value.year}
            aria-invalid={Boolean(message)}
            onChange={(event) =>
              onChange(clampDay({ ...value, year: event.target.value }))}
          >
            <option value="">–</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>

      {message
        ? <p className="small" style={{ color: "var(--danger)", margin: 0 }} role="alert">{message}</p>
        : <p className="small faint" style={{ margin: 0 }}>{t("wel.birthWhy")}</p>}
    </fieldset>
  );
}
