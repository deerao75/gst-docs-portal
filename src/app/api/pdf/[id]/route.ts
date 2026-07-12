import { resolveProjectPath } from "@/lib/data-path";
import { getPdfDocumentById } from "@/lib/db";
import { setPdfInitialZoom, setPdfTitle } from "@/lib/pdf-serve";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const doc = getPdfDocumentById(id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const filePath = resolveProjectPath(doc.file_path);

  const allowedRoots = [
    path.normalize(path.join(process.cwd(), "data", "notifications")),
    path.normalize(path.join(process.cwd(), "data", "circulars")),
    path.normalize(path.join(process.cwd(), "data", "orders")),
    path.normalize(path.join(process.cwd(), "data", "instructions")),
    path.normalize(path.join(process.cwd(), "data", "admin-uploads")),
    path.normalize(path.join(process.cwd(), "All Notifications")),
    path.normalize(path.join(process.cwd(), "All Circulars")),
    path.normalize(path.join(process.cwd(), "All Orders")),
    path.normalize(path.join(process.cwd(), "All Instructions")),
  ];

  if (!allowedRoots.some((root) => filePath.startsWith(root))) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const DOC_TYPE_LABELS: Record<string, string> = {
    notification: "Notification",
    circular: "Circular",
    order: "Order",
    instruction: "Instruction",
    advisory: "Advisory",
  };

  const displayTitle =
    DOC_TYPE_LABELS[doc.doc_type] ?? "GST Document";
  const raw = fs.readFileSync(filePath);
  const buffer = setPdfInitialZoom(setPdfTitle(raw, displayTitle));

  const download = request.nextUrl.searchParams.get("download") === "1";
  const safeName = (doc.notification_no ?? displayTitle).replace(/[^\w./-]+/g, "_");

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