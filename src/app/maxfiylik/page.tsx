"use client";

/**
 * The privacy policy page.
 *
 * The document itself lives in content/privacy.ts; everything this file adds is
 * chrome, and all of that chrome goes through i18n. Two things it has to be
 * honest about, and both are visible rather than buried in a comment.
 *
 * The policy exists in Russian only. On a portal whose primary language is
 * Uzbek that is a gap a reader has to be told about, not one to paper over with
 * a machine translation — so when the interface is in any other language the
 * page says which language the text is in and why, and shows the Russian.
 *
 * And the operator's legal name, address, contacts and effective date arrived
 * unfilled. They are rendered as marked blanks: a policy missing the identity of
 * the party accountable for the data should look unfinished until it is.
 */

import Link from "next/link";
import { useI18n } from "@/i18n";
import { POLICY, POLICY_FALLBACK, type Block } from "@/content/privacy";

/** Splits `[бланк]` out of a line so it can be marked, and `**bold**` so the
 *  document's own emphasis survives. Both are the only inline syntax the
 *  content uses, and both matter: one flags an unfilled field, the other is
 *  where the policy disclaims something. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("[") && part.endsWith("]")) {
          return <mark key={i} className="legal-blank">{part}</mark>;
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === "p") return <p key={i}><Rich text={b.text} /></p>;
        if (b.kind === "ul") {
          return (
            <ul key={i}>
              {b.items.map((it, j) => <li key={j}><Rich text={it} /></li>)}
            </ul>
          );
        }
        return (
          <ol key={i}>
            {b.items.map((it, j) => <li key={j}><Rich text={it} /></li>)}
          </ol>
        );
      })}
    </>
  );
}

export default function PrivacyPage() {
  const { t, locale } = useI18n();

  // uz-Cyrl is Uzbek in another script, so it wants the Uzbek text when there
  // is one — there is not yet, so it falls back with everything else.
  const written = locale === "uz-Cyrl" ? "uz" : locale;
  const doc = POLICY[written as "uz" | "ru" | "en"] ?? POLICY[POLICY_FALLBACK]!;
  const translated = POLICY[written as "uz" | "ru" | "en"] !== undefined;

  return (
    <main className="landing">
      <section className="section">
        <div className="wrap legal">
          <nav className="legal-crumbs">
            <Link href="/">{t("legal.home")}</Link>
            <span aria-hidden="true"> / </span>
            <span>{t("legal.privacyTitle")}</span>
          </nav>

          <h1>{t("legal.privacyTitle")}</h1>
          <p className="legal-updated">
            {t("legal.updated")}: <Rich text={doc.updated} />
          </p>

          {!translated && (
            <p className="notice notice-warn legal-notice">{t("legal.ruOnly")}</p>
          )}

          <div className="legal-body">
            <Blocks blocks={doc.lead} />

            {doc.sections.map((s) => (
              <section key={s.n} className="legal-section">
                <h2>
                  <span className="legal-n">{s.n}.</span> {s.title}
                </h2>
                <Blocks blocks={s.blocks} />
                {s.groups?.map((g) => (
                  <div key={g.title} className="legal-group">
                    <h3>{g.title}</h3>
                    <Blocks blocks={g.blocks} />
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
