import type { GstActPdf } from "@/lib/gst-act-pdfs-types";
import fs from "fs";
import path from "path";

function readCatalog(): GstActPdf[] {
  const filePath = path.join(process.cwd(), "data", "gst_act_pdfs.json");
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as GstActPdf[];
}

export function getGstActPdfs(): GstActPdf[] {
  return readCatalog()
    .filter((act) => act.status === "ready")
    .sort((a, b) => b.year - a.year || b.id - a.id);
}

export function getGstActPdfBySlug(slug: string): GstActPdf | undefined {
  return getGstActPdfs().find((act) => act.slug === slug);
}