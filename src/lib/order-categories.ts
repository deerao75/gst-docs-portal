export const ORDER_CATEGORIES = [
  { value: "central_tax", label: "Central Tax" },
  { value: "integrated_tax", label: "Integrated Tax" },
  { value: "union_territory_tax", label: "Union Territory Tax" },
  { value: "compensation_cess", label: "Compensation Cess" },
  { value: "gst", label: "GST (Other)" },
] as const;

export type OrderCategory = (typeof ORDER_CATEGORIES)[number]["value"];

export const DEFAULT_ORDER_CATEGORY: OrderCategory = "central_tax";

export function orderCategoryLabel(value: string): string {
  return ORDER_CATEGORIES.find((c) => c.value === value)?.label ?? "GST";
}