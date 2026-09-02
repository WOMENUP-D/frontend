"use client";

/**
 * The full text of a post: paragraphs, the care note, the source and the tags.
 *
 * Shared, because a post now opens in two places — expanded inside the feed
 * card and on its own page — and the care note under a medical article is not
 * something that may hold in one of them and not the other.
 */

import type { NewsDetail } from "@/services/portal";
import { useI18n } from "@/i18n";

/** Posts whose subject is a body. The note belongs under these and would be
 *  noise under an announcement about a grant deadline. */
const MEDICAL = new Set(["health", "medicine"]);

export function NewsBody({ post }: { post: NewsDetail }) {
  const { t, tx } = useI18n();
  const paragraphs = tx(post.body_i18n).split("\n\n").filter(Boolean);

  return (
    <div className="news-text">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}

      {MEDICAL.has(post.category) && <p className="news-care">{t("news.careNote")}</p>}

      {post.source_name && (
        <footer className="news-source">
          <span className="eyebrow">{t("news.source")}</span>
          <p>{post.source_name}</p>
          {post.source_url && (
            /* rel="noreferrer" on purpose: following a link out of the portal
               must not tell the destination which page she came from. */
            <a
              className="btn btn-quiet btn-sm"
              href={post.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("news.sourceOpen")} ↗
            </a>
          )}
        </footer>
      )}

      {post.tags.length > 0 && (
        <div className="news-tags">
          {post.tags.map((tag) => (
            <span key={tag} className="chip chip-static">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
