import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = encodeURIComponent(params.slug);
  const pdfUrl = `/api/gst-act-pdf/${slug}#page=1&zoom=67`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>GST Act</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; }
    embed { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <embed src="${pdfUrl}" type="application/pdf" width="100%" height="100%" />
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-cache",
    },
  });
}