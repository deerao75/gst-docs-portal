import { NextRequest, NextResponse } from "next/server";

/** HTML shell so Chrome/Edge honour #zoom=100 on the embedded PDF plugin. */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const pdfUrl = `/api/pdf/${id}#page=1&zoom=100`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>GST Document</title>
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