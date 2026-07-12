import { ACTS_CATALOG } from "@/lib/legislation-catalog";
import type { LegislationSourceIndex } from "@/lib/legislation-source-links-types";
import { expandNotificationKeys } from "@/lib/legislation-source-links-resolve";
import { getFinanceActs } from "@/lib/finance-acts";
import { getGstActPdfs } from "@/lib/gst-act-pdfs";
import { readAllPdfDocuments } from "@/lib/document-store";

let cachedIndex: LegislationSourceIndex | null = null;

function normalizeActTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/^the\s+/i, "")
    .replace(/[^a-z0-9]/g, "");
}

function actTitleAliases(title: string): string[] {
  const keys = new Set<string>();
  const add = (value: string) => {
    const key = normalizeActTitle(value);
    if (key) keys.add(key);
  };

  add(title);
  add(title.replace(/^the\s+/i, ""));
  add(title.replace(/\(([^)]+)\)/g, " $1 "));

  return [...keys];
}

function financeActLookupKey(year: number, variant: number): string {
  return `${year}:${variant}`;
}

export function buildLegislationSourceIndex(): LegislationSourceIndex {
  const financeActs: LegislationSourceIndex["financeActs"] = {};
  for (const act of getFinanceActs()) {
    const variant = act.title.toLowerCase().includes("(no. 2)") ? 2 : 1;
    const key = financeActLookupKey(act.year, variant);
    financeActs[key] = { id: act.id, label: act.title };
  }

  const documents: LegislationSourceIndex["documents"] = {};
  for (const doc of readAllPdfDocuments()) {
    if (doc.status !== "ready" || !doc.notification_no) continue;
    const entry = {
      id: doc.id,
      docType: doc.doc_type,
      label: doc.notification_no,
    };
    for (const key of expandNotificationKeys(doc.notification_no)) {
      documents[key] ??= entry;
    }
  }

  const actPdfMeta = new Map(
    getGstActPdfs().map((act) => [
      act.slug,
      { label: act.title, shortLabel: act.act_no ?? undefined },
    ])
  );

  const acts: LegislationSourceIndex["acts"] = {};
  for (const item of ACTS_CATALOG.items) {
    const pdfMeta = item.slug ? actPdfMeta.get(item.slug) : undefined;
    const entry = {
      slug: item.slug,
      label: pdfMeta?.label ?? item.title,
      shortLabel: pdfMeta?.shortLabel,
    };
    for (const key of actTitleAliases(item.title)) {
      acts[key] ??= entry;
    }
  }

  return { financeActs, documents, acts };
}

export function getLegislationSourceIndex(): LegislationSourceIndex {
  if (!cachedIndex) {
    cachedIndex = buildLegislationSourceIndex();
  }
  return cachedIndex;
}