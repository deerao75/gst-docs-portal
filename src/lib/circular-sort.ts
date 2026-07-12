import type { PdfDocument } from "@/lib/db";

function isCorrigendum(doc: PdfDocument): boolean {
  return Boolean(doc.is_corrigendum) || /corrig/i.test(doc.file_name);
}

function parentKey(doc: PdfDocument): string {
  return `${doc.notification_no ?? ""}|${doc.category ?? ""}`;
}

function circularNumber(doc: PdfDocument): number {
  const match = doc.notification_no?.match(/^(\d+)\//);
  return match ? parseInt(match[1], 10) : 0;
}

function compareParents(a: PdfDocument, b: PdfDocument): number {
  const numDiff = circularNumber(b) - circularNumber(a);
  if (numDiff !== 0) return numDiff;
  return (b.issued_date ?? "").localeCompare(a.issued_date ?? "");
}

/** Latest circular first; corrigenda immediately after their parent. */
export function sortCirculars(docs: PdfDocument[]): PdfDocument[] {
  const parents: PdfDocument[] = [];
  const corrigenda: PdfDocument[] = [];

  for (const doc of docs) {
    if (isCorrigendum(doc)) {
      corrigenda.push(doc);
    } else {
      parents.push(doc);
    }
  }

  parents.sort(compareParents);

  const corrByParent = new Map<string, PdfDocument[]>();
  for (const doc of corrigenda) {
    const key = parentKey(doc);
    const group = corrByParent.get(key) ?? [];
    group.push(doc);
    corrByParent.set(key, group);
  }

  Array.from(corrByParent.values()).forEach((group) => {
    group.sort((a, b) =>
      (b.issued_date ?? "").localeCompare(a.issued_date ?? "")
    );
  });

  const ordered: PdfDocument[] = [];
  const placed = new Set<number>();

  for (const parent of parents) {
    ordered.push(parent);
    placed.add(parent.id);
    const related = corrByParent.get(parentKey(parent)) ?? [];
    for (const corr of related) {
      ordered.push(corr);
      placed.add(corr.id);
    }
    corrByParent.delete(parentKey(parent));
  }

  const orphans = corrigenda
    .filter((doc) => !placed.has(doc.id))
    .sort(compareParents);

  return [...ordered, ...orphans];
}