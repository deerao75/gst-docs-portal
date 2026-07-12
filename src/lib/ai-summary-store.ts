import { getAiSummaryIndex } from "@/lib/catalog-data";
import type { AiSummary } from "@/lib/ai-summary-pilot";

export function getAiSummary(documentId: number): AiSummary | null {
  const entry = getAiSummaryIndex().summaries[String(documentId)];
  if (!entry) return null;
  return {
    document_id: entry.document_id,
    notification_no: entry.notification_no,
    summary: entry.summary,
    key_points: entry.key_points ?? [],
    generated_at: entry.generated_at,
    model: entry.model,
    amended_refs: entry.amended_refs,
  };
}

export function hasAiSummary(documentId: number): boolean {
  return getAiSummary(documentId) !== null;
}