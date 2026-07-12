import fs from "fs";
import path from "path";
import type { AiSummary } from "@/lib/ai-summary-pilot";

type SummaryIndex = {
  enabled: boolean;
  scope: string;
  summaries: Record<string, AiSummary>;
};

function loadIndex(): SummaryIndex {
  const candidates = ["ai_summaries.json", "ai_summaries_pilot.json"];
  for (const file of candidates) {
    const filePath = path.join(process.cwd(), "data", file);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as SummaryIndex;
    }
  }
  return { enabled: false, scope: "none", summaries: {} };
}

export function getAiSummary(documentId: number): AiSummary | null {
  const entry = loadIndex().summaries[String(documentId)];
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