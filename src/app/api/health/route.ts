import {
  FINANCE_ACTS,
  GST_ADVISORIES,
  PDF_DOCUMENTS,
  TEXT_DOCUMENTS,
  TEXT_SECTIONS,
} from "@/lib/catalog-data";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalogs = {
    pdf_documents: PDF_DOCUMENTS.length,
    text_documents: TEXT_DOCUMENTS.length,
    text_sections: TEXT_SECTIONS.length,
    finance_acts: FINANCE_ACTS.length,
    gst_advisories: GST_ADVISORIES.items.length,
  };

  const ok = Object.values(catalogs).every((count) => count > 0);

  return NextResponse.json(
    {
      ok,
      vercel: process.env.VERCEL === "1",
      nodeEnv: process.env.NODE_ENV,
      catalogs,
      dataSource: "build-time-json-imports",
    },
    { status: ok ? 200 : 503 }
  );
}