/**
 * Catalog JSON bundled at build time so Vercel serverless pages
 * do not depend on fs + outputFileTracing for metadata.
 */
import type { PdfDocument, TextDocument, TextSection } from "@/lib/db";
import type { FinanceAct } from "@/lib/finance-acts";
import type { GstActPdf } from "@/lib/gst-act-pdfs-types";
import type { GstAdvisoryCatalog } from "@/lib/gst-advisories-types";
import type { GstForm } from "@/lib/gst-forms-types";
import type { LegislationCrossLinkData } from "@/lib/legislation-cross-links-types";
import type { GstPressRelease } from "@/lib/gst-press-releases";
import type { AiSummary } from "@/lib/ai-summary-pilot";

import pdfDocumentsJson from "../../data/pdf_documents.json";
import textDocumentsJson from "../../data/text_documents.json";
import textSectionsJson from "../../data/text_sections.json";
import financeActsJson from "../../data/finance_acts.json";
import gstFormsJson from "../../data/gst_forms.json";
import gstAdvisoriesJson from "../../data/gst_advisories.json";
import gstActPdfsJson from "../../data/gst_act_pdfs.json";
import gstPressReleasesJson from "../../data/gst_press_releases.json";
import aiSummariesJson from "../../data/ai_summaries.json";
import aiSummariesPilotJson from "../../data/ai_summaries_pilot.json";
import cgstCrossLinksJson from "../../data/legislation_cross_links/central-goods-and-services-tax-act-2017.json";
import igstCrossLinksJson from "../../data/legislation_cross_links/integrated-goods-and-services-tax-act-2017.json";

export const PDF_DOCUMENTS = pdfDocumentsJson as PdfDocument[];
export const TEXT_DOCUMENTS = textDocumentsJson as TextDocument[];
export const TEXT_SECTIONS = textSectionsJson as TextSection[];
export const FINANCE_ACTS = financeActsJson as FinanceAct[];
export const GST_FORMS = gstFormsJson as GstForm[];
export const GST_ADVISORIES = gstAdvisoriesJson as GstAdvisoryCatalog;
export const GST_ACT_PDFS = gstActPdfsJson as GstActPdf[];
export const GST_PRESS_RELEASES = gstPressReleasesJson as GstPressRelease[];

const LEGISLATION_CROSS_LINKS: Record<string, LegislationCrossLinkData> = {
  "central-goods-and-services-tax-act-2017":
    cgstCrossLinksJson as LegislationCrossLinkData,
  "integrated-goods-and-services-tax-act-2017":
    igstCrossLinksJson as LegislationCrossLinkData,
};

export function getLegislationCrossLinkData(
  actSlug: string
): LegislationCrossLinkData | null {
  return LEGISLATION_CROSS_LINKS[actSlug] ?? null;
}

type SummaryIndex = {
  enabled: boolean;
  scope: string;
  summaries: Record<string, AiSummary>;
};

let cachedSummaryIndex: SummaryIndex | null = null;

export function getAiSummaryIndex(): SummaryIndex {
  if (cachedSummaryIndex) return cachedSummaryIndex;

  const pilot = aiSummariesPilotJson as SummaryIndex;
  const full = aiSummariesJson as SummaryIndex;
  cachedSummaryIndex =
    full.enabled && Object.keys(full.summaries).length > 0 ? full : pilot;
  return cachedSummaryIndex;
}