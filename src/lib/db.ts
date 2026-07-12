import type { DocumentLegalStatus } from "@/lib/document-legal-status-types";
import fs from "fs";
import path from "path";

export type PdfDocument = {
  id: number;
  file_name: string;
  file_path: string;
  file_hash: string;
  doc_type: string;
  category: string | null;
  notification_no: string | null;
  is_corrigendum?: boolean;
  title: string;
  issued_date: string | null;
  year: number;
  summary_short: string | null;
  summary_bullets: string | null;
  summary: string | null;
  practical_effect: string | null;
  status: string;
  list_detail_manual?: boolean;
  summary_manual?: boolean;
  legal_status?: DocumentLegalStatus | null;
  legal_status_manual?: boolean;
  admin_uploaded?: boolean;
  source?: "ingest" | "admin";
  created_at?: string;
};

export type TextDocument = {
  id: number;
  slug: string;
  doc_category: string;
  title: string;
  year: number | null;
};

export type TextSection = {
  id: number;
  document_id: number;
  section_number: string;
  section_title: string;
  content: string;
  sort_order: number;
};

function readJson<T>(filename: string): T {
  const filePath = path.join(process.cwd(), "data", filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function getAllPdfDocuments(): PdfDocument[] {
  return readJson<PdfDocument[]>("pdf_documents.json");
}

export function getPdfDocuments(filters?: {
  docType?: string;
  year?: number;
  category?: string;
}): PdfDocument[] {
  return getAllPdfDocuments().filter((d) => {
    if (d.status !== "ready") return false;
    if (filters?.docType && d.doc_type !== filters.docType) return false;
    if (filters?.year && d.year !== filters.year) return false;
    if (
      filters?.category &&
      !matchesCategory(d, filters.docType, filters.category)
    ) {
      return false;
    }
    return true;
  });
}

export function getPdfDocumentById(id: number): PdfDocument | undefined {
  return getAllPdfDocuments().find((d) => d.id === id);
}

const ORDER_CATEGORY_ALIASES: Record<string, string[]> = {
  gst: ["gst", "central_tax", "central_tax_rate"],
};

function matchesCategory(
  doc: PdfDocument,
  docType: string | undefined,
  category: string | undefined
): boolean {
  if (!category) return true;
  if (docType === "order") {
    const aliases = ORDER_CATEGORY_ALIASES[category];
    if (aliases) return aliases.includes(doc.category ?? "");
  }
  return doc.category === category;
}

export function getPdfYears(docType?: string, category?: string): number[] {
  const years = getAllPdfDocuments()
    .filter((d) => d.status === "ready")
    .filter((d) => !docType || d.doc_type === docType)
    .filter((d) => matchesCategory(d, docType, category))
    .map((d) => d.year);
  return Array.from(new Set(years)).sort((a, b) => b - a);
}

export function getTextDocuments(category: "act" | "rule"): TextDocument[] {
  return readJson<TextDocument[]>("text_documents.json").filter(
    (d) => d.doc_category === category
  );
}

export type TextDocumentWithSections = TextDocument & {
  sections: TextSection[];
};

export function getTextDocumentsWithSections(
  category: "act" | "rule"
): TextDocumentWithSections[] {
  const docs = getTextDocuments(category);
  const allSections = readJson<TextSection[]>("text_sections.json");

  return docs.map((doc) => ({
    ...doc,
    sections: allSections
      .filter((s) => s.document_id === doc.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export function getTextDocumentBySlug(
  slug: string
): (TextDocument & { sections: TextSection[] }) | undefined {
  const docs = readJson<TextDocument[]>("text_documents.json");
  const doc = docs.find((d) => d.slug === slug);
  if (!doc) return undefined;

  const sections = readJson<TextSection[]>("text_sections.json").filter(
    (s) => s.document_id === doc.id
  );

  return { ...doc, sections };
}