/** True when most letters are uppercase (e.g. full-caps statute titles). */
export function isMostlyUppercase(text: string): boolean {
  const letters = text.match(/[a-zA-Z]/g) ?? [];
  if (letters.length < 4) return false;
  const upper = letters.filter(
    (c) => c === c.toUpperCase() && c !== c.toLowerCase()
  ).length;
  return upper / letters.length >= 0.75;
}

const PRESERVE_UPPER = new Set(["gst", "igst", "utgst", "cbic"]);

function capitalizeWord(word: string): string {
  const core = word.replace(/[^a-zA-Z0-9]/g, "");
  if (core && PRESERVE_UPPER.has(core.toLowerCase())) {
    return word.replace(core, core.toUpperCase());
  }
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Title-case full-caps names; leave mixed-case titles unchanged. */
export function toLegislationDisplayTitle(title: string): string {
  if (!isMostlyUppercase(title)) return title;
  return title
    .split(/(\s+)/)
    .map((part) => (/^\s+$/.test(part) ? part : capitalizeWord(part)))
    .join("");
}