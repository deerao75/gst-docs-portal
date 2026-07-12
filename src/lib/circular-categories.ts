export const CIRCULAR_CATEGORIES = [
  { value: "cgst_circular", label: "CGST Circulars" },
  { value: "igst_circular", label: "IGST Circulars" },
  { value: "compensation_cess_circular", label: "Compensation Cess Circulars" },
] as const;

export type CircularCategory = (typeof CIRCULAR_CATEGORIES)[number]["value"];

export const DEFAULT_CIRCULAR_CATEGORY: CircularCategory = "cgst_circular";

export function circularCategoryLabel(value: string): string {
  return CIRCULAR_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}