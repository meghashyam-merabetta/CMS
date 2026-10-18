import path from "path";
import type { NextConfig } from "next";

const API_TARGET = process.env.API_PROXY_TARGET ;

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
