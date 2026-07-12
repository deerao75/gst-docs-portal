import fs from "fs";
import path from "path";

export type FinanceAct = {
  id: number;
  year: number;
  title: string;
  slug: string;
  file_name: string;
  file_path: string;
  file_hash: string;
  source_url: string;
  source_label: string;
  assent_date: string | null;
  status: string;
  updated_at: string;
};

function readCatalog(): FinanceAct[] {
  const filePath = path.join(process.cwd(), "data", "finance_acts.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as FinanceAct[];
}

export function getFinanceActs(): FinanceAct[] {
  return readCatalog()
    .filter((act) => act.status === "ready")
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      // Within the same year, later enactments (e.g. Finance No. 2) appear first.
      if (a.title.includes("(No. 2)") && !b.title.includes("(No. 2)")) return -1;
      if (b.title.includes("(No. 2)") && !a.title.includes("(No. 2)")) return 1;
      return b.id - a.id;
    });
}

export function getFinanceActById(id: number): FinanceAct | undefined {
  return getFinanceActs().find((a) => a.id === id);
}