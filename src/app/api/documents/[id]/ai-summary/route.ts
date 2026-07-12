import { getPdfDocumentById } from "@/lib/db";
import { isAiSummaryEligible } from "@/lib/ai-summary-pilot";
import { getAiSummary } from "@/lib/ai-summary-store";
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

  if (!isAiSummaryEligible(doc)) {
    return NextResponse.json(
      { error: "AI summary not available for this document" },
      { status: 403 }
    );
  }

  const summary = getAiSummary(id);
  if (!summary) {
    return NextResponse.json(
      {
        error:
          "AI summary not yet generated. Run: python scripts/generate_ai_summaries.py",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(summary);
}