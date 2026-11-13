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

/* ---- QA Phase 2 (auth): the return address after signing in (C-09) ------ */

/**
 * A `next=` value that is safe to navigate to after sign-in: a path on this
 * site and nothing else. `//host`, `/\host`, a scheme, a control character or
 * anything not starting with one `/` becomes null — the parameter is what an
 * open redirect would be built from, so it is checked, not trusted. The
 * sign-in and reset pages themselves are refused too, so a loop is impossible.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value.trim();
  if (!text.startsWith("/") || text.startsWith("//") || text.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\\]/.test(text)) return null;
  let url: URL;
  try {
    url = new URL(text, "http://same.origin");
  } catch {
    return null;
  }
  if (url.origin !== "http://same.origin") return null;
  if (/^\/(login|parol-tiklash)(\/|$)/.test(url.pathname)) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** The sign-in page in a given mode, coming back to `next` afterwards. */
export function loginHref(mode: "signin" | "signup", next?: string | null): string {
  const params = new URLSearchParams({ mode });
  const back = safeNext(next ?? null);
  if (back && back !== "/") params.set("next", back);
  return `/login?${params.toString()}`;
}
