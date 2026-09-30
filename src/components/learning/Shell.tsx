"use client";

/**
 * The learning section's app shell: a fixed rail, a sticky top bar, and the
 * page underneath.
 *
 * Why a rail here when the rest of the portal uses a floating top nav: this is
 * a place you work in for an hour, moving between a course, a lesson and your
 * own record. A persistent list of destinations is what that needs; the top nav
 * is right for pages you read and leave. The two shells are deliberately
 * different furniture on the same brand.
 *
 * The search, the notifications and her name are all read from the API. The
 * crumbs stop at the section rather than naming the course: the course page
 * already fetched that course, and fetching it a second time to print its name
 * in a breadcrumb is a request a woman on a regional connection pays for twice.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import { getAccessToken } from "@/services/api";
import { portal, type Notification, type Program } from "@/services/portal";
import { Icon } from "@/components/ds";

interface NavItem {
  href: string;
  label: MessageKey;
  icon: string;
}

/* Every destination here is backed by her own records. The calendar, the diary
   and the goals screens are not: they still read the design-time fixtures they
   were built against, and a rail entry is a promise that what is behind it is
   true. Their code, their routes and their translations are all untouched — the
   pages still answer at their URLs — they are simply not advertised until each
   has a backend. Putting them back is one line each. */
const MAIN: NavItem[] = [
  { href: "/talim", label: "lms.nav.dashboard", icon: "◉" },
  { href: "/talim/kurslar", label: "lms.nav.courses", icon: "▤" },
  { href: "/talim/yollar", label: "lms.nav.paths", icon: "⌁" },
  { href: "/talim/amaliyot", label: "lms.nav.practice", icon: "✎" },
  { href: "/talim/yutuqlar", label: "lms.nav.achievements", icon: "✦" },
  // The portal's AI Coach, which answers from her records — not a second,
  // learning-only assistant.
  { href: "/yordamchi", label: "lms.nav.assistant", icon: "◈" },
];

/* Settings and Help point at the portal pages that genuinely own those jobs —
   the cabinet holds the account, the portal assistant answers questions. A
   link to a page that does not exist is worse than no link. */
const SECONDARY: NavItem[] = [
  { href: "/kabinet", label: "lms.nav.settings", icon: "⚙" },
  { href: "/yordamchi", label: "lms.nav.help", icon: "?" },
];

/* Crumbs still name the unadvertised sections: a woman who has one of those
   URLs open should read where she is, not a blank. */
const SECTION_LABEL: Record<string, MessageKey> = {
  kurslar: "lms.nav.courses",
  yollar: "lms.nav.paths",
  amaliyot: "lms.nav.practice",
  kalendar: "lms.nav.calendar",
  kundalik: "lms.nav.diary",
  maqsadlar: "lms.nav.goals",
  yutuqlar: "lms.nav.achievements",
  yordamchi: "lms.nav.assistant",
  profil: "lms.nav.profile",
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/talim") return pathname === "/talim";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Her name and initials, for the rail and the avatar. Read once per mount. */
function useLearner(): { name: string; initials: string } {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!getAccessToken()) return;
    portal
      .profile()
      .then((profile) => setName((profile as { full_name: string | null }).full_name ?? ""))
      .catch(() => setName(""));
  }, []);

  const initials =
    name
      .split(/[\s@._-]+/)
      .filter((part) => part && /\p{L}/u.test(part))
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "•";

  return { name, initials };
}

/* ---- search ---------------------------------------------------------- */

/** Courses, by whatever she types — the same search the catalogue runs, so one
 *  query language covers the whole portal. Debounced, because a request per
 *  keystroke is a request per keystroke. */
function Search() {
  const { t, tx } = useI18n();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Program[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function away(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      setHits([]);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      portal
        .programs(`?search=${encodeURIComponent(needle)}&size=8`)
        .then((page) => {
          if (live) setHits(page.items);
        })
        .catch(() => {
          if (live) setHits([]);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="lms-search" ref={box}>
      <span className="lms-search-ico" aria-hidden="true">⌕</span>
      <input
        type="search"
        value={query}
        placeholder={t("lms.search")}
        aria-label={t("lms.search")}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && query.trim().length >= 2 && (
        <div className="lms-results">
          {hits.length === 0 ? (
            <div style={{ padding: "14px 12px" }}>
              <strong style={{ display: "block", fontSize: "0.9rem" }}>
                {t("lms.search.empty")}
              </strong>
              <span style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
                {t("lms.search.emptyHint")}
              </span>
            </div>
          ) : (
            <div>
              <div className="lms-results-group">{t("lms.search.courses")}</div>
              {hits.map((program) => (
                <Link
                  key={program.id}
                  className="lms-result"
                  href={`/talim/kurslar/${program.slug}`}
                  onClick={() => { setOpen(false); setQuery(""); }}
                >
                  <span style={{ minWidth: 0 }}>
                    <strong>{tx(program.title_i18n)}</strong>
                    <br />
                    <span>{program.provider ?? tx(program.goal_i18n)}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- notifications ---------------------------------------------------- */

/** Her real notifications — the ones the worker sends about deadlines, skill
 *  gaps and inactivity. An empty tray says so rather than showing samples. */
function Notifications() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const unread = items.some((item) => item.read_at === null);

  useEffect(() => {
    if (!getAccessToken()) return;
    portal.notifications().then(setItems).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    function away(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
    await portal.markNotificationsRead().catch(() => {
      /* The badge going quiet is cosmetic; the next load reads the truth. */
    });
  }

  return (
    <div style={{ position: "relative" }} ref={box}>
      <button
        type="button"
        className="lms-icon-btn"
        aria-label={t("lms.notifications")}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {/* A bell, the sign everyone reads as "notifications" — not a glyph
            nobody would recognise. */}
        <Icon name="bell" />
        {unread && <span className="lms-dot" />}
      </button>

      {open && (
        <div className="lms-tray">
          {items.length === 0 ? (
            <div style={{ padding: 14, fontSize: "0.88rem", color: "var(--text-faint)" }}>
              {t("lms.notifications.empty")}
            </div>
          ) : (
            <>
              {items.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className={`lms-note ${item.read_at === null ? "lms-note-unread" : ""}`}
                >
                  <span className="lms-note-title">{item.title}</span>
                  <span className="lms-note-body">{item.body}</span>
                </div>
              ))}
              {unread && (
                <button
                  type="button"
                  className="lms-btn lms-btn-quiet lms-btn-sm"
                  style={{ width: "100%", marginTop: 6 }}
                  onClick={() => void markAllRead()}
                >
                  {t("lms.notifications.all")}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- the shell --------------------------------------------------------- */

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname() ?? "/talim";
  const [open, setOpen] = useState(false);
  const learner = useLearner();

  /* The trail, as far as the shell can know it without a second request: the
     section, not the course. The page below carries the course's own name as
     its heading. */
  const crumbs = useMemo<{ href?: string; label: string }[]>(() => {
    const [, section] = pathname.split("/").filter(Boolean);
    const root = { href: section ? "/talim" : undefined, label: t("lms.nav.dashboard") };
    const key = section ? SECTION_LABEL[section] : undefined;
    return key ? [root, { label: t(key) }] : [root];
  }, [pathname, t]);

  // The drawer is a route-level thing: leaving the page should close it.
  useEffect(() => { setOpen(false); }, [pathname]);

  /* Marks the body while this section is mounted, so the ambient sakura can be
     turned down here without being removed. The branch is drawn on the page
     itself, and in the rest of the portal it only ever sits behind cards; here
     headings, a lesson's prose and the course contents sit directly on the
     page, and a dark limb crossing them costs real legibility. */
  useEffect(() => {
    document.body.dataset.section = "learning";
    return () => { delete document.body.dataset.section; };
  }, []);

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);

  function renderNav(items: NavItem[]) {
    return items.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className="lms-nav-link"
        aria-current={isActive(pathname, item.href) ? "page" : undefined}
      >
        <span className="lms-nav-ico" aria-hidden="true">{item.icon}</span>
        {t(item.label)}
      </Link>
    ));
  }

  return (
    <div className={`lms ${open ? "lms-open" : ""}`}>
      {open && (
        <button
          type="button"
          className="lms-scrim"
          aria-label={t("lms.nav.close")}
          onClick={() => setOpen(false)}
        />
      )}

      <aside className="lms-side">
        <Link href="/talim" className="lms-brand">
          <span className="lms-brand-mark" aria-hidden="true">✿</span>
          <span className="lms-brand-text">WomanUP</span>
        </Link>
        <span className="lms-brand-sub">{t("lms.section")}</span>

        <nav className="lms-nav" aria-label={t("lms.section")}>
          <div className="lms-nav-group">{renderNav(MAIN)}</div>
          <div className="lms-nav-group">
            {renderNav(SECONDARY)}
            <Link href="/" className="lms-nav-link">
              <span className="lms-nav-ico" aria-hidden="true">←</span>
              {t("lms.nav.toPortal")}
            </Link>
          </div>
        </nav>

        <div className="lms-side-spacer" />

        <Link href="/talim/profil" className="lms-side-foot">
          <span className="lms-avatar" aria-hidden="true">{learner.initials}</span>
          <span style={{ minWidth: 0 }}>
            <span className="lms-side-name">{learner.name || t("cab.user")}</span>
            <br />
            <span className="lms-side-role">{t("lms.nav.profile")}</span>
          </span>
        </Link>
      </aside>

      <div className="lms-main">
        <header className="lms-top">
          <button
            type="button"
            className="lms-icon-btn lms-burger"
            aria-label={open ? t("lms.nav.close") : t("lms.nav.open")}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <span aria-hidden="true">☰</span>
          </button>

          <nav className="lms-crumbs" aria-label={t("lms.section")}>
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} style={{ display: "contents" }}>
                {index > 0 && <span className="lms-crumbs-sep" aria-hidden="true">/</span>}
                {crumb.href
                  ? <Link href={crumb.href}>{crumb.label}</Link>
                  : <strong>{crumb.label}</strong>}
              </span>
            ))}
          </nav>

          <div className="lms-top-tools">
            <Search />
            <Notifications />
            <Link href="/talim/profil" aria-label={t("lms.nav.profile")}>
              <span className="lms-avatar" aria-hidden="true">{learner.initials}</span>
            </Link>
          </div>
        </header>

        <main className="lms-body">{children}</main>
      </div>
    </div>
  );
}
