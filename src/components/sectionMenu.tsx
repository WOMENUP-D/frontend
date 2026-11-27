"use client";

/**
 * The portal's sections as tabs, and the panel a section opens under its bar.
 *
 * Shared by the portal header and the learning shell's top bar, so the same
 * six destinations read the same way wherever she is. The hook hands back the
 * tabs and the panel separately: the tabs sit wherever the bar keeps its
 * links, and the panel hangs off the bar itself (the nearest positioned
 * ancestor), the full width of it — inside the scrolling strip of tabs it
 * would be clipped.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useI18n, type MessageKey } from "@/i18n";

/** One page in a section. `guest: true` marks what a visitor sees before
 *  signing in: her plan, her learning, her cabinet are hers, and offering them
 *  to someone with no account advertises doors she cannot open. `desc` is the
 *  one sentence the open section shows beside its list. */
export type NavChild = { href: string; key: MessageKey; desc: MessageKey; guest?: boolean };

/** A top-level destination: a plain link, or a section that opens a panel of
 *  its pages under the header. A section with only one page visible to this
 *  reader collapses to a plain link to that page — a visitor's "Learning" is
 *  the catalogue alone, so she sees "Programmes", as before. */
type NavItem =
  | { kind: "link"; href: string; key: MessageKey; guest?: boolean }
  | { kind: "group"; id: string; key: MessageKey; desc: MessageKey; children: readonly NavChild[] };

/** Order is the argument this list makes about where a visit starts: what she
 *  learns, what it leads to, what is on, who helps, and her own room last.
 *  Nine tabs became five — related pages are grouped, not dropped. */
export const NAV: readonly NavItem[] = [
  // Named, not only behind the logo: many did not know the logo goes home.
  { kind: "link", href: "/", key: "nav.home", guest: true },
  {
    kind: "group", id: "learn", key: "nav.learning", desc: "mm.learn.d",
    children: [
      { href: "/dasturlar", key: "nav.programs", desc: "mm.programs.d", guest: true },
      { href: "/talim", key: "mm.myLearning", desc: "mm.myLearning.d" },
      { href: "/reja", key: "nav.plan", desc: "mm.plan.d" },
    ],
  },
  {
    kind: "group", id: "opps", key: "nav.opportunities", desc: "mm.opps.d",
    children: [
      { href: "/imkoniyatlar", key: "mm.allOpps", desc: "mm.allOpps.d", guest: true },
      // Real listings from the job board: the same search, a different source.
      { href: "/vakansiyalar", key: "nav.vacancies", desc: "mm.vacancies.d", guest: true },
      { href: "/imkoniyatlar/biznes", key: "biz.title", desc: "mm.biz.d", guest: true },
      // Found the same way as a listing, though she attends it rather than
      // applies to it.
      { href: "/tadbirlar", key: "nav.events", desc: "mm.events.d", guest: true },
      { href: "/imkoniyatlar/arizalarim", key: "meta.applications.title", desc: "mm.apps.d" },
    ],
  },
  { kind: "link", href: "/yordamchi", key: "asst.nav", guest: true },
  {
    kind: "group", id: "cab", key: "nav.cabinet", desc: "mm.cab.d",
    children: [
      { href: "/kabinet", key: "mm.overview", desc: "mm.overview.d" },
      { href: "/kabinet/diagnostika", key: "nav.assessment", desc: "mm.assessment.d" },
      { href: "/kabinet/portfolio", key: "mm.portfolio", desc: "mm.portfolio.d" },
    ],
  },
  // No management link here. It used to sit in this list unguarded, so every
  // woman who signed in was shown a panel she has no rights to. Staff reach it
  // through STAFF_LINKS above.
];

/** What this reader's header holds once guest and board rules are applied. */
export type Shown =
  | { kind: "link"; href: string; key: MessageKey }
  | { kind: "group"; id: string; key: MessageKey; desc: MessageKey; children: NavChild[] };

/** What this reader's bar holds: guest pages only for a visitor, the job
 *  board only when the server has one connected (QA B-19), and a section
 *  with a single visible page collapsed to a plain link. */
export function sectionItems(authed: boolean, vacanciesShown: boolean): Shown[] {
  const visible = (child: { href: string; guest?: boolean }) =>
    (authed || Boolean(child.guest)) && (vacanciesShown || child.href !== "/vakansiyalar");
  return NAV.flatMap<Shown>((item) => {
    if (item.kind === "link") return visible(item) ? [{ kind: "link", href: item.href, key: item.key }] : [];
    const children = item.children.filter(visible);
    if (children.length === 0) return [];
    if (children.length === 1) return [{ kind: "link", href: children[0].href, key: children[0].key }];
    return [{ kind: "group", id: item.id, key: item.key, desc: item.desc, children }];
  });
}

/** A detail page belongs to its section: opening an article or a course card
 *  must not un-highlight the pill she arrived through. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The child a path belongs to: the longest href that matches, so
 *  /imkoniyatlar/biznes lights "For your business", not "All opportunities". */
export function activeChild(pathname: string, children: readonly NavChild[]): string | null {
  let best: string | null = null;
  for (const child of children) {
    if (isActive(pathname, child.href) && (!best || child.href.length > best.length)) best = child.href;
  }
  return best;
}

export function useSectionMenu(items: Shown[]): {
  pills: ReactNode;
  panel: ReactNode;
  onLeave: (event: ReactPointerEvent) => void;
} {
  const pathname = usePathname();
  const { t } = useI18n();

  /* The open section. Opened by pointing at its tab (after a short pause, so
     sweeping the cursor across the bar does not flash every panel) or by
     clicking it; closed by leaving the header, Escape, or a click outside. */
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusHref, setFocusHref] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const openGroup = items.find(
    (item): item is Extract<Shown, { kind: "group" }> => item.kind === "group" && item.id === openId,
  );

  const schedule = useCallback((next: string | null, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setOpenId(next);
      setFocusHref(null);
    }, delay);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // A new page closes the panel it was opened from.
  useEffect(() => {
    setOpenId(null);
  }, [pathname]);

  useEffect(() => {
    if (!openId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const back = triggers.current[openId as string];
      setOpenId(null);
      back?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId]);

  function toggle(id: string, fromKeyboard: boolean) {
    window.clearTimeout(timer.current);
    const next = openId === id ? null : id;
    setOpenId(next);
    setFocusHref(null);
    // From the keyboard the panel is not where Tab goes next, so focus moves
    // into it; Escape brings it back to the tab.
    if (next && fromKeyboard) {
      requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("a")?.focus());
    }
  }

  const onLeave = (event: ReactPointerEvent) => {
    if (event.pointerType === "mouse" && openId) schedule(null, 220);
  };

  const pills = (
      <div className="nav-pills">
        {items.map((item) => {
          if (item.kind === "link") {
            const on = item.href === "/" ? pathname === "/" : isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${on ? "active" : ""}`}
                aria-current={on ? "page" : undefined}
                onPointerEnter={() => schedule(null, 120)}
              >
                {t(item.key)}
              </Link>
            );
          }
          const on = activeChild(pathname, item.children) !== null;
          const open = openId === item.id;
          return (
            <button
              key={item.id}
              ref={(node) => {
                triggers.current[item.id] = node;
              }}
              type="button"
              className={`nav-link nav-group ${on ? "active" : ""} ${open ? "is-open" : ""}`}
              aria-expanded={open}
              aria-controls="nav-mega"
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") schedule(item.id, openId ? 0 : 140);
              }}
              onClick={(event) => toggle(item.id, event.detail === 0)}
            >
              {t(item.key)}
              <svg className="nav-caret" viewBox="0 0 10 6" width="9" height="6" aria-hidden="true">
                <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          );
        })}
      </div>
  );

  const panel = (
    openGroup && (
        <>
          {/* The section's pages on the left, what the one under the pointer
              is for on the right — the reader knows where a link goes before
              she spends a click on it. */}
          <div
            id="nav-mega"
            ref={panelRef}
            className="nav-mega"
            onPointerEnter={() => window.clearTimeout(timer.current)}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") schedule(null, 220);
            }}
          >
            <div className="nav-mega-inner">
              <ul className="nav-mega-list">
                {openGroup.children.map((child) => {
                  const on = activeChild(pathname, openGroup.children) === child.href;
                  return (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className={`nav-mega-link ${on ? "active" : ""}`}
                        aria-current={on ? "page" : undefined}
                        onPointerEnter={() => setFocusHref(child.href)}
                        onFocus={() => setFocusHref(child.href)}
                        onClick={() => setOpenId(null)}
                      >
                        {t(child.key)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {(() => {
                const focused = openGroup.children.find((child) => child.href === focusHref);
                return (
                  <div className="nav-mega-about" aria-live="polite">
                    <p className="nav-mega-title">{t(focused ? focused.key : openGroup.key)}</p>
                    <p className="nav-mega-desc">{t(focused ? focused.desc : openGroup.desc)}</p>
                  </div>
                );
              })()}
            </div>
          </div>
          {/* The page under the open panel steps back; a click on it closes. */}
          <div className="nav-mega-scrim" aria-hidden="true" onPointerDown={() => setOpenId(null)} />
        </>
      )
  );

  return { pills, panel, onLeave };
}
