"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/services/api";

/**
 * The learning section's async boundary, now over the real API.
 *
 * Deliberately the same shape as the mock hook it replaces — `data`, `loading`,
 * `error`, `retry` — so every screen swaps its source in one line and keeps the
 * skeletons, empty views and retry buttons it already had. That was the point
 * of building those states against fake data first.
 *
 * Two things the mock version never had to answer: a request that arrives after
 * she has navigated away (ignored, rather than setting state on a screen that
 * is gone), and a 404, which is not a failure but an answer — no such course.
 * `data` is `null` while loading and `undefined` when the server said there is
 * nothing there, which is what lets a screen tell "still loading" apart from
 * "not found".
 */

export interface Async<T> {
  data: T | null | undefined;
  loading: boolean;
  error: boolean;
  /** True when the call failed because she is not signed in. */
  unauthorised: boolean;
  retry: () => void;
}

export function useApi<T>(load: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [data, setData] = useState<T | null | undefined>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [unauthorised, setUnauthorised] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    setUnauthorised(false);

    load()
      .then((value) => {
        if (live) setData(value);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        if (cause instanceof ApiError && cause.status === 404) {
          setData(undefined);
          return;
        }
        if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) {
          setUnauthorised(true);
        }
        setError(true);
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
    // `load` is a fresh closure on every render by design — the caller passes an
    // inline arrow — so the dependency list is the caller's, plus the retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps]);

  return { data, loading, error, unauthorised, retry };
}
