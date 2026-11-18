"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { Brand } from "@/components/Nav";
import { SITE_CONTACTS } from "@/config/site";
import { Sky } from "@/components/Sky";
import { Sakura } from "@/components/Sakura";
import { PromoSlot } from "@/components/PromoSlot";
import { AccountLink, ViewerCta } from "@/components/auth/ViewerCta";
import { AiTeaser, PathCards, Roadmap } from "./Landing";
import { OpportunityShowcase } from "./Showcase";

export default function LandingPage() {
  const { t, tx } = useI18n();

  return (
    <main className="landing">
      {/* Pinned to the viewport rather than to the hero, so it stays behind the
          page as it scrolls instead of sliding away with the first screen. */}
      <Sakura />
      {/* Sky — a crescent after dark, the sun by day. Fixed beside the branch
          on the background layer, so it stays behind every section of the page
          rather than belonging to the hero. */}
      <Sky />
      {/* The bottom-left counterweight is the canopy itself, turned through
          180° and pinned to the opposite corner. It was a second, hand-authored
          branch before; no amount of tuning made it read as the same plant,
          because it was not one. Reusing the drawing settles that by
          construction — same wood, same taper, same blossom. */}
      <Sakura variant="corner" />

      {/* Headline left; the right half is left to the sakura */}
      <section className="ed-hero">
        <div className="wrap ed-hero-grid">
          <div>
            <span className="pill-note">{t("landing.badge")}</span>
            {/* The half of the line the promise lives in is picked out in
                blossom after dark; on paper it stays ink, because a pale pink
                on cream is a weaker headline rather than a warmer one. */}
            <h1>
              {t("landing.title1")} <span className="hl">{t("landing.title2")}</span>
            </h1>
            <p className="lead">{t("landing.lead")}</p>
            <div className="hero-actions">
              {/* Worded for who is looking: a visitor, a woman without a
                  score, with one, with a plan (C-05). */}
              <ViewerCta className="btn btn-primary" />
              <Link href="/dasturlar" className="btn btn-ghost">
                {t("landing.ctaAlt")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What the portal is, in the order a visitor meets it: who helps her,
          which way she can go, what the route looks like, what she can start
          today, and what it leads to. */}
      {/* Partner promotions, directly under the hero — the position a reader
          expects one and the only one that does not cut a section in half. */}
      <section className="section section-promo">
        <div className="wrap">
          <PromoSlot slot="home-top" />
        </div>
      </section>

      <AiTeaser />
      <PathCards />
      <Roadmap />
      <section className="section section-promo">
        <div className="wrap">
          <PromoSlot slot="home-mid" />
        </div>
      </section>
      <OpportunityShowcase />
      {/* No <Pricing /> here yet. The tiers are designed and the section is
          ready in ./Landing, but a paid plan on a national programme portal is
          a decision that has to be made off the page first — and there is no
          billing behind either button. Mounting it is one import and one line. */}

      <footer className="site-footer">
        <div className="wrap stack" style={{ gap: 34 }}>
          <div className="footer-grid">
            <div className="footer-col">
              <Brand />
              <span className="footer-line">{t("brand.tagline")}</span>
            </div>

            <div className="footer-col">
              <span>{t("foot.portal")}</span>
              <Link href="/dasturlar">{t("nav.programs")}</Link>
              <Link href="/imkoniyatlar">{t("nav.opportunities")}</Link>
              <Link href="/yordamchi">{t("asst.nav")}</Link>
              <AccountLink />
            </div>

            <div className="footer-col">
              <span>{t("foot.legal")}</span>
              <Link href="/maxfiylik">{t("legal.privacyTitle")}</Link>
            </div>

            <div className="footer-col">
              <span>{t("foot.contacts")}</span>
              {/* Contacts are business facts kept in config/site.ts (G-24);
                  an unset one is hidden rather than printed as a template. */}
              {SITE_CONTACTS.phone && (
                <a className="footer-line" href={`tel:${SITE_CONTACTS.phone.replace(/[^+\d]/g, "")}`}>
                  {SITE_CONTACTS.phone}
                </a>
              )}
              {SITE_CONTACTS.email && <a href={`mailto:${SITE_CONTACTS.email}`}>{SITE_CONTACTS.email}</a>}
            </div>

            {(SITE_CONTACTS.office || SITE_CONTACTS.address || SITE_CONTACTS.social.length > 0) && (
              <div className="footer-col">
                {(SITE_CONTACTS.office || SITE_CONTACTS.address) && (
                  <>
                    <span>{t("foot.addressLabel")}</span>
                    <span className="footer-line">
                      {SITE_CONTACTS.office ? tx(SITE_CONTACTS.office) : SITE_CONTACTS.address}
                    </span>
                  </>
                )}
                {SITE_CONTACTS.social.length > 0 && (
                  /* Icons, not words: the two marks are known on sight. Each
                     keeps its name for a screen reader and as a tooltip. */
                  <div className="footer-social" aria-label={t("foot.socialLabel")}>
                    {SITE_CONTACTS.social.map((item) => (
                      <a
                        key={item.url}
                        className="footer-social-link"
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={item.label}
                        title={item.label}
                      >
                        <SocialIcon name={item.label} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="footer-base">
            <span>{t("landing.footer")}</span>
            <span>{t("foot.org")}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

/** Telegram's plane and Instagram's camera, drawn in the footer's own ink. */
function SocialIcon({ name }: { name: string }) {
  const key = name.toLowerCase();
  if (key.includes("telegram")) {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M21.4 3.6 2.9 10.8c-1.1.4-1.1 1.6 0 1.9l4.6 1.4 1.8 5.6c.3.8 1.2 1 1.8.4l2.6-2.4 4.8 3.5c.8.6 1.9.1 2.1-.8l3.1-15.1c.3-1.2-.9-2.1-2.3-1.5ZM9.6 14.1l8.3-7.3-6.6 8.6-.3 3-1.4-4.3Z"
        />
      </svg>
    );
  }
  if (key.includes("instagram")) {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="var(--footer-social-bg, #fff)" strokeWidth="2" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="var(--footer-social-bg, #fff)" />
      </svg>
    );
  }
  return <span aria-hidden="true">{name.slice(0, 1)}</span>;
}
