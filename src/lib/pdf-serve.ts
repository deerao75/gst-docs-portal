export function escapePdfString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function setPdfTitle(buffer: Buffer, title: string): Buffer {
  const content = buffer.toString("latin1");
  const escaped = escapePdfString(title);
  const replacement = `/Title (${escaped})`;

  if (/\/Title\s*\([^)]*\)/.test(content)) {
    return Buffer.from(
      content.replace(/\/Title\s*\([^)]*\)/, replacement),
      "latin1"
    );
  }

  if (/\/Title\s*<[^>]+>/.test(content)) {
    return Buffer.from(
      content.replace(/\/Title\s*<[^>]+>/, replacement),
      "latin1"
    );
  }

  return buffer;
}

/** Default PDF embed zoom (percent) when served inline. */
export const DEFAULT_PDF_ZOOM = 100;

export function setPdfInitialZoom(buffer: Buffer): Buffer {
  let content = buffer.toString("latin1");
  content = content.replace(/ ?\/OpenAction <<[^>]*>>/g, "");

  const catalogIdx = content.search(/\/Type\s*\/Catalog/);
  if (catalogIdx === -1) {
    return buffer;
  }

  const dictEnd = content.indexOf(">>", catalogIdx);
  if (dictEnd === -1) {
    return buffer;
  }

  const openAction =
    ` /OpenAction << /Type /Action /S /GoTo /D [0 /XYZ null null ${(DEFAULT_PDF_ZOOM / 100).toFixed(2)}] >>`;
  const updated =
    content.slice(0, dictEnd) + openAction + content.slice(dictEnd);

  return Buffer.from(updated, "latin1");
}