"use client";

/**
 * The viewer state (see services/viewer.ts) as a hook.
 *
 * `null` while it is being asked — a caller draws a placeholder of the same
 * size rather than the guest's words, so "Create an account" never flashes
 * up in front of a woman with a plan (C-05). A guest and a staff account
 * resolve on the first render, with no request.
 */

import { useEffect, useState } from "react";
import { onTokenChange } from "@/services/api";
import { getViewer, onViewerChange, viewerNow, type ViewerState } from "@/services/viewer";

export function useViewer(): ViewerState | null {
  const [state, setState] = useState<ViewerState | null>(() => viewerNow());

  useEffect(() => {
    let live = true;
    const ask = () => {
      const now = viewerNow();
      if (now) {
        setState(now);
        return;
      }
      getViewer().then((value) => {
        if (live) setState(value);
      });
    };
    ask();
    const offViewer = onViewerChange(ask);
    const offToken = onTokenChange(ask);
    return () => {
      live = false;
      offViewer();
      offToken();
    };
  }, []);

  return state;
}

/** Whether this tab holds a session, kept current as the token changes. */
export function useSignedIn(read: () => boolean): boolean {
  const [value, setValue] = useState(read);
  useEffect(() => {
    setValue(read());
    return onTokenChange(() => setValue(read()));
    // `read` is a module function; it never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}
