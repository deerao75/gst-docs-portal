import type { PdfDocument } from "@/lib/db";

function orderNumber(doc: PdfDocument): number {
  const match = doc.notification_no?.match(/^(\d+)\//);
  return match ? parseInt(match[1], 10) : 0;
}

/** Latest order first within the filtered set. */
export function sortOrders(docs: PdfDocument[]): PdfDocument[] {
  return [...docs].sort((a, b) => {
    const yearDiff = b.year - a.year;
    if (yearDiff !== 0) return yearDiff;
    const numDiff = orderNumber(b) - orderNumber(a);
    if (numDiff !== 0) return numDiff;
    return (b.issued_date ?? "").localeCompare(a.issued_date ?? "");
  });
}