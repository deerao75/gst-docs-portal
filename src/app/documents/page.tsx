import DocumentsViewer from "@/components/DocumentsViewer";
import GstAdvisoriesViewer from "@/components/GstAdvisoriesViewer";
import { DEFAULT_CIRCULAR_CATEGORY } from "@/lib/circular-categories";
import { DEFAULT_NOTIFICATION_CATEGORY } from "@/lib/notification-categories";
import { DEFAULT_ORDER_CATEGORY } from "@/lib/order-categories";
import { getPdfDocuments, getPdfYears } from "@/lib/db";
import {
  getGstAdvisories,
  getGstAdvisoryCatalogMeta,
  getGstAdvisoryModules,
  getGstAdvisoryYears,
} from "@/lib/gst-advisories";
import { Suspense } from "react";

export default function DocumentsPage({
  searchParams,
}: {
  searchParams: { type?: string; year?: string; category?: string; id?: string };
}) {
  const initialType = searchParams.type || "notification";

  if (initialType === "advisory") {
    const advisories = getGstAdvisories();
    const years = getGstAdvisoryYears();
    const modules = getGstAdvisoryModules();
    const meta = getGstAdvisoryCatalogMeta();
    const initialId = Number(searchParams.id);
    const linkedAdvisory =
      Number.isFinite(initialId) && initialId > 0
        ? advisories.find((item) => item.id === initialId)
        : undefined;
    const initialYear =
      searchParams.year !== undefined
        ? searchParams.year === "all"
          ? "all"
          : Number(searchParams.year)
        : linkedAdvisory?.year ?? years[0] ?? "all";

    return (
      <div className="mx-auto flex h-[calc(100svh-5.5rem)] max-w-[100rem] flex-col px-4 py-4 lg:px-6">
        <Suspense fallback={<p className="p-6 text-[var(--muted)]">Loading…</p>}>
          <GstAdvisoriesViewer
            advisories={advisories}
            years={years}
            modules={modules}
            catalogUpdatedAt={meta.updated_at || undefined}
            initialYear={initialYear}
            initialId={linkedAdvisory?.id}
          />
        </Suspense>
      </div>
    );
  }

  const initialCategory =
    searchParams.category ||
    (initialType === "notification"
      ? DEFAULT_NOTIFICATION_CATEGORY
      : initialType === "circular"
        ? DEFAULT_CIRCULAR_CATEGORY
        : initialType === "order"
          ? DEFAULT_ORDER_CATEGORY
          : "all");

  const years =
    initialType === "notification" ||
    initialType === "circular" ||
    initialType === "order"
      ? getPdfYears(initialType, initialCategory)
      : initialType !== "all"
        ? getPdfYears(initialType)
        : getPdfYears();

  const latestYear = years[0];
  const initialYear =
    searchParams.year !== undefined
      ? searchParams.year === "all"
        ? "all"
        : Number(searchParams.year)
      : initialType !== "all" && latestYear !== undefined
        ? latestYear
        : "all";

  const documents = getPdfDocuments();
  const initialDocId = Number(searchParams.id);
  const linkedDocument =
    Number.isFinite(initialDocId) && initialDocId > 0
      ? documents.find((doc) => doc.id === initialDocId)
      : undefined;

  return (
    <div className="mx-auto flex h-[calc(100svh-5.5rem)] max-w-[100rem] flex-col px-4 py-4 lg:px-6">
      <DocumentsViewer
        documents={documents}
        years={years}
        initialType={linkedDocument?.doc_type ?? initialType}
        initialYear={linkedDocument?.year ?? initialYear}
        initialCategory={linkedDocument?.category ?? initialCategory}
        initialDocId={linkedDocument?.id}
      />
    </div>
  );
}