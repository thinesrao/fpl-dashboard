import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // This app lives in a monorepo subdirectory (repo root has its own
    // package-lock.json for the data pipeline's blob-publish step).
    // Pin the workspace root to `web/` so Turbopack doesn't guess wrong.
    root: path.join(__dirname),
  },
  // Guarantee the highlight image route ships its bundled fonts + logo in the
  // deployed serverless function (the new URL(import.meta.url) references
  // should trace these, but force-include them so a trace miss can't 500).
  outputFileTracingIncludes: {
    "/api/highlight": ["./assets/fonts/**", "./public/logo-mark.png"],
  },
};

export default nextConfig;
