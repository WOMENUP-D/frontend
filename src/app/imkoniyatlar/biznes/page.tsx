"use client";

/**
 * "For your business": a few real listings that could help her start or grow
 * a business — grants, investment, mentoring, a place to sell, contests,
 * advice.
 *
 * The server chooses them from her own records (a business she runs, the
 * direction she chose, skills she holds, interests she picked, her
 * entrepreneurship score) and sends each with its reasons. A listing whose
 * only link to her is her region is not shown here. Nothing is invented: when
 * nothing fits, the page says so and names what would help, and the full list
 * of business listings is one link away.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { getAccessToken } from "@/services/api";
import { portal, type BusinessRead } from "@/services/portal";
import { ErrorNote, Loading } from "@/components/ui";
import { Hint } from "@/components/guide/Parts";
import { BusinessCard } from "@/components/business/BusinessCard";
import { missingSignals } from "@/components/business/format";
import { fill } from "@/components/jobs/format";

const HELP: Record<"career" | "profile" | "score", { href: string; key: MessageKey }> = {
  career: { href: "/kasb", key: "biz.empty.career" },
  profile: { href: "/welcome", key: "biz.empty.profile" },
  score: { href: "/kabinet/diagnostika", key: "biz.empty.score" },
};

/** The words a woman meets on these cards, each explained once. */
const WORDS: { term: MessageKey; meaning: MessageKey }[] = [
  { term: "typ.grant", meaning: "biz.kind.grant" },
  { term: "typ.investment", meaning: "biz.kind.investment" },
  { term: "typ.mentorship", meaning: "biz.kind.mentorship" },
  { term: "typ.competition", meaning: "biz.kind.competition" },
];

export default function BusinessPage() {
  const { t } = useI18n();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<BusinessRead | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    portal
      .business()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    const signedIn = Boolean(getAccessToken());
    setAuthed(signedIn);
    if (signedIn) load();
  }, [load]);

  return (
    <main className="wrap page jb-page bz-page">
      <Link href="/imkoniyatlar" className="jb-back">
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M12.5 5l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t("job.back")}
      </Link>

      <header className="jb-hero">
        <h1 className="jb-h1">{t("biz.title")}</h1>
        <p className="jb-lead">{t("biz.lead")}</p>
      </header>

      {authed === false ? (
        <div className="jb-empty">
          <p className="jb-empty-title">{t("biz.guest")}</p>
          <div className="jb-actions">
            <Link href="/login" className="btn btn-primary">
              {t("car.signInCta")}
            </Link>
            <Link href="/imkoniyatlar?business=1" className="btn btn-outline">
              {t("biz.filter")}
            </Link>
          </div>
        </div>
      ) : failed ? (
        <div className="stack" style={{ gap: 12 }}>
          <ErrorNote message={t("biz.loadError")} />
          <button type="button" className="btn btn-outline" onClick={load}>
            {t("lms.err.retry")}
          </button>
        </div>
      ) : !data ? (
        <Loading rows={3} />
      ) : data.items.length === 0 ? (
        <section className="jb-empty" aria-labelledby="bz-empty-h">
          <h2 id="bz-empty-h" className="jb-empty-title">
            {t("biz.empty")}
          </h2>
          {missingSignals(data.signals).length > 0 && (
            <>
              <p className="jb-empty-try">{t("biz.empty.hint")}</p>
              <ul className="jb-empty-list">
                {missingSignals(data.signals).map((signal) => (
                  <li key={signal}>
                    <Link href={HELP[signal].href} className="jb-empty-link">
                      {t(HELP[signal].key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {data.total_open > 0 && (
            <Link href="/imkoniyatlar?business=1" className="btn btn-primary">
              {fill(t("biz.seeAll"), { n: data.total_open })}
            </Link>
          )}
          {data.total_open === 0 && <p className="jb-empty-later">{t("job.empty.later")}</p>}
        </section>
      ) : (
        <>
          <ul className="bz-list">
            {data.items.map((item) => (
              <BusinessCard key={item.id} item={item} />
            ))}
          </ul>
          {data.total_open > data.items.length && (
            <Link href="/imkoniyatlar?business=1" className="btn btn-outline jb-more">
              {fill(t("biz.seeAll"), { n: data.total_open })}
            </Link>
          )}
        </>
      )}

      <section className="bz-words" aria-labelledby="bz-words-h">
        <h2 id="bz-words-h" className="jb-h2">
          {t("biz.glossary")}
        </h2>
        <ul>
          {WORDS.map(({ term, meaning }) => (
            <li key={term}>
              <Hint label={t(term)}>{t(meaning)}</Hint>
            </li>
          ))}
          <li>
            <Hint label={t("biz.acceleratorTerm")}>{t("biz.accelerator")}</Hint>
          </li>
        </ul>
      </section>
    </main>
  );
}
