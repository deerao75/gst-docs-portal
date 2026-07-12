export const NOTIFICATION_CATEGORIES = [
  { value: "central_tax", label: "Central Tax" },
  { value: "central_tax_rate", label: "Central Tax (Rate)" },
  { value: "integrated_tax", label: "Integrated Tax" },
  { value: "integrated_tax_rate", label: "Integrated Tax (Rate)" },
  { value: "union_territory_tax", label: "Union Territory Tax" },
  { value: "union_territory_tax_rate", label: "Union Territory Tax (Rate)" },
  { value: "compensation_cess", label: "Compensation Cess" },
  { value: "compensation_cess_rate", label: "Compensation Cess (Rate)" },
] as const;

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORIES)[number]["value"];

export const DEFAULT_NOTIFICATION_CATEGORY: NotificationCategory =
  "central_tax";

export function notificationCategoryLabel(value: string): string {
  return (
    NOTIFICATION_CATEGORIES.find((c) => c.value === value)?.label ?? value
  );
}