"use client";

/**
 * The learning section's app shell: a fixed rail, a sticky top bar, and the
 * page underneath.
 *
 * Why a rail here when the rest of the portal uses a floating top nav: this is
 * a place you work in for an hour, moving between a course, a lesson and the
 * calendar. A persistent list of destinations is what that needs; the top nav
 * is right for pages you read and leave. The two shells are deliberately
 * different furniture on the same brand.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n, type MessageKey } from "@/i18n";
import {
  courses,
  courseLessons,
  learner,
  notifications,
  findCourse,
} from "@/content/learning";

interface NavItem {
  href: string;
  label: MessageKey;
  icon: string;
}

const MAIN: NavItem[] = [
  { href: "/talim", label: "lms.nav.dashboard", icon: "◉" },
  { href: "/talim/kurslar", label: "lms.nav.courses", icon: "▤" },
  { href: "/talim/kalendar", label: "lms.nav.calendar", icon: "▦" },
  { href: "/talim/maqsadlar", label: "lms.nav.goals", icon: "◎" },
  { href: "/talim/yutuqlar", label: "lms.nav.achievements", icon: "✦" },
  { href: "/talim/yordamchi", label: "lms.nav.assistant", icon: "◈" },
];

/* Settings and Help point at the portal pages that genuinely own those jobs —
   the cabinet holds the account, the portal assistant answers questions. A
   link to a page that does not exist is worse than no link. */
const SECONDARY: NavItem[] = [
  { href: "/kabinet", label: "lms.nav.settings", icon: "⚙" },
  { href: "/yordamchi", label: "lms.nav.help", icon: "?" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/talim") return pathname === "/talim";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The trail for the top bar, resolved from the route and the dataset so a
 *  course or lesson shows its own name rather than a slug. */
function useCrumbs(pathname: string): { href?: string; label: string }[] {
  const { t, tx } = useI18n();

  return useMemo(() => {
    const segments = pathname.split("/").filter(Boolean); // ["talim", ...]
    const root = { href: "/talim", label: t("lms.nav.dashboard") };
    if (segments.length <= 1) return [{ label: root.label }];

    const [, section, courseSlug, lessonSlug] = segments;

    if (section === "kurslar") {
      const trail: { href?: string; label: string }[] = [
        root,
        { href: courseSlug ? "/talim/kurslar" : undefined, label: t("lms.nav.courses") },
      ];
      if (!courseSlug) return trail;

      const course = findCourse(courseSlug);
      const courseLabel = course ? tx(course.title) : courseSlug;
      trail.push({
        href: lessonSlug ? `/talim/kurslar/${courseSlug}` : undefined,
        label: courseLabel,
      });

      if (lessonSlug && course) {
        const lesson = courseLessons(course).find((item) => item.slug === lessonSlug);
        trail.push({ label: lesson ? tx(lesson.title) : lessonSlug });
      }
      return trail;
    }

    const map: Record<string, MessageKey> = {
      kalendar: "lms.nav.calendar",
      maqsadlar: "lms.nav.goals",
      yutuqlar: "lms.nav.achievements",
      yordamchi: "lms.nav.assistant",
      profil: "lms.nav.profile",
    };
    const key = map[section];
    return [root, { label: key ? t(key) : section }];
  }, [pathname, t, tx]);
}

/* ---- search ---------------------------------------------------------- */

interface Hit { href: string; title: string; meta: string; group: MessageKey }

function useSearch(query: string): Hit[] {
  const { tx } = useI18n();

  return useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];

    const hits: Hit[] = [];
    for (const course of courses) {
      const title = tx(course.title);
      if (title.toLowerCase().includes(needle)) {
        hits.push({
          href: `/talim/kurslar/${course.slug}`,
          title,
          meta: tx(course.instructor),
          group: "lms.search.courses",
        });
      }
      if (tx(course.instructor).toLowerCase().includes(needle)) {
        hits.push({
          href: `/talim/kurslar/${course.slug}`,
          title: tx(course.instructor),
          meta: tx(course.instructorRole),
          group: "lms.search.instructors",
        });
      }
      for (const lesson of courseLessons(course)) {
        const name = tx(lesson.title);
        if (name.toLowerCase().includes(needle)) {
          hits.push({
            href: `/talim/kurslar/${course.slug}/${lesson.slug}`,
            title: name,
            meta: title,
            group: "lms.search.lessons",
          });
        }
      }
    }
    return hits.slice(0, 12);
  }, [query, tx]);
}

function Search() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const hits = useSearch(query);

  useEffect(() => {
    function away(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const groups = ["lms.search.courses", "lms.search.lessons", "lms.search.instructors"] as const;

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
          {hits.length === 0 && (
            <div style={{ padding: "14px 12px" }}>
              <strong style={{ display: "block", fontSize: "0.9rem" }}>
                {t("lms.search.empty")}
              </strong>
              <span style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>
                {t("lms.search.emptyHint")}
              </span>
            </div>
          )}
          {groups.map((group) => {
            const rows = hits.filter((hit) => hit.group === group);
            if (!rows.length) return null;
            return (
              <div key={group}>
                <div className="lms-results-group">{t(group)}</div>
                {rows.map((hit) => (
                  <Link
                    key={`${hit.group}-${hit.href}-${hit.title}`}
                    className="lms-result"
                    href={hit.href}
                    onClick={() => { setOpen(false); setQuery(""); }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <strong>{hit.title}</strong>
                      <br />
                      <span>{hit.meta}</span>
                    </span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---- notifications ---------------------------------------------------- */

function Notifications() {
  const { t, tx } = useI18n();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const unread = !read && notifications.some((note) => note.unread);

  useEffect(() => {
    function away(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={box}>
      <button
        type="button"
        className="lms-icon-btn"
        aria-label={t("lms.notifications")}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">◔</span>
        {unread && <span className="lms-dot" />}
      </button>

      {open && (
        <div className="lms-tray">
          {notifications.length === 0 ? (
            <div style={{ padding: 14, fontSize: "0.88rem", color: "var(--text-faint)" }}>
              {t("lms.notifications.empty")}
            </div>
          ) : (
            <>
              {notifications.map((note) => (
                <div
                  key={note.id}
                  className={`lms-note ${note.unread && !read ? "lms-note-unread" : ""}`}
                >
                  <span className="lms-note-title">{tx(note.title)}</span>
                  <span className="lms-note-body">{tx(note.body)}</span>
                  <span className="lms-note-at">{tx(note.at)}</span>
                </div>
              ))}
              <button
                type="button"
                className="lms-btn lms-btn-quiet lms-btn-sm"
                style={{ width: "100%", marginTop: 6 }}
                onClick={() => setRead(true)}
              >
                {t("lms.notifications.all")}
              </button>
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
  const crumbs = useCrumbs(pathname);

  // The drawer is a route-level thing: leaving the page should close it.
  useEffect(() => { setOpen(false); }, [pathname]);

  /* Marks the body while this section is mounted, so the ambient sakura can be
     turned down here without being removed. The branch is drawn on the page
     itself, and in the rest of the portal it only ever sits behind cards; here
     headings, a lesson's prose and the course contents sit directly on the
     page, and a dark limb crossing them costs real legibility. The management
     screens already make the same call more bluntly by drawing no branch at
     all — see AmbientSakura. */
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
            <span className="lms-side-name">{learner.name}</span>
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
