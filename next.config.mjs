import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Not using output: "standalone" — skip NFT trace collection (Windows ENOENT flakes).
  outputFileTracing: false,
  experimental: {
    outputFileTracingRoot: projectRoot,
    serverActions: {
      bodySizeLimit: "50mb",
    },
    // Reduce parallel build workers — avoids intermittent ENOENT trace errors on Windows.
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;