export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Compact date for document list tables (avoids column clipping). */
export function formatTableDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function docTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    notification: "Notification",
    circular: "Circular",
    order: "Order",
    instruction: "Instruction",
    advisory: "Advisory",
  };
  return labels[type] || type;
}

export function renderBullets(text: string): string {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      const cleaned = line.replace(/^-\s*/, "");
      return `<li>${cleaned.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</li>`;
    })
    .join("");
}