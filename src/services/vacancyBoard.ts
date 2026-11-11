"use client";

/**
 * Is the job board behind `/vakansiyalar` connected at all? (QA B-19)
 *
 * When the server has no hh.uz credentials every vacancy call answers 503
 * `{reason: "provider_unconfigured"}` — permanently, until someone sets them.
 * A menu item that only ever opens "not connected yet" is a dead door, so the
 * header and the opportunities page ask this once and hide the link while the
 * board is unconfigured.
 *
 * Only the *unconfigured* answer hides the link. A transient outage
 * (`provider_unavailable`, a network error) keeps it: the page itself already
 * says so honestly and offers a retry, and hiding a menu item every time hh.uz
 * hiccups would make the header flicker.
 *
 * One request per tab session: the result is kept in memory and in
 * sessionStorage, so navigating between pages does not ask again. A server
 * that later sends `configured: false` in `/vacancies/meta` is understood too.
 */

import { useEffect, useState } from "react";
import { ApiError } from "@/services/api";
import { portal } from "@/services/portal";

export type BoardState = "unknown" | "available" | "unconfigured";

const KEY = "wu.vacancyBoard";
let pending: Promise<BoardState> | null = null;

function remembered(): BoardState | null {
  try {
    const value = sessionStorage.getItem(KEY);
    return value === "available" || value === "unconfigured" ? value : null;
  } catch {
    return null;
  }
}

function remember(value: BoardState): void {
  try {
    sessionStorage.setItem(KEY, value);
  } catch {
    /* private mode — memory only */
  }
}

/** The reason a vacancy call failed with, when the server gave one. */
export function vacancyFailureReason(cause: unknown): string | undefined {
  return cause instanceof ApiError
    ? (cause.detail as { reason?: string } | undefined)?.reason
    : undefined;
}

export function boardState(): Promise<BoardState> {
  const known = remembered();
  if (known) return Promise.resolve(known);
  if (!pending) {
    pending = portal.vacancies
      .meta()
      .then((meta) =>
        (meta as { configured?: boolean }).configured === false ? "unconfigured" : "available",
      )
      .catch((cause: unknown) =>
        vacancyFailureReason(cause) === "provider_unconfigured" ? "unconfigured" : "unknown",
      )
      .then((value: BoardState) => {
        if (value !== "unknown") remember(value);
        else pending = null; // a transient failure is asked again next time
        return value;
      });
  }
  return pending;
}

/** `false` only once the server has said the board is not connected. */
export function useVacancyBoardShown(): boolean {
  const [state, setState] = useState<BoardState>("unknown");
  useEffect(() => {
    let live = true;
    boardState().then((value) => {
      if (live) setState(value);
    });
    return () => {
      live = false;
    };
  }, []);
  return state !== "unconfigured";
}
