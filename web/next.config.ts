import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // This app lives in a monorepo subdirectory (repo root has its own
    // package-lock.json for the data pipeline's blob-publish step).
    // Pin the workspace root to `web/` so Turbopack doesn't guess wrong.
    root: path.join(__dirname),
  },
};

export default nextConfig;
