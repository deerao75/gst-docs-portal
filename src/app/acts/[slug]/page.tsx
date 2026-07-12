import ActPdfViewer from "@/components/ActPdfViewer";
import TextSectionViewer from "@/components/TextSectionViewer";
import { getTextDocumentsWithSections } from "@/lib/db";
import { getGstActPdfBySlug } from "@/lib/gst-act-pdfs";
import { getLegislationViewerExtras } from "@/lib/legislation-viewer-data";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default function ActDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const documents = getTextDocumentsWithSections("act");
  const rules = getTextDocumentsWithSections("rule");
  const doc = documents.find((d) => d.slug === params.slug);
  if (!doc) notFound();

  const actPdf = getGstActPdfBySlug(params.slug);
  const isPdfOnly = Boolean(actPdf && doc.sections.length === 0);

  const { sectionCrossLinks, sourceLinkIndex } = getLegislationViewerExtras({
    category: "act",
    slug: params.slug,
    acts: documents,
    rules,
  });

  return (
    <div className="mx-auto flex h-[calc(100svh-5.5rem)] max-w-[100rem] flex-col px-4 py-4 lg:px-6">
      <Suspense fallback={<p className="p-6 text-[var(--muted)]">Loading…</p>}>
        {isPdfOnly && actPdf ? (
          <ActPdfViewer
            actPdf={actPdf}
            documents={documents}
            currentSlug={params.slug}
            categoryLabel="GST Acts"
          />
        ) : (
          <TextSectionViewer
            category="act"
            categoryLabel="GST Acts"
            documents={documents}
            currentSlug={params.slug}
            sectionCrossLinks={sectionCrossLinks}
            sourceLinkIndex={sourceLinkIndex}
          />
        )}
      </Suspense>
    </div>
  );
}