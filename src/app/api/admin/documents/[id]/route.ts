import {
  buildLegalStatusFromAdmin,
  readAllPdfDocuments,
  updateDocumentAdminFields,
} from "@/lib/document-store";
import { verifyAdminKey } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = (await request.json()) as {
    list_detail?: string;
    summary?: string;
    legal_status_label?: string;
    legal_status_refs?: string;
    clear_legal_status?: boolean;
  };

  const hasList = body.list_detail !== undefined;
  const hasSummary = body.summary !== undefined;
  const hasLegal =
    body.clear_legal_status ||
    body.legal_status_label !== undefined ||
    body.legal_status_refs !== undefined;

  if (!hasList && !hasSummary && !hasLegal) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  const update: {
    list_detail?: string;
    summary?: string;
    legal_status?: import("@/lib/document-legal-status-types").DocumentLegalStatus | null;
  } = {};

  if (hasList) {
    const trimmed = body.list_detail?.trim() ?? "";
    if (trimmed) update.list_detail = trimmed;
  }
  if (hasSummary) {
    const trimmed = body.summary?.trim() ?? "";
    if (trimmed) update.summary = trimmed;
  }

  if (body.legal_status_label !== undefined || body.legal_status_refs !== undefined) {
    const label = (body.legal_status_label?.trim() ?? "") as
      | "withdrawn"
      | "rescinded"
      | "";
    if (!label || body.clear_legal_status) {
      update.legal_status = null;
    } else {
      const lines = (body.legal_status_refs ?? "")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const built = buildLegalStatusFromAdmin(
        label,
        lines,
        readAllPdfDocuments()
      );
      if (!built) {
        return NextResponse.json(
          { error: "Could not resolve related document numbers" },
          { status: 400 }
        );
      }
      update.legal_status = built;
    }
  }

  if (
    !update.list_detail &&
    !update.summary &&
    update.legal_status === undefined
  ) {
    return NextResponse.json(
      { error: "No valid fields to save" },
      { status: 400 }
    );
  }

  const updated = updateDocumentAdminFields(id, update);
  if (!updated) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated.id,
    list_detail: updated.summary_short,
    summary: updated.summary,
    legal_status: updated.legal_status ?? null,
    message: "Saved",
  });
}