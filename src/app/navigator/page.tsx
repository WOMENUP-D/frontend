"use client";

/**
 * The navigator used to be a second chat box with its own question box, and a
 * woman with a question had to know in advance which of the two owned it. It
 * is now one of the assistant's capabilities, chosen by routing rather than by
 * her. This route stays so existing links keep working.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NavigatorPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/yordamchi");
  }, [router]);
  return null;
}
