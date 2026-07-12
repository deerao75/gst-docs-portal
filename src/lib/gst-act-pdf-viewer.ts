export function gstActPdfViewerSrc(slug: string): string {
  return `/api/gst-act-pdf-view/${encodeURIComponent(slug)}`;
}