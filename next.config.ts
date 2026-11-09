import type { NextConfig } from "next";

// Backend base URL. In local dev this comes from .env.local; in production it
// must be provided as a real environment variable (next.config runs before
// .env files are guaranteed to be loaded).
const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Proxy API + asset requests so relative URLs returned by the backend
  // (e.g. /v1/matches/<id>/assets/pitch-image) work from the browser without
  // exposing the backend origin or enabling CORS.
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: `${backendUrl}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
