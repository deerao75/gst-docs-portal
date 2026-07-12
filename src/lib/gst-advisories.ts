import type {
  GstAdvisory,
  GstAdvisoryCatalog,
} from "@/lib/gst-advisories-types";
import fs from "fs";
import path from "path";

function readCatalog(): GstAdvisoryCatalog {
  const filePath = path.join(process.cwd(), "data", "gst_advisories.json");
  if (!fs.existsSync(filePath)) {
    return {
      source: "https://www.gst.gov.in/newsandupdates",
      updated_at: "",
      count: 0,
      items: [],
    };
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as GstAdvisoryCatalog;
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