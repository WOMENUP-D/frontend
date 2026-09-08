"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The async boundary the real endpoints will sit behind.
 *
 * The dataset is local, so nothing here actually waits on a network — but every
 * screen still has to render a loading, an error and a success state, and a
 * state that is never entered is a state that is never right. This hook makes
 * those states real now, so that swapping `() => courses` for
 * `() => portal.courses()` later is a one-line change per screen and the
 * skeletons, retries and empty views carry over untouched.
 *
 * `retry` exists for the same reason: an error state with a dead button is
 * worse than no button.
 */

const DELAY_MS = 320;

export interface Async<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
}

export function useMockData<T>(load: () => T, deps: unknown[] = []): Async<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setError(false);
    setLoading(true);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);

    const timer = setTimeout(() => {
      if (!live) return;
      try {
        setData(load());
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }, DELAY_MS);

    return () => {
      live = false;
      clearTimeout(timer);
    };
    // `load` is redeclared on every render by design — the caller passes an
    // inline closure — so the dependency list is the caller's, plus the retry
    // counter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps]);

  return { data, loading, error, retry };
}
