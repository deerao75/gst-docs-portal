import { FINANCE_ACTS } from "@/lib/catalog-data";

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
  return FINANCE_ACTS;
}

export function getFinanceActs(): FinanceAct[] {
  return readCatalog()
    .filter((act) => act.status === "ready")
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (a.title.includes("(No. 2)") && !b.title.includes("(No. 2)")) return -1;
      if (b.title.includes("(No. 2)") && !a.title.includes("(No. 2)")) return 1;
      return b.id - a.id;
    });
}

export function getFinanceActById(id: number): FinanceAct | undefined {
  return getFinanceActs().find((a) => a.id === id);
}