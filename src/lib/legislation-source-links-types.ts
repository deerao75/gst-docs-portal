export type LegislationSourceLinkKind =
  | "finance_act"
  | "notification"
  | "circular"
  | "order"
  | "instruction"
  | "advisory"
  | "act";

export type LegislationSourceLink = {
  label: string;
  href: string;
  kind: LegislationSourceLinkKind;
};

export type LegislationSourceIndex = {
  financeActs: Record<string, { id: number; label: string }>;
  documents: Record<string, { id: number; docType: string; label: string }>;
  acts: Record<string, { slug: string; label: string; shortLabel?: string }>;
};