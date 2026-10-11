import path from "path";
import type { NextConfig } from "next";

const API_TARGET = process.env.API_PROXY_TARGET || "http://16.4.61.3:3000";

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
};

export default nextConfig;
