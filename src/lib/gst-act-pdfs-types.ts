export type GstActPdf = {
  id: number;
  slug: string;
  title: string;
  year: number;
  act_no: string | null;
  file_name: string;
  file_path: string;
  file_hash: string;
  source_url: string;
  source_label: string;
  assent_date: string | null;
  status: string;
  updated_at: string;
};