import path from "path";
import type { NextConfig } from "next";

const BACKEND_URL = (
  process.env.BACKEND_PROXY_URL ||
  (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost:5173')
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://16.4.61.3:3000')
).trim().replace(/\/+$/, '').replace(/\/api$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "192.168.1.45",
    "192.168.1.*",
    "192.168.*.*",
    "*.local",
  ],
  turbopack: {
    root: path.resolve(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
