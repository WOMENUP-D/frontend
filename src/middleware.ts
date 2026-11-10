import { NextResponse, type NextRequest } from "next/server";

/**
 * A Content Security Policy with a fresh nonce on every page.
 *
 * Scripts run only when they carry this request's nonce (Next.js puts it on
 * its own inline scripts when the policy is set here) or were loaded by such
 * a script — `strict-dynamic` covers the Google sign-in library Firebase
 * fetches at run time. An injected `<script>` has no nonce and does not run.
 * Styles keep `'unsafe-inline'`: React's `style={{…}}` attributes need it,
 * and a CSS injection cannot read a session.
 */
function policy(nonce: string, request: NextRequest): string {
  const dev = process.env.NODE_ENV !== "production";
  const api = apiOrigin();
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://apis.google.com https://www.gstatic.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${api} https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://apis.google.com https://*.firebaseapp.com https://firebaseinstallations.googleapis.com${dev ? " ws: wss:" : ""}`,
    "frame-src https://*.firebaseapp.com https://accounts.google.com",
    request.nextUrl.protocol === "https:" ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function apiOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "/api/v1", "http://placeholder.local").origin ===
      "http://placeholder.local"
      ? "'self'"
      : new URL(process.env.NEXT_PUBLIC_API_URL ?? "").origin;
  } catch {
    return "'self'";
  }
}

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = policy(nonce, request);

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: static assets, images and the health probe carry no scripts.
      source: "/((?!_next/static|_next/image|favicon.ico|healthz|public-config|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
