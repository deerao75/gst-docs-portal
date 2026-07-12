import { CIRCULAR_CATEGORIES } from "@/lib/circular-categories";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-categories";
import { ORDER_CATEGORIES } from "@/lib/order-categories";

const SINGLE_CATEGORIES = {
  instruction: [{ value: "instruction", label: "Instruction" }],
  advisory: [{ value: "advisory", label: "Advisory" }],
} as const;

export function categoriesForDocType(docType: string) {
  switch (docType) {
    case "notification":
      return NOTIFICATION_CATEGORIES;
    case "circular":
      return CIRCULAR_CATEGORIES;
    case "order":
      return ORDER_CATEGORIES;
    case "instruction":
      return SINGLE_CATEGORIES.instruction;
    case "advisory":
      return SINGLE_CATEGORIES.advisory;
    default:
      return [];
  }
}

export function defaultCategoryForDocType(docType: string): string {
  const cats = categoriesForDocType(docType);
  return cats[0]?.value ?? docType;
}