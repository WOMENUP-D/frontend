"use client";

/**
 * The feed — the screen the portal opens on.
 *
 * One column of posts, read the way a feed is read: who is speaking, the
 * picture, and the caption under it trailing off into "… ещё". Nothing about a
 * post costs a page load until she asks for it — the listing carries summaries
 * only, and the article is fetched the first time a post is opened.
 *
 * It is public on purpose. A visitor reads the same feed she will keep reading
 * once she registers, so the first screen after sign-up is something she
 * recognises rather than an empty cabinet with a 0% profile bar in it.
 *
 * What she is not shown is decided on the server: adult health posts are
 * filtered out for a minor and for a reader whose age is not known, so an
 * age-inappropriate post never reaches this component to be hidden by CSS.
 *
 * Above the feed sits "For you", which is a different kind of thing and is
 * kept visibly separate for that reason. It ranks the same posts by how much
 * they are for this reader — her age bracket and the subjects she ticked — and
 * hides none of them. Everything it puts last is still in the feed below, in
 * its section and in the search, which is why the feed now carries a heading
 * of its own: the two lists answer different questions and she should be able
 * to tell which one she is reading.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/services/api";
import {
  portal,
  type ForYouFeed,
  type NewsPost,
  type PersonalisedNewsPost,
} from "@/services/portal";
import { Empty, ErrorNote, Loading } from "@/components/ui";
import { useI18n } from "@/i18n";
import { newsCategoryKey, newsTopicKey, timeAgo } from "@/utils/format";

/** Section order, not alphabetical: what she came to read comes before what
 *  the portal wants to tell her. Announcements sit last for that reason. */
const SECTIONS = [
  "",
  "health",
  "medicine",
  "science",
  "career",
  "success_story",
  "announcement",
] as const;

const PAGE_SIZE = 12;

/** How much of the caption is shown before "… ещё".
 *
 *  Counted in characters rather than clamped in CSS because the cut has to end
 *  *inside* the line the button sits on — that is what makes it read as one
 *  sentence trailing off, instead of a paragraph with a control under it. */
const CAPTION_LIMIT = 150;

/** Why a card is in the personalised section, as labels rather than numbers.
 *
 *  Section 10 of the brief is explicit that the scoring is not a user-facing
 *  thing — but an unexplained recommendation is not something this portal
 *  ships either, so the reader gets the reason and not the arithmetic. The
 *  server sends i18n keys (`interest:science`, `age`, `important`) because the
 *  feed is read in three languages. */
function Reasons({ reasons }: { reasons: string[] }) {
  const { t } = useI18n();
  if (!reasons.length) return null;

  return (
    <p className="news-why">
      {reasons.map((reason) => {
        const [kind, value] = reason.split(":");
        const label =
          kind === "interest" && value
            ? t(newsTopicKey(value))
            : kind === "age"
              ? t("news.why.age")
              : kind === "important"
                ? t("news.why.important")
                : null;
        return label ? (
          <span key={reason} className="news-why-chip">
            {label}
          </span>
        ) : null;
      })}
    </p>
  );
}

function Post({ post, reasons }: { post: NewsPost; reasons?: string[] }) {
  const { t, tx, locale } = useI18n();

  /* An article opens on its own page rather than unfolding inside the card.
     Expanding in place was fine when the feed was one column; in a grid it
     shoves every neighbour down the page, and the reader loses her place in
     the row she was scanning. The page also gives the article a URL that can
     be sent to somebody, which the panel never had. */
  const href = `/yangiliklar/${post.slug}`;

  const title = tx(post.title_i18n);
  const summary = tx(post.summary_i18n);
  const clipped = summary.length > CAPTION_LIMIT;

  return (
    <article className="news-post">
      {/* Who is speaking and when — the line every feed opens a post with.
          The section stands in for the account name on purpose: naming the
          source here instead would read as the World Health Organization
          posting to this portal, which is not what happened. Its attribution
          belongs in the article, and that is where it is. */}
      <header className="news-post-head">
        <span className={`news-avatar news-cover-${post.cover_tone}`} aria-hidden="true">
          {post.cover_emblem}
        </span>
        <span className="news-author">{t(newsCategoryKey(post.category))}</span>
        <span className="news-dot" aria-hidden="true">·</span>
        <span className="news-time">{timeAgo(post.published_at, locale)}</span>
        {post.is_pinned && <span className="badge badge-gold">{t("news.pinned")}</span>}
      </header>

      {/* The headline is set on the picture, the way a news account posts one,
          and the description goes underneath. That is also what rescues the
          drawn cover: a tint with a glyph on it says nothing, a tint with the
          headline on it is the post.

          A photograph goes behind the same card when the editor has attached
          one — see the note in globals.css for why the fallback is drawn
          rather than fetched. */}
      <div
        className={
          post.cover_url
            ? "news-photo news-photo-shot"
            : `news-photo news-cover-${post.cover_tone}`
        }
      >
        {post.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="news-photo-img" src={post.cover_url} alt="" loading="lazy" />
        )}
        <span className="news-emblem" aria-hidden="true">{post.cover_emblem}</span>
        {/* The headline itself, not a decoration: it is what a screen reader
            should read here, so it is real text rather than an aria-label. */}
        <h2 className="news-headline">{title}</h2>
      </div>

      <div className="news-caption">
        {reasons && <Reasons reasons={reasons} />}
        <p className="news-cap-text">
          {clipped ? `${summary.slice(0, CAPTION_LIMIT).trimEnd()}…` : summary}
          {clipped && (
            <>
              {" "}
              <Link href={href} className="news-inline-more">
                {t("news.moreInline")}
              </Link>
            </>
          )}
        </p>

        <div className="news-actions">
          <Link href={href} className="news-plain">
            {t("news.readMore")}
          </Link>
          {post.reading_minutes && (
            <span className="faint news-readtime">
              {post.reading_minutes} {t("news.minutes")}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function NewsFeedPage() {
  const { t } = useI18n();

  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  // What is actually asked of the server — typing a word should not fire a
  // request per keystroke and make the feed flicker under her hands.
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  // The sections open under the search field rather than sitting above the
  // feed permanently: they are a way of narrowing what she is reading, and a
  // reader who has not asked to narrow anything does not need seven chips
  // between her and the first post.
  const [browsing, setBrowsing] = useState(false);

  const [forYou, setForYou] = useState<ForYouFeed | null>(null);

  useEffect(() => setAuthed(Boolean(getAccessToken())), []);

  // Signed in only. The endpoint answers a visitor too, but the ranking it
  // returns then rests on nothing she told us, and a section called "For you"
  // over that is a promise the data does not keep.
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    portal
      .newsForYou(6)
      .then((result) => !cancelled && setForYou(result))
      .catch(() => !cancelled && setForYou(null));
    return () => {
      cancelled = true;
    };
  }, [authed]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // A new filter is a new feed, not more of the old one.
  useEffect(() => setPage(1), [category, query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    portal
      .news({ category: category || undefined, search: query || undefined, size: PAGE_SIZE, page })
      .then((result) => {
        if (cancelled) return;
        setPosts((prev) => (page === 1 ? result.items : [...prev, ...result.items]));
        setTotal(result.total);
        setError(null);
      })
      .catch(() => !cancelled && setError(t("common.error")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [category, query, page, t]);

  // The chip counts come from the same age filter as the feed, so a chip never
  // promises eleven posts and then opens on nine.
  useEffect(() => {
    portal.newsCounts().then(setCounts).catch(() => undefined);
  }, []);

  // Once she has narrowed the feed the chips have to stay: they are the only
  // thing on screen explaining why she is seeing four posts instead of
  // fourteen, and the only way back to all of them.
  const filtersOpen = browsing || Boolean(category) || Boolean(search);
  const hasMore = posts.length < total;

  return (
    <main className="wrap page news-page">
      <header
        className="news-search"
        // Focus, not click: the panel has to stay open while she tabs from the
        // field onto a chip, and close when focus leaves the group entirely.
        // Blur fires before click, so hiding on blur alone would swallow the
        // very tap it exists to receive.
        onFocus={() => setBrowsing(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setBrowsing(false);
          }
        }}
      >
        <input
          className="input input-lg"
          placeholder={t("news.search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          type="search"
          aria-label={t("news.search")}
        />

        {filtersOpen && (
          <div className="cat-filters news-sections">
            {SECTIONS.map((key) => {
              const count = key ? counts[key] : Object.values(counts).reduce((a, b) => a + b, 0);
              // A section with nothing in it is a chip that opens on an empty
              // screen. Hide it rather than let her find that out by tapping.
              if (key && !count) return null;
              return (
                <button
                  key={key || "all"}
                  onClick={() => setCategory(key)}
                  className={category === key ? "chip chip-on" : "chip"}
                >
                  {key ? t(newsCategoryKey(key)) : t("news.cat.all")}
                  {count ? <span className="chip-count">{count}</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {authed && (
        <section className="news-foryou">
          <header className="news-section-head">
            <div>
              <h2 className="eyebrow">{t("news.forYou")}</h2>
              <p className="faint">{t("news.forYouLead")}</p>
            </div>
            <Link href="/kabinet#lenta" className="btn btn-quiet">
              {t("news.prefs")}
            </Link>
          </header>

          {forYou?.personalised && forYou.items.length > 0 ? (
            forYou.items.map((item: PersonalisedNewsPost) => (
              <Post key={item.id} post={item} reasons={item.reasons} />
            ))
          ) : (
            <p className="faint news-foryou-empty">{t("news.forYouEmpty")}</p>
          )}
        </section>
      )}

      <header className="news-section-head">
        <div>
          <h2 className="eyebrow">{t("news.latest")}</h2>
          <p className="faint">{t("news.latestLead")}</p>
        </div>
      </header>

      <div className="news-feed">
        {error && <ErrorNote message={error} />}

        {!loading && posts.length === 0 && !error && (
          <Empty title={t("news.empty")} hint={t("news.emptyHint")} />
        )}

        {posts.map((post) => (
          <Post key={post.id} post={post} />
        ))}

        {loading && <Loading rows={posts.length ? 1 : 2} />}

        {!loading && hasMore && (
          <button className="btn btn-quiet news-more" onClick={() => setPage((n) => n + 1)}>
            {t("news.more")}
          </button>
        )}

        {/* One invitation at the end of the feed rather than a banner above it:
            she gets to read first and is asked afterwards. Signed in, the
            assessment is already in her navigation and this would be noise. */}
        {!authed && !loading && posts.length > 0 && (
          <aside className="news-invite">
            <span className="eyebrow">{t("news.next")}</span>
            <p>{t("news.nextLead")}</p>
            <Link href="/login" className="btn btn-primary">
              {t("nav.getStarted")}
            </Link>
          </aside>
        )}
      </div>
    </main>
  );
}
