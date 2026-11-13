"use client";

/**
 * The privacy policy page.
 *
 * The document itself lives in content/privacy.ts (Russian original) and
 * content/privacy.{uz,en}.ts (translations awaiting legal review); everything
 * this file adds is chrome, and all of that chrome goes through i18n. The
 * Uzbek text is shown in Cyrillic for uz-Cyrl by the same transliteration as
 * the rest of the portal.
 *
 * The effective date and the operator's contacts come from config/site.ts.
 * Unset, they render as marked blanks: the policy's own text refers to them
 * (sections 19 and 20), so hiding them would make the document read as
 * complete when it is not.
 */

import Link from "next/link";
import { formatDate, typeset, useI18n, type MessageKey } from "@/i18n";
import { toCyrillic } from "@/i18n/translit";
import { POLICY, POLICY_UNREVIEWED, type Block } from "@/content/privacy";
import { PRIVACY_POLICY_EFFECTIVE_DATE, SITE_CONTACTS } from "@/config/site";

/** Splits `[бланк]` out of a line so it can be marked, and `**bold**` so the
 *  document's own emphasis survives. Both are the only inline syntax the
 *  content uses, and both matter: one flags an unfilled field, the other is
 *  where the policy disclaims something. */
function Rich({ text: raw }: { text: string }) {
  const { locale } = useI18n();
  // typeset: ʼ is drawn with a glyph the webfont carries (G-12).
  const text = typeset(locale === "uz-Cyrl" ? toCyrillic(raw) : raw);
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

/** Section 20's contact lines, from the one place the facts are kept. */
function Contacts() {
  const { t } = useI18n();
  const rows: Array<[MessageKey, string | null]> = [
    ["legal.c.name", SITE_CONTACTS.legalName],
    ["legal.c.address", SITE_CONTACTS.address],
    ["legal.c.email", SITE_CONTACTS.email],
    ["legal.c.phone", SITE_CONTACTS.phone],
    ["legal.c.site", SITE_CONTACTS.site],
  ];
  return (
    <ul>
      {rows.map(([label, value]) => (
        <li key={label}>
          {t(label)}:{" "}
          {value ? <span>{value}</span> : <mark className="legal-blank">{t("legal.unset")}</mark>}
        </li>
      ))}
    </ul>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === "contacts") return <Contacts key={i} />;
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
  const { t, locale, setLocale } = useI18n();

  // uz-Cyrl is Uzbek in another script: it reads the Uzbek text, transliterated.
  const written = locale === "uz-Cyrl" ? "uz" : locale;
  const doc = POLICY[written];
  const unreviewed = POLICY_UNREVIEWED.has(written);

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
            {t("legal.updated")}:{" "}
            {PRIVACY_POLICY_EFFECTIVE_DATE ? (
              <time dateTime={PRIVACY_POLICY_EFFECTIVE_DATE}>
                {formatDate(locale, `${PRIVACY_POLICY_EFFECTIVE_DATE}T00:00:00`)}
              </time>
            ) : (
              <mark className="legal-blank">{t("legal.unset")}</mark>
            )}
          </p>

          {unreviewed && (
            <p className="notice notice-warn legal-notice">
              {t("legal.translationNote")}{" "}
              <button type="button" className="link-btn" onClick={() => setLocale("ru")}>
                {t("legal.readOriginal")}
              </button>
            </p>
          )}

          <div className="legal-body">
            <Blocks blocks={doc.lead} />

            {doc.sections.map((s) => (
              <section key={s.n} className="legal-section">
                <h2>
                  <span className="legal-n">{s.n}.</span> <Rich text={s.title} />
                </h2>
                <Blocks blocks={s.blocks} />
                {s.groups?.map((g) => (
                  <div key={g.title} className="legal-group">
                    <h3><Rich text={g.title} /></h3>
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
