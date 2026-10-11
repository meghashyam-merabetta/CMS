import path from "path";
import type { NextConfig } from "next";

const API_TARGET = process.env.API_PROXY_TARGET || "http://16.4.61.3:3000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Same-origin proxy: the browser calls /api/* on localhost, Next forwards it
  // to the backend. This lets the SameSite=Lax login cookie be stored and sent.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
