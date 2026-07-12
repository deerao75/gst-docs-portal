import type {
  LegislationSourceIndex,
  LegislationSourceLink,
  LegislationSourceLinkKind,
} from "@/lib/legislation-source-links-types";

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeActTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/^the\s+/i, "")
    .replace(/[^a-z0-9]/g, "");
}

function financeActLookupKey(year: number, variant: number): string {
  return `${year}:${variant}`;
}

export function expandNotificationKeys(notificationNo: string): string[] {
  const keys = new Set<string>();
  const trimmed = notificationNo.trim();
  keys.add(normalizeKey(trimmed));

  const match = /^(\d+)\/(\d{4})-(.+)$/i.exec(trimmed);
  if (!match) {
    return [...keys];
  }

  const num = parseInt(match[1], 10);
  const year = match[2];
  const label = normalizeKey(match[3]);
  const padded = String(num).padStart(2, "0");

  for (const prefix of [`${num}/${year}`, `${padded}/${year}`]) {
    keys.add(prefix);
    keys.add(`${prefix}-${label}`);
  }

  if (label.includes("central tax")) {
    for (const prefix of [`${num}/${year}`, `${padded}/${year}`]) {
      keys.add(`${prefix}-central tax`);
      keys.add(`${prefix}-central tax (rate)`);
      keys.add(`${prefix}-c.t`);
      keys.add(`${prefix}-c`);
    }
  }

  if (label.includes("union territory")) {
    for (const prefix of [`${num}/${year}`, `${padded}/${year}`]) {
      keys.add(`${prefix}-union territory tax`);
      keys.add(`${prefix}-union territory tax (rate)`);
    }
  }

  if (label === "igst" || label.includes("integrated goods")) {
    for (const prefix of [`${num}/${year}`, `${padded}/${year}`]) {
      keys.add(`${prefix}-igst`);
      keys.add(`${prefix}-igst (rate)`);
    }
  }

  return [...keys];
}

function suffixVariants(rawSuffix: string, hasRate: boolean): string[] {
  const cleaned = rawSuffix
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const variants = new Set<string>();

  if (!cleaned || cleaned === "c" || cleaned === "ct" || cleaned === "c t") {
    variants.add("central tax");
  } else if (cleaned.includes("union territory") || cleaned === "ut") {
    variants.add("union territory tax");
  } else if (cleaned.includes("igst")) {
    variants.add("igst");
  } else if (cleaned.includes("cess") || cleaned.includes("compensation")) {
    variants.add("compensation cess");
  } else if (cleaned.includes("central tax")) {
    variants.add("central tax");
  } else {
    variants.add(cleaned);
  }

  if (hasRate) {
    const withRate = [...variants].map((item) =>
      item.includes("(rate)") ? item : `${item} (rate)`
    );
    withRate.forEach((item) => variants.add(item));
  }

  return [...variants];
}

function documentHref(docType: string, id: number): string {
  return `/documents?type=${encodeURIComponent(docType)}&id=${id}`;
}

function linkLabel(_kind: LegislationSourceLinkKind, label: string): string {
  return label;
}

function addLink(
  links: LegislationSourceLink[],
  seen: Set<string>,
  link: LegislationSourceLink | null
) {
  if (!link || seen.has(link.href)) return;
  seen.add(link.href);
  links.push(link);
}

type FinanceActRef = {
  year: number;
  variant: number;
};

function financeActRefKey(ref: FinanceActRef): string {
  return financeActLookupKey(ref.year, ref.variant);
}

function extractFinanceActRefs(note: string): FinanceActRef[] {
  const refs: FinanceActRef[] = [];
  const seen = new Set<string>();

  const add = (year: number, variant: number) => {
    if (!Number.isFinite(year) || year < 1900) return;
    const key = financeActRefKey({ year, variant });
    if (seen.has(key)) return;
    seen.add(key);
    refs.push({ year, variant });
  };

  const noTwoPatterns = [
    /Finance\s*Act\s*\(\s*No\.?\s*2\s*\)\s*Act,?\s*(\d{4})/gi,
    /Finance\s*\(\s*No\.?\s*2\s*\)\s*Act,?\s*(\d{4})/gi,
  ];
  for (const pattern of noTwoPatterns) {
    for (const match of note.matchAll(pattern)) {
      add(parseInt(match[1], 10), 2);
    }
  }

  for (const match of note.matchAll(
    /Finance\s*\(\s*No\.?\s*\d+\s+of\s+(\d{4})\s*\)\s*Act,?\s*(\d{4})/gi
  )) {
    add(parseInt(match[2], 10), 1);
  }

  for (const match of note.matchAll(
    /Finance\s*Act\s*\(\s*No\.?\s*(\d+)\s*\)\s*Act,?\s*(\d{4})/gi
  )) {
    const variant = parseInt(match[1], 10) === 2 ? 2 : 1;
    add(parseInt(match[2], 10), variant);
  }

  for (const match of note.matchAll(
    /Finance\s*\(\s*No\.?\s*(\d+)\s*\)\s*Act,?\s*(\d{4})/gi
  )) {
    if (parseInt(match[1], 10) === 2) continue;
    add(parseInt(match[2], 10), 1);
  }

  for (const match of note.matchAll(/Finance\s*Act,?\s*(\d{4})/gi)) {
    const start = match.index ?? 0;
    const before = note.slice(Math.max(0, start - 40), start);
    if (/\(\s*No\.?\s*\d+\s*\)\s*Act,?\s*$/i.test(before)) continue;
    add(parseInt(match[1], 10), 1);
  }

  return refs;
}

function resolveFinanceAct(
  year: number,
  variant: number,
  index: LegislationSourceIndex
): LegislationSourceLink | null {
  const entry = index.financeActs[financeActLookupKey(year, variant)];
  if (!entry) return null;
  return {
    kind: "finance_act",
    label: linkLabel("finance_act", entry.label),
    href: `/finance-acts?id=${entry.id}`,
  };
}

function resolveNotification(
  num: string,
  suffix: string,
  hasRate: boolean,
  index: LegislationSourceIndex
): LegislationSourceLink | null {
  const yearPart = num.includes("/") ? num.split("/")[1] : null;
  if (!yearPart) return null;

  const numberPart = num.includes("/") ? num.split("/")[0] : num;
  const padded = String(parseInt(numberPart, 10)).padStart(2, "0");

  for (const label of suffixVariants(suffix, hasRate)) {
    for (const prefix of [`${numberPart}/${yearPart}`, `${padded}/${yearPart}`]) {
      const candidates = [
        `${prefix}-${label}`,
        `${prefix}-${normalizeKey(label)}`,
        prefix,
      ];
      for (const candidate of candidates) {
        const entry = index.documents[normalizeKey(candidate)];
        if (!entry) continue;
        const kind = entry.docType as LegislationSourceLinkKind;
        return {
          kind,
          label: linkLabel(kind, entry.label),
          href: documentHref(entry.docType, entry.id),
        };
      }
    }
  }

  return null;
}

function actButtonLabel(entry: { label: string; shortLabel?: string }): string {
  return entry.label;
}

function resolveActTitle(
  title: string,
  index: LegislationSourceIndex,
  matchText: string
): LegislationSourceLink | null {
  const entry = index.acts[normalizeActTitle(title)];
  if (!entry) return null;
  return {
    kind: "act",
    label: linkLabel("act", actButtonLabel(entry)),
    href: `/acts/${entry.slug}`,
  };
}

export function dedupeLegislationSourceLinks(
  links: LegislationSourceLink[]
): LegislationSourceLink[] {
  const seen = new Set<string>();
  const unique: LegislationSourceLink[] = [];
  for (const link of links) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    unique.push(link);
  }
  return unique;
}

export function resolveLegislationNoteLinks(
  note: string,
  index: LegislationSourceIndex
): LegislationSourceLink[] {
  const links: LegislationSourceLink[] = [];
  const seen = new Set<string>();

  for (const ref of extractFinanceActRefs(note)) {
    addLink(links, seen, resolveFinanceAct(ref.year, ref.variant, index));
  }

  const notificationPatterns = [
    /Notification(?:\s+of\s+the\s+Government[\s\S]*?)?\s+No\.?\s*(\d+)\s*\/\s*(\d{4})\s*[-–]?\s*([A-Za-z.\s()]*?)(?:\s*\(Rate\))?(?=\s*(?:,|dated|\.|-\s*Brought|\s+w\.e\.f)|$)/gi,
    /vide\s+Notification\s+No\.?\s*(\d+)\s*\/\s*(\d{4})\s*[-–]?\s*([A-Za-z.\s()]*?)(?:\s*\(Rate\))?(?=\s*(?:,|dated|\.|$))/gi,
  ];

  for (const pattern of notificationPatterns) {
    for (const match of note.matchAll(pattern)) {
      const hasRate = /\(Rate\)/i.test(match[0]);
      addLink(
        links,
        seen,
        resolveNotification(
          `${match[1]}/${match[2]}`,
          match[3] ?? "",
          hasRate,
          index
        )
      );
    }
  }

  const actPatterns = [
    /(?:by\s+s(?:ection)?\.?\s*\d+\s+of\s+)?The\s+([A-Z][^.\n]+?Act,?\s*\d{4})/gi,
    /(?:by\s+s(?:ection)?\.?\s*\d+\s+of\s+)?the\s+([A-Z][^.\n]+?Act,?\s*\d{4})/gi,
    /(?:by\s+s(?:ection)?\.?\s*\d+\s+of\s+)?([A-Z][^.\n]*?Goods and Services Tax[^.\n]*?Act,?\s*\d{4})/gi,
    /(?:by\s+s(?:ection)?\.?\s*\d+\s+of\s+)?(Constitution\s*\([^)]+\)\s*Act,?\s*\d{4})/gi,
  ];

  for (const pattern of actPatterns) {
    for (const match of note.matchAll(pattern)) {
      const title = match[1].replace(/\s+/g, " ").trim();
      if (/finance\s*act/i.test(title)) continue;
      addLink(links, seen, resolveActTitle(title, index, match[0]));
    }
  }

  return links;
}