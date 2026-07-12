/**
 * Chrome/Edge embed PDFs at ~67% ("fit page") when loaded directly in an iframe.
 * The html wrapper + #zoom=100 + server-side OpenAction injection opens at 100%.
 */
export function pdfViewerSrc(documentId: number): string {
  return `/api/pdf-view/${documentId}`;
}