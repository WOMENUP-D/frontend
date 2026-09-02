"use client";

import { useI18n } from "@/i18n";
import { Nav } from "./Nav";
import { showDemo } from "@/services/env";

/** Header, and the demonstration banner above it when one is warranted.
 *
 *  The banner is off unless NEXT_PUBLIC_DEMO says otherwise. It exists to stop
 *  a visitor mistaking seeded figures for real ones — which is honest while the
 *  catalogue is synthetic and simply wrong once it is not. A live portal must
 *  not tell a woman that her own plan is a demonstration. */
export function Chrome() {
  const { t } = useI18n();
  return (
    <>
      {showDemo() && <div className="demo-strip">{t("demo.strip")}</div>}
      <Nav />
    </>
  );
}
