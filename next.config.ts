import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.4.44"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
