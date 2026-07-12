import { notificationCategoryLabel } from "@/lib/notification-categories";
import { orderCategoryLabel } from "@/lib/order-categories";
import type { PdfDocument } from "@/lib/db";

/** Suffix used in notification_no (must match ingested data). */
const CIRCULAR_NUMBER_LABELS: Record<string, string> = {
  cgst_circular: "CGST Circular",
  igst_circular: "IGST Circular",
  compensation_cess_circular: "Compensation Cess Circular",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  order: "Order",
  instruction: "Instruction",
  advisory: "Advisory",
};

export function categoryLabelForDoc(
  docType: string,
  category: string | null
): string {
  if (docType === "notification") {
    return notificationCategoryLabel(category ?? "central_tax");
  }
  if (docType === "circular") {
    return (
      CIRCULAR_NUMBER_LABELS[category ?? "cgst_circular"] ?? "CGST Circular"
    );
  }
  if (docType === "order") {
    return orderCategoryLabel(category ?? "gst");
  }
  return DOC_TYPE_LABELS[docType] ?? docType;
}

function parseLeadingNumber(notificationNo: string | null): number | null {
  if (!notificationNo) return null;
  const m = notificationNo.match(/^(\d+)\//);
  return m ? parseInt(m[1], 10) : null;
}

/** Next display number for a type/category/year, e.g. `03/2026-Central Tax`. */
export function generateNextDocumentNumber(
  docs: PdfDocument[],
  docType: string,
  category: string | null,
  year: number
): string {
  const label = categoryLabelForDoc(docType, category);
  const suffix = `/${year}-${label}`;

  let maxNum = 0;
  for (const d of docs) {
    if (d.doc_type !== docType) continue;
    if (category && d.category !== category) continue;
    if (d.year !== year) continue;
    const no = d.notification_no ?? "";
    if (!no.endsWith(suffix)) continue;
    const num = parseLeadingNumber(no);
    if (num !== null) maxNum = Math.max(maxNum, num);
  }

  const next = maxNum + 1;
  const numStr =
    docType === "circular" ? String(next) : String(next).padStart(2, "0");
  return `${numStr}${suffix}`;
}

export function notificationNoToFileStem(notificationNo: string): string {
  return notificationNo.replace(/[/\\:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}