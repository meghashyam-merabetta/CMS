import type { NextConfig } from "next";

const BACKEND_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
)
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "192.168.1.45",
    "192.168.1.*",
    "192.168.*.*",
    "*.local",
  ],
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
