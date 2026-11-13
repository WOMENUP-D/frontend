"use client";

/**
 * A link to the sign-in page that opens in the right mode and comes back to
 * the page it was pressed on (C-07, C-09). Every "sign in to…" on the portal
 * goes through here, so none of them lands a returning woman on the sign-up
 * form or drops the page she was on.
 */

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { loginHref } from "@/utils/url";
import { useReturnPath } from "./useReturnPath";

export function SignInLink({
  mode = "signin",
  className,
  onClick,
  style,
  children,
}: {
  mode?: "signin" | "signup";
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const here = useReturnPath();
  return (
    <Link href={loginHref(mode, here)} className={className} onClick={onClick} style={style}>
      {children}
    </Link>
  );
}
