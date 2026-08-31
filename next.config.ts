import type { NextConfig } from "next";
import { normalizeBasePath } from "./src/lib/app-path";

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  basePath,
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" }
    ]
  }
};

export default nextConfig;
