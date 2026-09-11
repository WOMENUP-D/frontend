"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { Brand } from "@/components/Nav";
import { Sky } from "@/components/Sky";
import { Sakura } from "@/components/Sakura";
import { PromoSlot } from "@/components/PromoSlot";
import { TryQuestion } from "@/components/TryQuestion";
import { AiTeaser, ClosingCall, PathCards, Roadmap, Wellbeing } from "./Landing";
import { CareerProgress, OpportunityShowcase, ProgramShowcase } from "./Showcase";

export default function LandingPage() {
  const { t } = useI18n();

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
              <Link href="/login" className="btn btn-primary">
                {t("landing.cta")}
              </Link>
              <Link href="/dasturlar" className="btn btn-ghost">
                {t("landing.ctaAlt")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What the portal is, in the order a visitor meets it: who helps her,
          which way she can go, what the route looks like, what she can start
          today, what progress will feel like, and what it leads to. */}
      {/* Partner promotions, directly under the hero — the position a reader
          expects one and the only one that does not cut a section in half. */}
      <section className="section section-promo">
        <div className="wrap">
          <PromoSlot slot="home-top" />
        </div>
      </section>

      <AiTeaser />
      <PathCards />
      <TryQuestion />
      <Roadmap />
      <ProgramShowcase />
      <CareerProgress />
      <section className="section section-promo">
        <div className="wrap">
          <PromoSlot slot="home-mid" />
        </div>
      </section>
      <Wellbeing />
      <OpportunityShowcase />
      {/* No <Pricing /> here yet. The tiers are designed and the section is
          ready in ./Landing, but a paid plan on a national programme portal is
          a decision that has to be made off the page first — and there is no
          billing behind either button. Mounting it is one import and one line. */}
      <ClosingCall />

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
              <Link href="/login">{t("nav.signIn")}</Link>
            </div>

            <div className="footer-col">
              <span>{t("foot.legal")}</span>
              <Link href="/maxfiylik">{t("legal.privacyTitle")}</Link>
            </div>

            <div className="footer-col">
              <span>{t("foot.contacts")}</span>
              <span className="footer-line">{t("foot.phone")}</span>
              <a href={`mailto:${t("foot.email")}`}>{t("foot.email")}</a>
            </div>

            <div className="footer-col">
              <span>{t("foot.addressLabel")}</span>
              <span className="footer-line">{t("foot.address")}</span>
              <span className="footer-line">
                {t("foot.socialLabel")}: {t("foot.soon")}
              </span>
            </div>
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
