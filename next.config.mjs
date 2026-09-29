/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,

  async redirects() {
    return [
      // The news feed was the screen the portal opened on, so its address is
      // in browser histories and in anything already shared. It now leads
      // where a signed-in woman is sent instead of 404.
      { source: "/yangiliklar", destination: "/kabinet", permanent: false },
      { source: "/yangiliklar/:slug", destination: "/kabinet", permanent: false },
    ];
  },
};

export default nextConfig;
