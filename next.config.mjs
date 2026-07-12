import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isWindowsLocal = process.platform === "win32" && process.env.VERCEL !== "1";

/** PDF folders traced only into API routes that stream files. */
const pdfBundle = [
  "./data/notifications/**/*",
  "./data/circulars/**/*",
  "./data/orders/**/*",
  "./data/instructions/**/*",
  "./data/finance_acts/**/*",
  "./data/gst_forms/**/*",
  "./data/gst_act_pdfs/**/*",
  "./data/gst_press_releases/**/*",
  "./data/admin-uploads/**/*",
  "./All Circulars/**/*",
  "./All Orders/**/*",
];

const pdfApiRoutes = {
  "/api/pdf/[id]": pdfBundle,
  "/api/pdf-view/[id]": pdfBundle,
  "/api/finance-act/[id]": pdfBundle,
  "/api/finance-act-view/[id]": pdfBundle,
  "/api/gst-form/[slug]": pdfBundle,
  "/api/gst-form-view/[slug]": pdfBundle,
  "/api/gst-act-pdf/[slug]": pdfBundle,
  "/api/gst-act-pdf-view/[slug]": pdfBundle,
  "/api/gst-press-release/[id]": pdfBundle,
  "/api/gst-press-release-view/[id]": pdfBundle,
  "/api/health": ["./data/pdf_documents.json"],
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not use output:standalone on Vercel — it breaks API routes and
  // bundles hundreds of MB into every page serverless function.
  ...(isWindowsLocal ? { outputFileTracing: false } : {}),
  experimental: {
    outputFileTracingRoot: projectRoot,
    ...(!isWindowsLocal ? { outputFileTracingIncludes: pdfApiRoutes } : {}),
    serverActions: {
      bodySizeLimit: "50mb",
    },
    ...(isWindowsLocal ? { workerThreads: false, cpus: 1 } : {}),
  },
};

export default nextConfig;