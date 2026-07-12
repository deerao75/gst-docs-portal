import TextSectionViewer from "@/components/TextSectionViewer";
import { getTextDocumentsWithSections } from "@/lib/db";
import { getLegislationViewerExtras } from "@/lib/legislation-viewer-data";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default function RuleDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const documents = getTextDocumentsWithSections("rule");
  const acts = getTextDocumentsWithSections("act");
  const doc = documents.find((d) => d.slug === params.slug);
  if (!doc) notFound();

  const { sectionCrossLinks, sourceLinkIndex } = getLegislationViewerExtras({
    category: "rule",
    slug: params.slug,
    acts,
    rules: documents,
  });

  return (
    <div className="mx-auto flex h-[calc(100svh-5.5rem)] max-w-[100rem] flex-col px-4 py-4 lg:px-6">
      <Suspense fallback={<p className="p-6 text-[var(--muted)]">Loading…</p>}>
        <TextSectionViewer
          category="rule"
          categoryLabel="GST Rules"
          documents={documents}
          currentSlug={params.slug}
          sectionCrossLinks={sectionCrossLinks}
          sourceLinkIndex={sourceLinkIndex}
        />
      </Suspense>
    </div>
  );
}