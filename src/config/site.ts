/**
 * Business facts the portal prints but cannot know by itself.
 *
 * Each value is a decision for the operator, not for a developer: the date a
 * privacy policy took effect, the hotline people call, the legal entity that
 * answers for the data. Nothing here may be guessed. A value left `null` is
 * not shown at all — the footer hides the line; the privacy policy, whose own
 * text refers to these facts, shows a visibly marked blank instead, so an
 * unfinished document cannot pass for a finished one.
 *
 * Fill them in here, in one place; every page and every language reads them.
 */

/** The privacy policy's effective date (last revision), ISO `YYYY-MM-DD`.
 *  Consent records cite `PRIVACY_POLICY_VERSION` on the API; bump both together. */
export const PRIVACY_POLICY_EFFECTIVE_DATE: string | null = null;

export interface SiteContacts {
  /** Full legal name of the operator of the personal data. */
  legalName: string | null;
  /** Postal / legal address, as it should be printed. */
  address: string | null;
  email: string | null;
  /** Public phone, in international format, e.g. "+998 71 000 00 00". */
  phone: string | null;
  /** Public site address. */
  site: string | null;
  /** Social profiles: label → URL. Empty hides the line. */
  social: ReadonlyArray<{ label: string; url: string }>;
}

export const SITE_CONTACTS: SiteContacts = {
  legalName: null,
  address: null,
  // Already published in the footer before this file existed; confirm it.
  email: "info@womanup.uz",
  phone: null,
  site: "https://womanup.uz",
  social: [],
};

/** The canonical origin, for metadata, canonical links and the sitemap.
 *  `SITE_URL` (server env) wins; the production address is the fallback. */
export function siteUrl(): string {
  return (process.env.SITE_URL || "https://womanup.uz").replace(/\/$/, "");
}
