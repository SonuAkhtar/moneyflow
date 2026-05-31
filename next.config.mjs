import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow loading the dev server from devices on the local network (e.g. your
  // phone hitting the Mac's LAN IP). Without this, Next.js blocks cross-origin
  // requests to /_next/* dev resources like webpack-hmr.
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
