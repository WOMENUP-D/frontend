const isProduction = process.env.NODE_ENV === "production";

// The Content Security Policy is set per request in `src/middleware.ts`, where
// each page gets its own nonce; the headers below are the same for every page.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // The development badge used to sit on the companion in the bottom-left corner.
  devIndicators: { position: "bottom-right" },
  poweredByHeader: false,
  reactStrictMode: true,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  /**
   * Development proxy. The session's refresh token is an HttpOnly cookie
   * scoped to the API's auth path, which only works when the page and the API
   * share an origin — as they do in production behind Caddy. In development
   * set `API_PROXY_TARGET=http://localhost:8000` and `NEXT_PUBLIC_API_URL=/api/v1`
   * and Next forwards `/api/*` to the API itself.
   */
  async rewrites() {
    const target = process.env.API_PROXY_TARGET;
    if (!target) return [];
    return [{ source: "/api/:path*", destination: `${target.replace(/\/$/, "")}/api/:path*` }];
  },

  async redirects() {
    return [
      // The news feed was the screen the portal opened on, so its address is
      // in browser histories and in anything already shared. It now leads
      // where a signed-in woman is sent instead of 404.
      { source: "/yangiliklar", destination: "/kabinet", permanent: false },
      { source: "/yangiliklar/:slug", destination: "/kabinet", permanent: false },
      // The career-paths section was taken down; its addresses were in the
      // menu and in the getting-started guide, so they lead to the catalogue.
      { source: "/kasb", destination: "/dasturlar", permanent: false },
      { source: "/kasb/:slug", destination: "/dasturlar", permanent: false },
    ];
  },
};

export default nextConfig;
