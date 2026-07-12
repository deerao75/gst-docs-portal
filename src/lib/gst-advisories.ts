import { GST_ADVISORIES } from "@/lib/catalog-data";
import type {
  GstAdvisory,
  GstAdvisoryCatalog,
} from "@/lib/gst-advisories-types";

function readCatalog(): GstAdvisoryCatalog {
  return GST_ADVISORIES;
}

export function getGstAdvisories(): GstAdvisory[] {
  return readCatalog()
    .items.slice()
    .sort((a, b) => {
      const dateA = a.issued_date ?? "";
      const dateB = b.issued_date ?? "";
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      return b.id - a.id;
    });
}

export function getGstAdvisoryYears(): number[] {
  const years = getGstAdvisories()
    .map((item) => item.year)
    .filter((year): year is number => typeof year === "number");
  return Array.from(new Set(years)).sort((a, b) => b - a);
}

export function getGstAdvisoryModules(): string[] {
  const modules = getGstAdvisories().map((item) => item.module);
  return Array.from(new Set(modules)).sort((a, b) => a.localeCompare(b));
}

export function getGstAdvisoryCatalogMeta() {
  const catalog = readCatalog();
  return {
    source: catalog.source,
    updated_at: catalog.updated_at,
    count: catalog.count,
  };
}