import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const cwd = process.cwd();
  const checks = [
    "data/pdf_documents.json",
    "data/text_sections.json",
    "data/text_documents.json",
    "data/finance_acts.json",
    "data/gst_advisories.json",
  ];

  const files: Record<string, boolean> = {};
  for (const rel of checks) {
    files[rel] = fs.existsSync(path.join(cwd, rel));
  }

  const ok = Object.values(files).every(Boolean);

  return NextResponse.json(
    {
      ok,
      cwd,
      vercel: process.env.VERCEL === "1",
      nodeEnv: process.env.NODE_ENV,
      files,
    },
    { status: ok ? 200 : 503 }
  );
}