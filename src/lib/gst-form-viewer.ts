export function gstFormViewerSrc(slug: string): string {
  return `/api/gst-form-view/${encodeURIComponent(slug)}`;
}