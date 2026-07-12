"use client";

import { useRouter } from "next/navigation";
import { gstActPdfViewerSrc } from "@/lib/gst-act-pdf-viewer";
import type { GstActPdf } from "@/lib/gst-act-pdfs-types";
import type { TextDocumentWithSections } from "@/lib/db";
import { toLegislationDisplayTitle } from "@/lib/legislation-format";
import { formatDate } from "@/lib/format";

type Props = {
  actPdf: GstActPdf;
  documents: TextDocumentWithSections[];
  currentSlug: string;
  categoryLabel: string;
};

export default function ActPdfViewer({
  actPdf,
  documents,
  currentSlug,
  categoryLabel,
}: Props) {
  const router = useRouter();

  const handleDocumentChange = (slug: string) => {
    if (slug !== currentSlug) {
      router.push(`/acts/${slug}`);
    }
  };

  return (
    <div className="viewer-shell flex h-full flex-col">
      <div className="viewer-page-header shrink-0">
        <p className="section-label !text-brand-orange/90">{categoryLabel}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
          {toLegislationDisplayTitle(actPdf.title)}
        </h1>
      </div>

      <div className="filter-band flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 lg:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <label className="filter-label shrink-0" htmlFor="legislation-select">
            Act
          </label>
          <select
            id="legislation-select"
            value={currentSlug}
            onChange={(e) => handleDocumentChange(e.target.value)}
            className="filter-select min-w-[16rem] max-w-full flex-1"
          >
            {documents.map((doc) => (
              <option key={doc.slug} value={doc.slug}>
                {toLegislationDisplayTitle(doc.title)}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-[var(--muted)]">Full act PDF</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <div className="flex shrink-0 items-center gap-3 border-b border-brand-orange/30 bg-gradient-to-r from-brand-navy-deep to-brand-navy px-5 py-3 text-white">
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold tracking-tight">
              {toLegislationDisplayTitle(actPdf.title)}
            </p>
            {actPdf.source_url ? (
              <a
                href={actPdf.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-neutral-200 underline-offset-2 hover:underline"
              >
                Official source
              </a>
            ) : null}
          </div>
          {actPdf.act_no ? (
            <span className="shrink-0 text-sm font-semibold text-neutral-200">
              {actPdf.act_no}
            </span>
          ) : null}
          <span className="shrink-0 text-sm text-neutral-300">
            {formatDate(actPdf.assent_date)}
          </span>
        </div>

        <iframe
          key={actPdf.slug}
          src={gstActPdfViewerSrc(actPdf.slug)}
          className="min-h-0 flex-1 border-0 bg-white"
          style={{ width: "100%", height: "100%" }}
          title={actPdf.title}
        />
      </div>
    </div>
  );
}