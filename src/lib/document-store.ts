import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { PdfDocument } from "@/lib/db";
import type {
  DocumentLegalStatus,
  DocumentRelationRef,
  LegalStatusLabel,
} from "@/lib/document-legal-status-types";
import {
  generateNextDocumentNumber,
  notificationNoToFileStem,
} from "@/lib/document-numbers";

const DATA_FILE = path.join(process.cwd(), "data", "pdf_documents.json");
const UPLOAD_ROOT = path.join(process.cwd(), "data", "admin-uploads");

export function readAllPdfDocuments(): PdfDocument[] {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as PdfDocument[];
}

export function writeAllPdfDocuments(docs: PdfDocument[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(docs, null, 2), "utf-8");
}

export function updateDocumentListDetail(
  id: number,
  listDetail: string
): PdfDocument | null {
  return updateDocumentAdminFields(id, { list_detail: listDetail });
}

export type AdminDocumentUpdate = {
  list_detail?: string;
  summary?: string;
  legal_status?: DocumentLegalStatus | null;
};

function resolveRelationRefs(
  lines: string[],
  docs: PdfDocument[]
): DocumentRelationRef[] {
  const refs: DocumentRelationRef[] = [];
  const seen = new Set<number>();

  for (const raw of lines) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    const match = docs.find((d) => {
      const no = (d.notification_no ?? "").toLowerCase();
      return no === key || no.includes(key) || key.includes(no);
    });
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      refs.push({
        id: match.id,
        notification_no: match.notification_no,
        title: match.summary_short?.trim() || match.title,
        issued_date: match.issued_date,
      });
    }
  }
  return refs;
}

export function buildLegalStatusFromAdmin(
  buttonLabel: LegalStatusLabel | "",
  relatedLines: string[],
  docs: PdfDocument[]
): DocumentLegalStatus | null {
  if (!buttonLabel) return null;
  const refs = resolveRelationRefs(relatedLines, docs);
  if (refs.length === 0) return null;

  const status: DocumentLegalStatus = { button_label: buttonLabel };
  if (buttonLabel === "withdrawn") status.withdrawn_targets = refs;
  if (buttonLabel === "rescinded") status.rescinded_by = refs;
  return status;
}

export function updateDocumentAdminFields(
  id: number,
  fields: AdminDocumentUpdate
): PdfDocument | null {
  const docs = readAllPdfDocuments();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return null;

  if (fields.list_detail !== undefined) {
    const trimmed = fields.list_detail.trim();
    if (!trimmed) return null;
    docs[idx].summary_short = trimmed;
    docs[idx].title = trimmed;
    docs[idx].list_detail_manual = true;
  }

  if (fields.summary !== undefined) {
    const trimmed = fields.summary.trim();
    if (!trimmed) return null;
    docs[idx].summary = trimmed;
    docs[idx].summary_manual = true;
  }

  if (fields.legal_status !== undefined) {
    if (fields.legal_status === null) {
      delete docs[idx].legal_status;
      delete docs[idx].legal_status_manual;
    } else {
      docs[idx].legal_status = fields.legal_status;
      docs[idx].legal_status_manual = true;
    }
  }

  writeAllPdfDocuments(docs);
  return docs[idx];
}

function fileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function nextDocumentId(docs: PdfDocument[]): number {
  return docs.reduce((max, d) => Math.max(max, d.id), 0) + 1;
}

export type CreateAdminDocumentInput = {
  docType: string;
  category: string;
  listDetail: string;
  issuedDate: string | null;
  year: number;
  isCorrigendum: boolean;
  pdfBuffer: Buffer;
  originalFileName: string;
};

export function createAdminDocument(
  input: CreateAdminDocumentInput
): PdfDocument {
  const docs = readAllPdfDocuments();
  const hash = fileHash(input.pdfBuffer);

  const duplicate = docs.find((d) => d.file_hash === hash);
  if (duplicate) {
    throw new Error(
      `This PDF is already in the portal as ${duplicate.notification_no} (ID ${duplicate.id})`
    );
  }

  const notificationNo = generateNextDocumentNumber(
    docs,
    input.docType,
    input.category,
    input.year
  );

  const stem = notificationNoToFileStem(notificationNo);
  const uploadDir = path.join(UPLOAD_ROOT, input.docType, String(input.year));
  fs.mkdirSync(uploadDir, { recursive: true });

  const fileName = `${stem}.pdf`;
  const filePath = path.join(uploadDir, fileName);

  if (fs.existsSync(filePath)) {
    throw new Error(`File already exists: ${fileName}`);
  }

  fs.writeFileSync(filePath, input.pdfBuffer);

  const trimmedDetail = input.listDetail.trim();
  const id = nextDocumentId(docs);
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const record: PdfDocument = {
    id,
    file_name: fileName,
    file_path: filePath,
    file_hash: hash,
    doc_type: input.docType,
    category: input.category,
    notification_no: notificationNo,
    title: trimmedDetail,
    issued_date: input.issuedDate,
    year: input.year,
    is_corrigendum: input.isCorrigendum,
    summary_short: trimmedDetail,
    summary_bullets: null,
    summary: null,
    practical_effect: null,
    status: "ready",
    list_detail_manual: true,
    admin_uploaded: true,
    source: "admin",
    created_at: now,
  };

  docs.push(record);
  writeAllPdfDocuments(docs);
  return record;
}

export function getAdminUploadRoot(): string {
  return UPLOAD_ROOT;
}