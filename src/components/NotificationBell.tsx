"use client";

/**
 * Her notifications, from the header of every page: the ones that are due —
 * a reminder she set for an event arrives here the day before, and nowhere
 * else yet. Each links to what it is about.
 *
 * A real disclosure: the button says whether anything is unread in words for
 * a screen reader, the tray closes on Escape and on a tap outside, and focus
 * goes back to the bell.
 */

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { portal, type Notification } from "@/services/portal";
import { Icon } from "@/components/ds";

export function NotificationBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const trayId = useId();
  const unread = items.filter((item) => item.read_at === null).length;

  useEffect(() => {
    portal.notifications().then(setItems).catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    function away(event: MouseEvent) {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
    await portal.markNotificationsRead().catch(() => {
      /* The dot going quiet is cosmetic; the next load reads the truth. */
    });
  }

  return (
    <div className="nb" ref={box}>
      <button
        ref={button}
        type="button"
        className="nb-button"
        aria-expanded={open}
        aria-controls={trayId}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" />
        <span className="sr-only">
          {t("lms.notifications")}
          {unread > 0 ? ` (${unread})` : ""}
        </span>
        {unread > 0 && <span className="nb-dot" aria-hidden="true" />}
      </button>

      <div id={trayId} className="nb-tray" hidden={!open}>
        <p className="nb-title">{t("lms.notifications")}</p>
        {items.length === 0 ? (
          <p className="nb-empty">{t("lms.notifications.empty")}</p>
        ) : (
          <>
            <ul className="nb-list">
              {items.slice(0, 8).map((item) => {
                const inner = (
                  <>
                    <span className="nb-item-title">{item.title}</span>
                    <span className="nb-item-body">{item.body}</span>
                  </>
                );
                return (
                  <li key={item.id} className={item.read_at === null ? "is-unread" : ""}>
                    {item.action_url && item.action_url.startsWith("/") ? (
                      <Link href={item.action_url} className="nb-item" onClick={() => setOpen(false)}>
                        {inner}
                      </Link>
                    ) : (
                      <span className="nb-item">{inner}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {unread > 0 && (
              <button type="button" className="ds-cta is-quiet nb-all" onClick={() => void markAllRead()}>
                <span>{t("lms.notifications.all")}</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
