"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAccessToken,
  getRoles,
  isStaff,
  onTokenChange,
  ORG_ROLES,
  PANEL_ROLES,
} from "@/services/api";
import { useVacancyBoardShown } from "@/services/vacancyBoard";
import { logout } from "@/services/auth";
import { LOCALES, useI18n, type MessageKey } from "@/i18n";
import { LangSwitch } from "./LangSwitch";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { activeChild, isActive, sectionItems, useSectionMenu, type Shown } from "./sectionMenu";

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

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [authed, setAuthed] = useState(false);
  /* Phones (≤ 600 px): the destinations, the language and "Sign out" fold
     into one menu instead of a sideways strip where half the sections sat
     out of sight behind a fade (QA F-02). The header is then a single row. */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuPanel = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback((refocus: boolean) => {
    setMenuOpen(false);
    if (refocus) requestAnimationFrame(() => menuButton.current?.focus());
  }, []);
  const [staff, setStaff] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const pills = useRef<HTMLDivElement>(null);
  // QA B-19: no menu item for a job board the server has not connected.
  const vacanciesShown = useVacancyBoardShown();

  // The token lives in memory, so this can only run after mount — and it is
  // re-read whenever the token changes, so a session that dies in the
  // background stops showing "Sign out" (C-25).
  useEffect(() => {
    const read = () => {
      const token = Boolean(getAccessToken());
      setAuthed(token);
      // A coordinator has no cabinet, no diagnostic and no plan of her own, so
      // the learner navigation is dead weight in her header — it was showing
      // her six links she has no reason to open.
      setStaff(Boolean(token) && isStaff());
      setRoles(token ? getRoles() : []);
    };
    setMenuOpen(false);
    read();
    return onTokenChange(read);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu(true);
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (menuPanel.current?.contains(target) || menuButton.current?.contains(target)) return;
      closeMenu(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen, closeMenu]);

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

  const items: Shown[] = staff
    ? STAFF_LINKS.filter((link) => link.roles.some((role) => roles.includes(role))).map((link) => ({
        kind: "link" as const,
        href: link.href,
        key: link.key,
      }))
    : sectionItems(authed, vacanciesShown);

  const menu = useSectionMenu(items);

  const [leaving, setLeaving] = useState(false);
  async function signOut() {
    // One sign-out path: it drops the tokens and anything a provider left
    // behind, so nothing survives into the next person's session. Awaited, so
    // the server has revoked the session before the next page can ask for one.
    setLeaving(true);
    const toPanelDoor = staff;
    try {
      await logout();
    } finally {
      setLeaving(false);
      setAuthed(false);
      setStaff(false);
      router.push(toPanelDoor ? "/admin/login" : "/");
    }
  }

  // The sign-in page is where "Get started" leads; on it, the button went
  // nowhere (C-23).
  const onAuthPage = pathname === "/login" || pathname.startsWith("/parol-tiklash");

  return (
    <nav
      className="nav"
      onPointerLeave={menu.onLeave}
    >
      <div className="nav-inner">
        {/* Named for a screen reader: on a phone the wordmark is hidden and
            the blossom alone is decoration. */}
        <Link href="/" aria-label="WomanUP" className="nav-home">
          <Brand />
        </Link>

        <div className="nav-links" ref={pills}>
          {menu.pills}
        </div>

        <div className="header-tools">
          <span className="nav-wide-only"><LangSwitch /></span>
          <ThemeToggle />
          {authed && !staff && <NotificationBell />}
          {authed ? (
            <button className="nav-plain nav-wide-only" onClick={() => void signOut()} disabled={leaving}>
              {t("nav.signOut")}
            </button>
          ) : onAuthPage ? null : (
            /* One door, not two. Both of these went to /login, which already
               offers signing in and opening an account side by side — so the
               header was asking her to choose between two words for the same
               screen before she had any reason to care about the difference. */
            <Link href="/login?mode=signup" className="btn btn-contrast btn-sm btn-pill">
              {t("nav.getStarted")}
            </Link>
          )}
          <button
            ref={menuButton}
            type="button"
            className="nav-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="nav-menu"
            aria-label={t(menuOpen ? "lms.nav.close" : "lms.nav.open")}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span aria-hidden="true" className="nav-menu-ico">{menuOpen ? "✕" : "☰"}</span>
            {/* The language is in the menu on a phone, so its code is on the
                button: a visitor who does not read Uzbek sees where to go. */}
            <span aria-hidden="true" className="nav-menu-lang">
              {LOCALES.find((item) => item.code === locale)?.short}
            </span>
          </button>
        </div>
      </div>

      {menu.panel}

      <div id="nav-menu" ref={menuPanel} className="nav-menu" hidden={!menuOpen}>
        <div className="nav-menu-links">
          {items.map((item) =>
            item.kind === "link" ? (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-menu-link ${(item.href === "/" ? pathname === "/" : isActive(pathname, item.href)) ? "active" : ""}`}
                aria-current={(item.href === "/" ? pathname === "/" : isActive(pathname, item.href)) ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {t(item.key)}
              </Link>
            ) : (
              <div key={item.id} className="nav-menu-group" role="group" aria-label={t(item.key)}>
                <span className="nav-menu-head" aria-hidden="true">{t(item.key)}</span>
                {item.children.map((child) => {
                  const on = activeChild(pathname, item.children) === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`nav-menu-link ${on ? "active" : ""}`}
                      aria-current={on ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      {t(child.key)}
                    </Link>
                  );
                })}
              </div>
            ),
          )}
        </div>
        <div className="nav-menu-foot">
          <LangSwitch />
          {authed && (
            <button type="button" className="nav-plain" onClick={() => void signOut()} disabled={leaving}>
              {t("nav.signOut")}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
