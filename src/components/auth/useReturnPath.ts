"use client";

import { usePathname, useSearchParams } from "next/navigation";

/** This page's own address — path and query — for a sign-in link to come
 *  back to (C-09). Read from the router, not from `window.location`, which
 *  still holds the previous address while a client navigation renders. */
export function useReturnPath(): string {
  const pathname = usePathname() ?? "/";
  const search = useSearchParams()?.toString() ?? "";
  return search ? `${pathname}?${search}` : pathname;
}
