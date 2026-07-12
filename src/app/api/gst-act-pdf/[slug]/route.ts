import { getGstActPdfBySlug } from "@/lib/gst-act-pdfs";
import { setPdfInitialZoom, setPdfTitle } from "@/lib/pdf-serve";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const act = getGstActPdfBySlug(params.slug);
  if (!act) {
    return NextResponse.json({ error: "Act PDF not found" }, { status: 404 });
  }

  let filePath = path.normalize(act.file_path.replace(/\\/g, "/"));
  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }

  const allowedRoot = path.normalize(path.join(process.cwd(), "data", "gst_act_pdfs"));
  if (!filePath.startsWith(allowedRoot)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const raw = fs.readFileSync(filePath);
  const buffer = setPdfInitialZoom(setPdfTitle(raw, act.title));
  const download = request.nextUrl.searchParams.get("download") === "1";
  const safeName = act.slug.replace(/[^\w.-]+/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": download
        ? `attachment; filename="${safeName}.pdf"`
        : `inline; filename="${safeName}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}