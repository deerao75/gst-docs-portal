import {
  getPdfDocuments,
  getTextDocumentsWithSections,
  type PdfDocument,
  type TextSection,
} from "@/lib/db";
import { toLegislationDisplayTitle } from "@/lib/legislation-format";

export type LegislationSearchHit = {
  kind: "act" | "rule";
  documentTitle: string;
  slug: string;
  sectionNumber: string;
  sectionTitle: string;
  sectionId: number;
  href: string;
};

export type NotificationSearchHit = {
  id: number;
  notificationNo: string | null;
  title: string;
  year: number;
  category: string | null;
  href: string;
};

export type PortalSearchResults = {
  query: string;
  legislation: LegislationSearchHit[];
  notifications: NotificationSearchHit[];
};

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function sectionNumberMatches(queryNumber: string, sectionNumber: string): boolean {
  return sectionNumber.toUpperCase() === queryNumber;
}

function compareLegislationNumber(a: string, b: string): number {
  const parse = (value: string) => {
    const match = /^(\d+)([A-Z]*)$/i.exec(value);
    return match
      ? { num: Number(match[1]), suffix: match[2].toUpperCase() }
      : { num: 0, suffix: value };
  };
  const left = parse(a);
  const right = parse(b);
  if (left.num !== right.num) return left.num - right.num;
  return left.suffix.localeCompare(right.suffix);
}

function parseSectionQuery(raw: string): string | null {
  const query = normalizeWhitespace(raw).toLowerCase();
  const patterns = [
    /^(?:section|sec|s|rule|r)\.?\s*(\d+[a-z]?)$/i,
    /^(\d+[a-z]?)$/i,
  ];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

function parseNotificationQuery(raw: string): { num: string; year: string } | null {
  const query = normalizeWhitespace(raw).toLowerCase();
  const patterns = [
    /^(?:notification|notif|n)\.?\s*(\d+)\s*\/\s*(\d{4})$/i,
    /^(\d+)\s*\/\s*(\d{4})$/i,
    /^(\d+)\s*\/\s*(\d{4})[-\s]/i,
  ];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return {
        num: String(Number.parseInt(match[1], 10)),
        year: match[2],
      };
    }
  }
  return null;
}

function legislationHit(
  kind: "act" | "rule",
  slug: string,
  title: string,
  section: TextSection
): LegislationSearchHit {
  return {
    kind,
    documentTitle: toLegislationDisplayTitle(title),
    slug,
    sectionNumber: section.section_number,
    sectionTitle: section.section_title,
    sectionId: section.id,
    href: `/${kind}s/${slug}?sectionId=${section.id}`,
  };
}

function notificationKey(doc: PdfDocument): string | null {
  const match = (doc.notification_no ?? "").match(/(\d+)\s*\/\s*(\d{4})/);
  if (!match) return null;
  return `${Number.parseInt(match[1], 10)}/${match[2]}`;
}

function notificationHit(doc: PdfDocument): NotificationSearchHit {
  const params = new URLSearchParams({
    type: "notification",
    id: String(doc.id),
  });
  if (doc.category) params.set("category", doc.category);

  return {
    id: doc.id,
    notificationNo: doc.notification_no,
    title: doc.summary_short?.trim() || doc.title,
    year: doc.year,
    category: doc.category,
    href: `/documents?${params.toString()}`,
  };
}

export function searchPortal(rawQuery: string): PortalSearchResults {
  const query = normalizeWhitespace(rawQuery);
  if (!query) {
    return { query, legislation: [], notifications: [] };
  }

  const sectionNumber = parseSectionQuery(query);
  const notificationQuery = parseNotificationQuery(query);

  const legislation: LegislationSearchHit[] = [];
  if (sectionNumber) {
    for (const doc of getTextDocumentsWithSections("act")) {
      for (const section of doc.sections) {
        if (sectionNumberMatches(sectionNumber, section.section_number)) {
          legislation.push(
            legislationHit("act", doc.slug, doc.title, section)
          );
        }
      }
    }
    for (const doc of getTextDocumentsWithSections("rule")) {
      for (const section of doc.sections) {
        if (sectionNumberMatches(sectionNumber, section.section_number)) {
          legislation.push(
            legislationHit("rule", doc.slug, doc.title, section)
          );
        }
      }
    }
    legislation.sort((a, b) => {
      const numberCompare = compareLegislationNumber(
        a.sectionNumber,
        b.sectionNumber
      );
      if (numberCompare !== 0) return numberCompare;
      return a.documentTitle.localeCompare(b.documentTitle);
    });
  }

  const notifications: NotificationSearchHit[] = [];
  if (notificationQuery) {
    const key = `${notificationQuery.num}/${notificationQuery.year}`;
    const hits = getPdfDocuments({ docType: "notification" }).filter(
      (doc) => notificationKey(doc) === key
    );
    hits
      .sort((a, b) => (b.issued_date ?? "").localeCompare(a.issued_date ?? ""))
      .forEach((doc) => notifications.push(notificationHit(doc)));
  }

  return { query, legislation, notifications };
}