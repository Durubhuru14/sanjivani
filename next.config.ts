import path from "node:path";
import type { NextConfig } from "next";

/**
 * Pin the Turbopack workspace root to this folder.
 *
 * Without it, Turbopack walks parent directories looking for lockfiles and
 * warns when it finds one outside the repo (e.g. a stray bun.lock in
 * ~/Downloads when the app lives in ~/Downloads/sanjivani). Declaring the
 * root keeps module resolution deterministic no matter where the project
 * is unpacked. next.config.ts is compiled by Next itself, which provides
 * __dirname; the cwd fallback covers any unusual loader.
 */
const projectRoot = typeof __dirname === "string" ? __dirname : path.resolve();

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // Keep the dev UI clean: no floating dev-tools indicator in the corner.
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
