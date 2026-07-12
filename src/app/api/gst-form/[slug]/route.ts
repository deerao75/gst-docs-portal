import { getGstFormBySlug } from "@/lib/gst-forms";
import { setPdfInitialZoom, setPdfTitle } from "@/lib/pdf-serve";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const form = getGstFormBySlug(params.slug);
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  let filePath = path.normalize(form.file_path.replace(/\\/g, "/"));
  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }

  const allowedRoot = path.normalize(path.join(process.cwd(), "data", "gst_forms"));
  if (!filePath.startsWith(allowedRoot)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const raw = fs.readFileSync(filePath);
  const buffer = setPdfInitialZoom(setPdfTitle(raw, form.title));
  const download = request.nextUrl.searchParams.get("download") === "1";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": download
        ? `attachment; filename="${form.slug}.pdf"`
        : `inline; filename="${form.slug}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}