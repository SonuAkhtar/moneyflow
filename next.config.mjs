import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? `${Date.now()}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  allowedDevOrigins: ["192.168.1.26", "192.168.1.*"],
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  sassOptions: {
    loadPaths: [path.join(__dirname, "src/styles")],
    additionalData: `@use "abstracts" as *;`,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
