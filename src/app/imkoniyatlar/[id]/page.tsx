"use client";

/**
 * One listing: what it is, what it means for her, and applying.
 *
 * The facts first — kind, organisation, place, deadline, pay — then the one
 * decision this page exists for, with "What this means for you" beside it on a
 * wide screen and above it on a phone. Requirements and the full description
 * open in place; they are there when she wants them, not in her way.
 *
 * Every word about her fit, her eligibility and what applying shares comes
 * from the server; the page only arranges it.
 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { getAccessToken } from "@/services/api";
import { portal, type OpportunityDetail } from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import { ErrorNote, Loading } from "@/components/ui";
import { money, regionKey, typeKey } from "@/utils/format";
import { ApplyPanel, FitPanel, Requirements } from "@/components/jobs/Detail";
import { Clock, Pin, SaveButton } from "@/components/jobs/JobCard";
import { deadlineLine, fill, rewardText } from "@/components/jobs/format";
import { OrgLine } from "@/components/org/Parts";
import { kindMeaningKey, rewardTerms } from "@/components/business/format";

export default function OpportunityPage() {
  const { t, tx, locale } = useI18n();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [authed, setAuthed] = useState<boolean | null>(null);
  const { data, loading, error, retry } = useApi(() => portal.opportunity(id), [id]);
  const [fresh, setFresh] = useState<OpportunityDetail | null>(null);
  const router = useRouter();

  useEffect(() => setAuthed(Boolean(getAccessToken())), []);
  // An event has its own page, which answers when and where first.
  useEffect(() => {
    if (data?.starts_at) router.replace(`/tadbirlar/${data.id}`);
  }, [data, router]);
  useEffect(() => setFresh(null), [id]);

  if (loading && !fresh) {
    return (
      <main className="wrap page jb-page" aria-busy="true">
        <Loading rows={4} />
      </main>
    );
  }

  const detail = fresh ?? data;

  if (data === undefined && !fresh) {
    return (
      <main className="wrap page jb-page">
        <h1 className="jb-h1">{t("job.notFound")}</h1>
        <p className="jb-lead">{t("job.notFoundHint")}</p>
        <Link href="/imkoniyatlar" className="btn btn-primary">
          {t("job.back")}
        </Link>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="wrap page jb-page">
        <ErrorNote message={t("job.loadError")} />
        <button type="button" className="btn btn-outline" onClick={retry}>
          {t("lms.err.retry")}
        </button>
      </main>
    );
  }

  const title = tx(detail.title_i18n);
  const deadline = deadlineLine(detail);
  const pay = rewardText(detail.reward, (amount) => money(amount, "UZS", locale));
  const signedIn = Boolean(authed && detail.eligibility);
  const question = fill(t("job.coachQuestion"), { job: title });
  const meaning = kindMeaningKey(detail.type);
  const terms = rewardTerms(detail.reward, (amount) => money(amount, "UZS", locale));

  return (
    <main className="wrap page jb-page jb-detail">
      <Link href="/imkoniyatlar" className="jb-back">
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M12.5 5l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t("job.back")}
      </Link>

      <header className="jb-head">
        <p className="jb-head-kind">
          <span className="jb-kind">{t(typeKey(detail.type))}</span>
          <span className={`jb-open ${detail.is_open ? "is-open" : "is-closed"}`}>
            {t(detail.is_open ? "job.isOpen" : "job.isClosed")}
          </span>
        </p>
        <h1 className="jb-h1">{title}</h1>
        {meaning && <p className="bz-meaning">{t(meaning)}</p>}
        <dl className="jb-facts-list">
          {(detail.organization || detail.organisation) && (
            <div>
              <dt>{t("job.organisation")}</dt>
              <dd>
                {detail.organization ? <OrgLine org={detail.organization} /> : detail.organisation}
              </dd>
            </div>
          )}
          <div>
            <dt>{t("job.where")}</dt>
            <dd>
              <Pin />
              {detail.region ? t(regionKey(detail.region)) : t("op.wholeCountry")}
            </dd>
          </div>
          <div>
            <dt>{t("job.deadline")}</dt>
            <dd>
              <Clock />
              {fill(t(deadline.key), deadline.values)}
            </dd>
          </div>
          {pay && (
            <div>
              <dt>{t("job.pay")}</dt>
              <dd>{pay}</dd>
            </div>
          )}
          {terms.length > 0 && (
            <div>
              <dt>{t("biz.terms")}</dt>
              <dd>
                {terms.map((term) => fill(t(term.key), term.values)).join("; ")}
              </dd>
            </div>
          )}
        </dl>
        {signedIn && (
          <div className="jb-head-actions">
            <SaveButton id={detail.id} title={title} saved={detail.saved} />
            <Link href={`/yordamchi?ask=${encodeURIComponent(question)}&about=${detail.id}`} className="btn btn-outline">
              {t("job.askCoach")}
            </Link>
          </div>
        )}
      </header>

      <div className="jb-detail-side">
        <ApplyPanel
          detail={detail}
          signedIn={Boolean(authed)}
          onApplied={(application) => setFresh({ ...detail, application, application_status: application.status })}
        />
      </div>

      <div className="jb-detail-main">
        <FitPanel detail={detail} />
        <Requirements detail={detail} />
      </div>
    </main>
  );
}
