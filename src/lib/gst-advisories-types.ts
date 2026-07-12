export type GstAdvisory = {
  id: number;
  source_id: number;
  title: string;
  module: string;
  issued_date: string | null;
  year: number | null;
  content_html: string;
  pdf_urls: string[];
  is_external: boolean;
  external_url: string | null;
  source_url: string;
};

export type GstAdvisoryCatalog = {
  source: string;
  updated_at: string;
  count: number;
  items: GstAdvisory[];
};