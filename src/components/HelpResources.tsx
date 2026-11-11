"use client";

import { useI18n } from "@/i18n";

/** A help line the server attached to a safety-sensitive answer (QA I-15). */
export interface HelpResource {
  id: string;
  phone: string;
  tel: string;
  label: string;
}

/** Only well-formed `tel:` numbers become links — the field comes from the
 *  network, and an `href` is not a place to trust it. */
export function usableResources(value: unknown): HelpResource[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is HelpResource =>
      !!item &&
      typeof item === "object" &&
      typeof (item as HelpResource).label === "string" &&
      typeof (item as HelpResource).phone === "string" &&
      typeof (item as HelpResource).tel === "string" &&
      /^tel:\+?[0-9]{2,15}$/.test((item as HelpResource).tel),
  );
}

/** A calm card of help lines, apart from the answer text: a heading and one
 *  large, tappable number per line. Nothing is drawn when there are none. */
export function HelpResources({ resources }: { resources: unknown }) {
  const { t } = useI18n();
  const lines = usableResources(resources);
  if (!lines.length) return null;
  return (
    <aside className="help-lines" aria-label={t("help.resources.title")}>
      <p className="help-lines-title">{t("help.resources.title")}</p>
      <ul>
        {lines.map((line) => (
          <li key={line.id || line.tel}>
            <a className="help-line" href={line.tel}>
              <span className="help-line-label">{line.label}</span>
              <span className="help-line-phone">{line.phone}</span>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
