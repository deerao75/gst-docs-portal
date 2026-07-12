/** AI notification summaries — set enabled false to hide Show Summary. */

export const AI_SUMMARY_ENABLED = true;

export type AiSummary = {
  document_id: number;
  notification_no: string;
  summary: string;
  key_points: string[];
  generated_at: string;
  model: string;
  amended_refs?: string[];
};

export function isAiSummaryEligible(doc: {
  doc_type: string;
  status?: string;
}): boolean {
  if (!AI_SUMMARY_ENABLED) return false;
  return doc.doc_type === "notification";
}