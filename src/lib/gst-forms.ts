import { GST_FORMS } from "@/lib/catalog-data";
import type { GstForm } from "@/lib/gst-forms-types";

function readCatalog(): GstForm[] {
  return GST_FORMS;
}

function normalizeFormCode(code: string): string {
  if (/^R-\d/i.test(code)) {
    return `GSTR${code.slice(1)}`;
  }
  return code;
}

function normalizeFormTitle(form: GstForm): GstForm {
  const code = normalizeFormCode(form.code);
  const title = code.startsWith("GSTR") ? `FORM ${code}` : `FORM GST ${code}`;
  return { ...form, code, title };
}

export function getGstForms(): GstForm[] {
  return readCatalog()
    .filter((form) => form.status === "ready")
    .map(normalizeFormTitle)
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

function slugAliases(slug: string): string[] {
  const aliases = new Set<string>([slug]);
  const gstrMatch = /^gstr-(.+)$/i.exec(slug);
  if (gstrMatch) {
    aliases.add(`gst-r-${gstrMatch[1].toLowerCase()}`);
  }
  const legacyMatch = /^gst-r-(.+)$/i.exec(slug);
  if (legacyMatch) {
    aliases.add(`gstr-${legacyMatch[1].toLowerCase()}`);
  }
  return [...aliases];
}

export function getGstFormBySlug(slug: string): GstForm | undefined {
  const aliases = slugAliases(slug);
  return getGstForms().find((form) => aliases.includes(form.slug));
}