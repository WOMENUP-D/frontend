"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n";
import { Nav } from "./Nav";
import { showDemo } from "@/services/env";

/** Header, and the demonstration banner above it when one is warranted.
 *
 *  The banner is off unless NEXT_PUBLIC_DEMO says otherwise. It exists to stop
 *  a visitor mistaking seeded figures for real ones — which is honest while the
 *  catalogue is synthetic and simply wrong once it is not. A live portal must
 *  not tell a woman that her own plan is a demonstration.
 *
 *  The learning section (`/talim`) carries its own shell — a fixed rail with
 *  the same destinations — so the floating top nav is suppressed there rather
 *  than stacked above it. The demo strip still shows: it is a statement about
 *  the data, and the data under /talim is every bit as synthetic. */
export function Chrome() {
  const { t } = useI18n();
  const pathname = usePathname();
  const inLearning = pathname === "/talim" || (pathname?.startsWith("/talim/") ?? false);

  return (
    <>
      {showDemo() && <div className="demo-strip">{t("demo.strip")}</div>}
      {!inLearning && <Nav />}
    </>
  );
}
