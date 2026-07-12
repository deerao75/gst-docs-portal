/** Format the list-column detail line for notifications. */
export function formatNotificationListDetail(
  text: string | null | undefined
): string {
  const raw = text?.trim();
  if (!raw) return "";

  if (/^notifies\b/i.test(raw)) {
    return raw;
  }

  let phrase = raw.replace(/\s+/g, " ");

  const rules: [RegExp, string][] = [
    [/^corrigendum\b/i, "correction of"],
    [/^amends\s+notification\s+no\.?\s*/i, "amendment to "],
    [/^amends\s+/i, "amendment to "],
    [/^extends?\s+(the\s+)?/i, "extension of "],
    [/^provides?\s+/i, ""],
    [/^delegates?\s+/i, "delegation of "],
    [/^exempts?\s+/i, "exemption of "],
    [/^replaces?\s+/i, "substitution — "],
    [/^waives?\s+/i, "waiver of "],
  ];

  for (const [pat, repl] of rules) {
    if (pat.test(phrase)) {
      phrase = phrase.replace(pat, repl);
      break;
    }
  }

  phrase = phrase.charAt(0).toLowerCase() + phrase.slice(1);
  return `Notifies ${phrase.replace(/\.$/, "")}.`;
}