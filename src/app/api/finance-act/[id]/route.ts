import { getFinanceActById } from "@/lib/finance-acts";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const act = getFinanceActById(id);
  if (!act) {
    return NextResponse.json({ error: "Finance Act not found" }, { status: 404 });
  }

  let filePath = path.normalize(act.file_path.replace(/\\/g, "/"));
  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }

  const allowedRoot = path.normalize(path.join(process.cwd(), "data", "finance_acts"));
  if (!filePath.startsWith(allowedRoot)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const raw = fs.readFileSync(filePath);
  const buffer = setPdfInitialZoom(setPdfTitle(raw, act.title));
  const download = request.nextUrl.searchParams.get("download") === "1";
  const safeName = act.slug.replace(/[^\w.-]+/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": download
        ? `attachment; filename="${safeName}.pdf"`
        : `inline; filename="${safeName}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

function escapePdfString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function setPdfTitle(buffer: Buffer, title: string): Buffer {
  const content = buffer.toString("latin1");
  const escaped = escapePdfString(title);
  const replacement = `/Title (${escaped})`;

  if (/\/Title\s*\([^)]*\)/.test(content)) {
    return Buffer.from(
      content.replace(/\/Title\s*\([^)]*\)/, replacement),
      "latin1"
    );
  }

  if (/\/Title\s*<[^>]+>/.test(content)) {
    return Buffer.from(
      content.replace(/\/Title\s*<[^>]+>/, replacement),
      "latin1"
    );
  }

  return buffer;
}

function setPdfInitialZoom(buffer: Buffer): Buffer {
  let content = buffer.toString("latin1");
  content = content.replace(/ ?\/OpenAction <<[^>]*>>/g, "");

  const catalogIdx = content.search(/\/Type\s*\/Catalog/);
  if (catalogIdx === -1) {
    return buffer;
  }

  const dictEnd = content.indexOf(">>", catalogIdx);
  if (dictEnd === -1) {
    return buffer;
  }

  const openAction =
    " /OpenAction << /Type /Action /S /GoTo /D [0 /XYZ null null 1.0] >>";
  const updated =
    content.slice(0, dictEnd) + openAction + content.slice(dictEnd);

  return Buffer.from(updated, "latin1");
}