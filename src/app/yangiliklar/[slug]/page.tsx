"use client";

/**
 * One post on its own page — what a shared link opens.
 *
 * The age gate holds here too: an adult-health post is a 404 for a minor and
 * for a reader whose age is not known. Filtering only the feed would leave the
 * article one shared URL away from a twelve-year-old, so the check is on the
 * server and this page simply renders what it is given.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { portal, type NewsDetail } from "@/services/portal";
import { NewsBody } from "@/components/NewsBody";
import { Empty, ErrorNote, Loading } from "@/components/ui";
import { useI18n } from "@/i18n";
import { newsCategoryKey, timeAgo } from "@/utils/format";

export default function NewsPostPage() {
  const { t, tx, locale } = useI18n();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [post, setPost] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    portal
      .newsPost(slug)
      .then((result) => !cancelled && setPost(result))
      .catch((cause: { status?: number }) => {
        if (cancelled) return;
        if (cause?.status === 404) setMissing(true);
        else setError(t("common.error"));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug, t]);

  return (
    <main className="wrap page news-page">
      <Link href="/yangiliklar" className="news-back">
        ← {t("news.back")}
      </Link>

      {loading && <Loading rows={3} />}
      {error && <ErrorNote message={error} />}
      {missing && (
        <Empty
          title={t("news.notFound")}
          hint={t("news.notFoundHint")}
          action={
            <Link href="/yangiliklar" className="btn btn-primary">
              {t("news.back")}
            </Link>
          }
        />
      )}

      {post && (
        <article className="news-article">
          {post.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="news-cover news-cover-photo"
              src={post.cover_url}
              alt={tx(post.title_i18n)}
            />
          ) : (
            <div className={`news-cover news-cover-${post.cover_tone}`} aria-hidden="true">
              <span className="news-emblem">{post.cover_emblem}</span>
            </div>
          )}

          <div className="news-meta">
            <span className="badge">{t(newsCategoryKey(post.category))}</span>
            <span className="faint">{timeAgo(post.published_at, locale)}</span>
            {post.reading_minutes && (
              <span className="faint">
                {post.reading_minutes} {t("news.minutes")}
              </span>
            )}
          </div>

          <h1>{tx(post.title_i18n)}</h1>
          <p className="news-lead">{tx(post.summary_i18n)}</p>

          <NewsBody post={post} />
        </article>
      )}
    </main>
  );
}
