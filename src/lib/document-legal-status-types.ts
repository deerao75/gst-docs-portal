export type DocumentRelationRef = {
  id: number;
  notification_no: string | null;
  title: string | null;
  issued_date?: string | null;
  category?: string | null;
  year?: number | null;
  note?: string | null;
};

export type LegalStatusLabel = "withdrawn" | "rescinded" | "amended";

export type DocumentLegalStatus = {
  button_label?: LegalStatusLabel;
  withdrawn_targets?: DocumentRelationRef[];
  rescinded_by?: DocumentRelationRef[];
  amended_by?: DocumentRelationRef[];
};

export function legalStatusButtonText(label: LegalStatusLabel): string {
  const map: Record<LegalStatusLabel, string> = {
    withdrawn: "Withdrawn",
    rescinded: "Rescinded",
    amended: "Amended",
  };
  return map[label];
}

/** Later notifications in the same category that amended this notification. */
export function getAmendedBy(
  status: DocumentLegalStatus | null | undefined
): DocumentRelationRef[] {
  return status?.amended_by ?? [];
}

export function hasAmendmentHistory(
  status: DocumentLegalStatus | null | undefined
): boolean {
  return getAmendedBy(status).length > 0;
}