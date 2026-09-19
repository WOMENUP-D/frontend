"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getAccessToken, getRoles, isStaff, ORG_ROLES, PANEL_ROLES } from "@/services/api";
import { logout } from "@/services/auth";
import { useI18n, type MessageKey } from "@/i18n";
import { LangSwitch } from "./LangSwitch";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

/** `guest: true` marks what a visitor sees before signing in.
 *
 *  Her cabinet, her diagnostic, her plan and the management panel are personal
 *  or staff-only: offering them to someone with no account advertises doors she
 *  cannot open. What is left — the catalogue, the opportunities and the
 *  assistant — is what the portal actually shows a newcomer. */
/** All a staff account needs: the screen it signed in for — the panel for
 *  administrators, coordinators and moderators, the organisation workspace for
 *  an organisation's people. An account with both roles sees both. */
const STAFF_LINKS: ReadonlyArray<{
  href: string;
  key: MessageKey;
  roles: readonly string[];
  guest?: boolean;
}> = [
  { href: "/admin", key: "nav.admin", roles: PANEL_ROLES },
  { href: "/hamkor", key: "nav.org", roles: ORG_ROLES },
];

/** Order is the argument this list makes about where a visit starts.
 *
 *  The feed comes first and the cabinet last. Landing straight in her own
 *  cabinet meant the portal opened on a form she had not filled in yet — a
 *  0% profile bar and a list of things she had not done. The feed opens on
 *  something worth reading instead, and the cabinet is where she goes when
 *  she wants her own numbers, which is a deliberate act rather than a
 *  doorstep.
 *
 *  The feed, the cabinet, the diagnostic and the plan carry no `guest` flag:
 *  they are hers, and offering them to someone with no account advertises
 *  doors she cannot open. What a visitor gets is the catalogue, the
 *  opportunities and the assistant — what the portal can show her before she
 *  has an account. */
const LINKS: ReadonlyArray<{ href: string; key: MessageKey; guest?: boolean }> = [
  { href: "/yangiliklar", key: "nav.news" },
  { href: "/reja", key: "nav.plan" },
  { href: "/dasturlar", key: "nav.programs", guest: true },
  // Next to the catalogue on purpose: the catalogue is what she can enrol in,
  // this is where she actually studies. It is hers, so no `guest` flag.
  { href: "/talim", key: "nav.learning" },
  // Between learning and the listings, because that is what it joins: what
  // she learns, and the work it can lead to. Open to a visitor — where the
  // platform can lead is the first thing a newcomer wants to know.
  { href: "/kasb", key: "nav.career", guest: true },
  { href: "/imkoniyatlar", key: "nav.opportunities", guest: true },
  // Beside the listings: an event is something she attends, not something she
  // applies to, but it is found the same way. Open to a visitor.
  { href: "/tadbirlar", key: "nav.events", guest: true },
  { href: "/yordamchi", key: "asst.nav", guest: true },
  { href: "/kabinet", key: "nav.cabinet" },
  // No management link here. It used to sit in this list unguarded, so every
  // woman who signed in was shown a panel she has no rights to — and clicking
  // it landed her on a dashboard of zeros and a load error. Staff reach it
  // through STAFF_LINKS above.
];

/** The mark is the blossom off the branch, drawn solid in ink, beside the name
 *  in the display serif. The old plum tile belonged to the old palette: on
 *  paper the mark is the same ink as the headline it sits above. */
const LOGO_PETAL =
  "M0 -2 C -7.4 -6.8, -9.6 -15.8, -5.6 -21.8 C -3.6 -20.2, -1.8 -20.6, 0 -18.8 " +
  "C 1.8 -20.6, 3.6 -20.2, 5.6 -21.8 C 9.6 -15.8, 7.4 -6.8, 0 -2 Z";

export function Brand() {
  return (
    <div className="brand">
      <span className="logo-mark" aria-hidden="true">
        <svg width="26" height="26" viewBox="-26 -26 52 52" fill="currentColor">
          {[0, 72, 144, 216, 288].map((angle) => (
            <path key={angle} d={LOGO_PETAL} transform={`rotate(${angle})`} />
          ))}
        </svg>
      </span>
      <span className="logo-text">WomanUP</span>
    </div>
  );
}

/** A detail page belongs to its section: opening an article or a course card
 *  must not un-highlight the pill she arrived through. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [authed, setAuthed] = useState(false);
  const [staff, setStaff] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const pills = useRef<HTMLDivElement>(null);

  // Token lives in localStorage, so this can only run after mount.
  useEffect(() => {
    const token = Boolean(getAccessToken());
    setAuthed(token);
    // A coordinator has no cabinet, no diagnostic and no plan of her own, so
    // the learner navigation is dead weight in her header — it was showing her
    // six links she has no reason to open.
    setStaff(Boolean(token) && isStaff());
    setRoles(token ? getRoles() : []);
  }, [pathname]);

  /* On a phone the pills are a sideways strip, and the one for the page she
     is on could sit out of sight — so she could not see where she was. Bring
     it into view, inside the strip only: the page itself does not move. */
  useEffect(() => {
    const strip = pills.current;
    const active = strip?.querySelector<HTMLElement>(".nav-link.active");
    if (!strip || !active) return;
    const box = active.getBoundingClientRect();
    const frame = strip.getBoundingClientRect();
    strip.scrollLeft += box.left - frame.left - (frame.width - box.width) / 2;
  }, [pathname, authed, staff]);

  function signOut() {
    // One sign-out path: it drops the tokens and anything a provider left
    // behind, so nothing survives into the next person's session.
    logout();
    setAuthed(false);
    setStaff(false);
    router.push(staff ? "/admin/login" : "/");
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        {/* Named for a screen reader: on a phone the wordmark is hidden and
            the blossom alone is decoration. */}
        <Link href="/" aria-label="WomanUP">
          <Brand />
        </Link>

        <div className="nav-links" ref={pills}>
          <div className="nav-pills">
            {(staff
              ? STAFF_LINKS.filter((link) => link.roles.some((role) => roles.includes(role)))
              : LINKS.filter((link) => authed || link.guest)
            ).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive(pathname, link.href) ? "active" : ""}`}
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
              >
                {t(link.key)}
              </Link>
            ))}
          </div>
        </div>

        <div className="header-tools">
          <LangSwitch />
          <ThemeToggle />
          {authed && !staff && <NotificationBell />}
          {authed ? (
            <button className="nav-plain" onClick={signOut}>
              {t("nav.signOut")}
            </button>
          ) : (
            /* One door, not two. Both of these went to /login, which already
               offers signing in and opening an account side by side — so the
               header was asking her to choose between two words for the same
               screen before she had any reason to care about the difference. */
            <Link href="/login" className="btn btn-contrast btn-sm btn-pill">
              {t("nav.getStarted")}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
