"use client";

/**
 * An organisation's public page: who it is, whether WomanUP checked that, and
 * what it has open right now.
 *
 * Built from `OrganizationPublic`, which carries public fields only — nothing
 * about its people, and nothing unless its owner published the page and
 * WomanUP has not suspended it. A private or unknown organisation reads as
 * "not found", the same answer the server gives.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n, type MessageKey } from "@/i18n";
import { portal } from "@/services/portal";
import { useApi } from "@/components/learning/useApi";
import { ErrorNote, Loading } from "@/components/ui";
import { Hint } from "@/components/guide/Parts";
import { regionKey, typeKey } from "@/utils/format";
import { Clock, Pin } from "@/components/jobs/JobCard";
import { deadlineLine, fill } from "@/components/jobs/format";
import { VerifiedMark } from "@/components/org/Parts";

export default function OrganizationPage() {
  const { t, tx } = useI18n();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const { data, loading, error, retry } = useApi(() => portal.organizationPublic(slug), [slug]);

  if (loading) {
    return (
      <main className="wrap page jb-page" aria-busy="true">
        <Loading rows={3} />
      </main>
    );
  }

  if (data === undefined) {
    return (
      <main className="wrap page jb-page">
        <h1 className="jb-h1">{t("org.notFound")}</h1>
        <p className="jb-lead">{t("org.notFoundHint")}</p>
        <Link href="/imkoniyatlar" className="btn btn-primary">
          {t("job.back")}
        </Link>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="wrap page jb-page">
        <ErrorNote message={t("ws.loadError")} />
        <button type="button" className="btn btn-outline" onClick={retry}>
          {t("lms.err.retry")}
        </button>
      </main>
    );
  }

  const about = tx(data.description_i18n);
  const place = [data.city, data.region ? t(regionKey(data.region)) : null].filter(Boolean).join(", ");

  return (
    <main className="wrap page jb-page og-page">
      <Link href="/imkoniyatlar" className="jb-back">
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M12.5 5l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t("job.back")}
      </Link>

      <header className="og-head">
        {data.logo_url && (
          // An organisation's own logo, from its own https address.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="og-logo" src={data.logo_url} alt="" loading="lazy" />
        )}
        <div className="og-head-text">
          <p className="jb-head-kind">
            <span className="jb-kind">{t(`org.kind.${data.kind}` as MessageKey)}</span>
            {data.is_verified && (
              <span className="og-badge">
                <VerifiedMark />
                {t("org.verified")}
              </span>
            )}
          </p>
          <h1 className="jb-h1">{data.name}</h1>
          {data.is_verified && <Hint label={t("car.hint.label")}>{t("org.verifiedHint")}</Hint>}
        </div>
      </header>

      <dl className="jb-facts-list og-facts">
        {data.industry && (
          <div>
            <dt>{t("org.industry")}</dt>
            <dd>{data.industry}</dd>
          </div>
        )}
        {place && (
          <div>
            <dt>{t("org.location")}</dt>
            <dd>
              <Pin />
              {place}
            </dd>
          </div>
        )}
        {data.website && (
          <div>
            <dt>{t("org.website")}</dt>
            <dd>
              <a href={data.website} className="jb-inline-link" target="_blank" rel="noopener noreferrer nofollow">
                {data.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </dd>
          </div>
        )}
      </dl>

      <section className="jb-section" aria-labelledby="og-about-h">
        <h2 id="og-about-h" className="jb-h2">
          {t("org.about")}
        </h2>
        <p className={about ? "jb-description" : "jb-muted"}>{about || t("org.aboutNone")}</p>
      </section>

      <section className="jb-section" aria-labelledby="og-open-h">
        <h2 id="og-open-h" className="jb-h2">
          {t("org.listings")}
        </h2>
        {data.listings.length === 0 ? (
          <p className="jb-muted">{t("org.listingsNone")}</p>
        ) : (
          <ul className="og-listings">
            {data.listings.map((listing) => {
              const deadline = deadlineLine({ deadline: listing.deadline, is_open: true });
              return (
                <li key={listing.id}>
                  <Link href={`/imkoniyatlar/${listing.id}`} className="og-listing">
                    <span className="jb-kind">{t(typeKey(listing.type))}</span>
                    <span className="og-listing-title">{tx(listing.title_i18n)}</span>
                    <span className="og-listing-meta">
                      <span>
                        <Pin />
                        {listing.region ? t(regionKey(listing.region)) : t("op.wholeCountry")}
                      </span>
                      <span>
                        <Clock />
                        {fill(t(deadline.key), deadline.values)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {data.programmes.length > 0 && (
        <section className="jb-section" aria-labelledby="og-courses-h">
          <h2 id="og-courses-h" className="jb-h2">
            {t("org.programmes")}
          </h2>
          <ul className="og-courses">
            {data.programmes.map((programme) => (
              <li key={programme.id}>
                <Link href={`/dasturlar/${programme.id}`} className="jb-inline-link">
                  {tx(programme.title_i18n)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
