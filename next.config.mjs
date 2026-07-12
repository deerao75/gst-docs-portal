import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === "1";
const isWindowsLocal = process.platform === "win32" && !isVercel;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Windows-only: skip NFT to avoid ENOENT trace flakes. Vercel must trace data/ for fs reads.
  ...(isWindowsLocal ? { outputFileTracing: false } : {}),
  experimental: {
    outputFileTracingRoot: projectRoot,
    outputFileTracingIncludes: {
      "/**": [
        "./data/**/*.json",
        "./data/legislation_cross_links/**/*",
        "./data/legislation_legal_trail/**/*",
        "./data/section_commentary/**/*",
      ],
      "/api/**": [
        "./data/**/*",
        "./All Circulars/**/*",
        "./All Orders/**/*",
      ],
    },
    serverActions: {
      bodySizeLimit: "50mb",
    },
    ...(isWindowsLocal ? { workerThreads: false, cpus: 1 } : {}),
  },
};

export default nextConfig;