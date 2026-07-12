import { getPdfDocumentById } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
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

  return NextResponse.json({
    id: doc.id,
    notification_no: doc.notification_no,
    title: doc.title,
    summary_short: doc.summary_short,
    summary_bullets: doc.summary_bullets,
    summary: doc.summary,
    practical_effect: doc.practical_effect,
  });
}