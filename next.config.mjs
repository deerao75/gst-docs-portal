import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === "1";
const isWindowsLocal = process.platform === "win32" && !isVercel;

const dataBundle = [
  "./data/**/*",
  "./All Circulars/**/*",
  "./All Orders/**/*",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel: standalone bundles the Node server; data/ is copied post-build.
  ...(isVercel ? { output: "standalone" } : {}),
  // Windows local builds only: skip NFT to avoid ENOENT trace flakes.
  ...(isWindowsLocal ? { outputFileTracing: false } : {}),
  experimental: {
    outputFileTracingRoot: projectRoot,
    ...(isVercel
      ? {
          outputFileTracingIncludes: {
            "/acts": dataBundle,
            "/acts/[slug]": dataBundle,
            "/rules": dataBundle,
            "/rules/[slug]": dataBundle,
            "/rules/search": dataBundle,
            "/acts/search": dataBundle,
            "/documents": dataBundle,
            "/finance-acts": dataBundle,
            "/gst-forms": dataBundle,
            "/gst-press-releases": dataBundle,
            "/search": dataBundle,
            "/admin/documents": dataBundle,
            "/contact": dataBundle,
            "/team": dataBundle,
            "/api/pdf/[id]": dataBundle,
            "/api/pdf-view/[id]": dataBundle,
            "/api/finance-act/[id]": dataBundle,
            "/api/finance-act-view/[id]": dataBundle,
            "/api/gst-form/[slug]": dataBundle,
            "/api/gst-form-view/[slug]": dataBundle,
            "/api/gst-act-pdf/[slug]": dataBundle,
            "/api/gst-act-pdf-view/[slug]": dataBundle,
            "/api/gst-press-release/[id]": dataBundle,
            "/api/gst-press-release-view/[id]": dataBundle,
          },
        }
      : {}),
    serverActions: {
      bodySizeLimit: "50mb",
    },
    ...(isWindowsLocal ? { workerThreads: false, cpus: 1 } : {}),
  },
};

export default nextConfig;