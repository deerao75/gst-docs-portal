import { createAdminDocument, readAllPdfDocuments } from "@/lib/document-store";
import { verifyAdminKey } from "@/lib/admin-auth";
import type { DocumentLegalStatus } from "@/lib/document-legal-status-types";
import { NextRequest, NextResponse } from "next/server";

function relationRefsForAdmin(status: DocumentLegalStatus | null | undefined): string {
  if (!status) return "";
  const refs =
    status.button_label === "withdrawn"
      ? status.withdrawn_targets
      : status.rescinded_by;
  return (refs ?? []).map((r) => r.notification_no ?? String(r.id)).join("\n");
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "all";
  const year = request.nextUrl.searchParams.get("year");
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(10, parseInt(request.nextUrl.searchParams.get("pageSize") ?? "25", 10))
  );

  let docs = readAllPdfDocuments().filter((d) => d.status === "ready");

  if (type !== "all") {
    docs = docs.filter((d) => d.doc_type === type);
  }
  if (year && year !== "all") {
    docs = docs.filter((d) => d.year === Number(year));
  }
  if (q) {
    docs = docs.filter((d) => {
      const hay = [
        d.notification_no,
        d.title,
        d.summary_short,
        d.file_name,
        String(d.id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  docs.sort((a, b) => {
    const typeOrder = a.doc_type.localeCompare(b.doc_type);
    if (typeOrder !== 0) return typeOrder;
    if (b.year !== a.year) return b.year - a.year;
    return (b.issued_date ?? "").localeCompare(a.issued_date ?? "");
  });

  const total = docs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = docs.slice(start, start + pageSize).map((d) => ({
    id: d.id,
    doc_type: d.doc_type,
    category: d.category,
    notification_no: d.notification_no,
    issued_date: d.issued_date,
    year: d.year,
    list_detail: d.summary_short?.trim() || d.title?.trim() || "",
    show_summary: d.summary?.trim() || "",
    legal_status_label: d.legal_status?.button_label ?? "",
    legal_status_refs: relationRefsForAdmin(d.legal_status),
    file_name: d.file_name,
    is_corrigendum: Boolean(d.is_corrigendum),
    list_detail_manual: Boolean(d.list_detail_manual),
    summary_manual: Boolean(d.summary_manual),
    admin_uploaded: Boolean(d.admin_uploaded),
  }));

  const years = Array.from(new Set(readAllPdfDocuments().map((d) => d.year))).sort(
    (a, b) => b - a
  );

  const typeCounts: Record<string, number> = {};
  for (const d of readAllPdfDocuments()) {
    if (d.status !== "ready") continue;
    typeCounts[d.doc_type] = (typeCounts[d.doc_type] ?? 0) + 1;
  }

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages,
    years,
    typeCounts,
  });
}

const VALID_DOC_TYPES = new Set([
  "notification",
  "circular",
  "order",
  "instruction",
  "advisory",
]);

export async function POST(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const docType = String(form.get("doc_type") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    const listDetail = String(form.get("list_detail") ?? "").trim();
    const issuedDateRaw = String(form.get("issued_date") ?? "").trim();
    const yearRaw = String(form.get("year") ?? "").trim();
    const isCorrigendum = form.get("is_corrigendum") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }
    if (!VALID_DOC_TYPES.has(docType)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (!listDetail) {
      return NextResponse.json(
        { error: "List detail (title) is required" },
        { status: 400 }
      );
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    const year = yearRaw
      ? Number(yearRaw)
      : issuedDateRaw
        ? new Date(issuedDateRaw + "T00:00:00").getFullYear()
        : new Date().getFullYear();

    if (!Number.isFinite(year) || year < 2017 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    let issuedDate: string | null = issuedDateRaw || null;
    if (issuedDate && !/^\d{4}-\d{2}-\d{2}$/.test(issuedDate)) {
      return NextResponse.json(
        { error: "Date must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: "PDF file is empty" }, { status: 400 });
    }
    if (buffer.length > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "PDF must be under 50 MB" },
        { status: 400 }
      );
    }

    const record = createAdminDocument({
      docType,
      category,
      listDetail,
      issuedDate,
      year,
      isCorrigendum,
      pdfBuffer: buffer,
      originalFileName: file.name,
    });

    return NextResponse.json({
      id: record.id,
      notification_no: record.notification_no,
      list_detail: record.summary_short,
      file_name: record.file_name,
      message: "Document added",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    const status = message.includes("already") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}