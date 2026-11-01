/**
 * Addresses that came from outside — a job board, an organisation's profile,
 * a course catalogue — are data, not links, until they pass this check. Only
 * `http` and `https` with a host are let through; `javascript:`, `data:`,
 * `vbscript:` and anything malformed become nothing, and nothing is rendered
 * as a link or an image source.
 */

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value.trim();
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname) return null;
  return url.href;
}

/** The host to show beside an outbound link, without a scheme or a path. */
export function hostOf(value: string | null | undefined): string | null {
  const safe = safeHttpUrl(value);
  if (!safe) return null;
  return new URL(safe).hostname.replace(/^www\./, "");
}
