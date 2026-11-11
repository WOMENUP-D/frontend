"use client";

import { useEffect, useState } from "react";

/** Whether a media query matches. False on the server and on the first render,
 *  so markup never differs between server and hydration. */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);
  return matches;
}
