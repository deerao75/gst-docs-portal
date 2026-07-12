export type LegislationParagraph = {
  text: string;
  isHeading: boolean;
};

/** First line of the coloured notes block at the bottom of a section. */
export function isLegislationNoteStartLine(line: string): boolean {
  const text = line.trim();
  if (!text) return false;

  return (
    /^\*\s*Enforced/i.test(text) ||
    /^\d+\.\s*(?:Inserted|Omitted|Substituted|Added|Deleted)\b/i.test(text) ||
    /^(?:Inserted|Omitted|Substituted)\b/i.test(text)
  );
}

export function isLegislationSectionHeadingLine(line: string): boolean {
  const text = line.trim();
  if (!text) return false;

  return (
    /^\*\s*(?:Section|Rule)\s+\d/i.test(text) ||
    /^(?:Section|Rule)\s+\d/i.test(text) ||
    /^\d+\s+\[(?:Section|Rule)\s+\d/i.test(text)
  );
}

/**
 * Preserve Word paragraph boundaries (one stored line = one paragraph).
 * Notes start at the first *Enforced / Inserted / Omitted / Substituted line.
 */
export function parseLegislationContent(content: string): {
  paragraphs: LegislationParagraph[];
  notes: string[];
} {
  const lines = content.replace(/\r\n/g, "\n").trim().split("\n");

  let splitAt = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (isLegislationNoteStartLine(lines[i])) {
      splitAt = i;
      break;
    }
  }

  const bodyLines = lines.slice(0, splitAt).filter((line) => line.trim());
  const noteLines = lines.slice(splitAt).filter((line) => line.trim());

  return {
    paragraphs: bodyLines.map((text) => ({
      text,
      isHeading: isLegislationSectionHeadingLine(text),
    })),
    notes: noteLines,
  };
}

/** @deprecated */
export function isLegislationFootnoteLine(line: string): boolean {
  return isLegislationNoteStartLine(line);
}

/** @deprecated */
export function splitLegislationContent(content: string): {
  bodyLines: string[];
  noteLines: string[];
} {
  const parsed = parseLegislationContent(content);
  return {
    bodyLines: parsed.paragraphs.map((p) => p.text),
    noteLines: parsed.notes,
  };
}