"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LegislationCrossLinks from "@/components/LegislationCrossLinks";
import LegislationSectionContent from "@/components/LegislationSectionContent";
import type { TextDocumentWithSections } from "@/lib/db";
import { toLegislationDisplayTitle } from "@/lib/legislation-format";
import type { ResolvedLegislationLink } from "@/lib/legislation-cross-links-types";
import type { LegislationSourceIndex } from "@/lib/legislation-source-links-types";

type Props = {
  category: "act" | "rule";
  categoryLabel: string;
  documents: TextDocumentWithSections[];
  currentSlug: string;
  sectionCrossLinks?: Record<string, ResolvedLegislationLink[]>;
  sourceLinkIndex?: LegislationSourceIndex;
};

function sectionLabel(category: "act" | "rule") {
  return category === "act" ? "Section" : "Rule";
}

function sectionGist(title: string, maxLen = 72): string {
  const text = title.trim();
  if (text.length <= maxLen) return text;
  const idx = text.lastIndexOf(" ", maxLen - 3);
  return (idx > 20 ? text.slice(0, idx) : text.slice(0, maxLen - 3)) + "...";
}

export default function TextSectionViewer({
  category,
  categoryLabel,
  documents,
  currentSlug,
  sectionCrossLinks = {},
  sourceLinkIndex,
}: Props) {
  const router = useRouter();
  const urlParams = useSearchParams();
  const unit = sectionLabel(category);

  const currentDoc = useMemo(
    () => documents.find((d) => d.slug === currentSlug) ?? documents[0],
    [documents, currentSlug]
  );

  const documentSections = currentDoc?.sections ?? [];
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  useEffect(() => {
    const fromUrl = Number(urlParams.get("sectionId"));
    const urlSection =
      Number.isFinite(fromUrl) && fromUrl > 0
        ? documentSections.find((s) => s.id === fromUrl)
        : undefined;
    setSelectedDocId(urlSection?.id ?? documentSections[0]?.id ?? null);
  }, [currentSlug, documentSections, urlParams]);

  const selectedDocSection = useMemo(
    () => documentSections.find((s) => s.id === selectedDocId) ?? null,
    [documentSections, selectedDocId]
  );

  const selectedCrossLinks = useMemo(() => {
    if (!selectedDocSection) return [];
    return sectionCrossLinks[selectedDocSection.section_number] ?? [];
  }, [sectionCrossLinks, selectedDocSection]);

  const handleDocumentChange = (slug: string) => {
    if (slug !== currentSlug) {
      router.push(`/${category}s/${slug}`);
    }
  };

  if (!currentDoc) {
    return (
      <p className="p-6 text-base text-[var(--muted)]">No document available.</p>
    );
  }

  const pageHeading = toLegislationDisplayTitle(currentDoc.title);
  const listCount = documentSections.length;

  return (
    <div className="viewer-shell flex h-full flex-col">
      <div className="viewer-page-header shrink-0">
        <p className="section-label !text-brand-orange/90">{categoryLabel}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
          {pageHeading}
        </h1>
      </div>

      <div className="filter-band flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 lg:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <label className="filter-label shrink-0" htmlFor="legislation-select">
            {category === "act" ? "Act" : "Rules"}
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
        <p className="text-sm text-[var(--muted)]">
          {listCount} {unit.toLowerCase()}
          {listCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="viewer-grid-wide-list min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-col border-b border-[var(--border)] lg:h-full lg:border-b-0 lg:border-r">
          <div className="summary-panel min-h-0 flex-1 overflow-y-auto max-h-[42vh] lg:max-h-none">
            {listCount === 0 ? (
              <p className="p-5 text-base text-[var(--muted)]">No sections found.</p>
            ) : (
              <table className="doc-list-table w-full min-w-[18rem] table-fixed border-collapse text-[0.875rem]">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[76%]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-brand-navy-deep to-brand-navy text-white">
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      {unit}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Subject
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documentSections.map((section) => {
                    const active = selectedDocId === section.id;
                    return (
                      <tr
                        key={section.id}
                        onClick={() => setSelectedDocId(section.id)}
                        className={`cursor-pointer border-b border-neutral-200 transition-colors hover:bg-brand-orange-light ${
                          active ? "bg-brand-orange-light" : "bg-white"
                        }`}
                      >
                        <td
                          className={`px-3 py-2.5 align-top font-semibold leading-snug text-black ${
                            active
                              ? "border-l-4 border-l-brand-orange bg-brand-orange-light"
                              : "border-l-4 border-l-transparent"
                          }`}
                        >
                          {section.section_number}
                        </td>
                        <td className="doc-list-details px-3 py-2.5 align-top text-black">
                          <span className="block break-words leading-snug">
                            {sectionGist(section.section_title)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col bg-white">
          <div className="flex min-h-[50vh] flex-1 flex-col overflow-hidden lg:min-h-0">
            {selectedDocSection ? (
              <>
                <div className="flex shrink-0 items-start gap-3 border-b border-brand-orange/30 bg-gradient-to-r from-brand-navy-deep to-brand-navy px-5 py-3 text-white">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold tracking-tight">
                      {unit} {selectedDocSection.section_number}
                    </p>
                    <p className="text-base text-neutral-100 line-clamp-2">
                      {selectedDocSection.section_title}
                    </p>
                  </div>
                  <LegislationCrossLinks
                    links={selectedCrossLinks}
                    heading={
                      category === "act" ? "Related rules" : "Related sections"
                    }
                  />
                </div>
                <div className="summary-panel min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  <LegislationSectionContent
                    content={selectedDocSection.content}
                    sourceLinkIndex={sourceLinkIndex}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-base text-[var(--muted)]">
                Select a {unit.toLowerCase()} from the list to view its text.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}