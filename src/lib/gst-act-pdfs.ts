import { GST_ACT_PDFS } from "@/lib/catalog-data";
import type { GstActPdf } from "@/lib/gst-act-pdfs-types";

function readCatalog(): GstActPdf[] {
  return GST_ACT_PDFS;
}

export function getGstActPdfs(): GstActPdf[] {
  return readCatalog()
    .filter((act) => act.status === "ready")
    .sort((a, b) => b.year - a.year || b.id - a.id);
}

export function getGstActPdfBySlug(slug: string): GstActPdf | undefined {
  return getGstActPdfs().find((act) => act.slug === slug);
}