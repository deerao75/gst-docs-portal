import { DEFAULT_PDF_ZOOM } from "@/lib/pdf-serve";

export { DEFAULT_PDF_ZOOM };
export function pdfViewerSrc(documentId: number): string {
  return `/api/pdf-view/${documentId}`;
}