"use client";

import { useEffect, useMemo, useState } from "react";
import type { PdfDocument } from "@/lib/db";
import { formatDate, formatTableDate } from "@/lib/format";
import {
  CIRCULAR_CATEGORIES,
  DEFAULT_CIRCULAR_CATEGORY,
} from "@/lib/circular-categories";
import {
  DEFAULT_NOTIFICATION_CATEGORY,
  NOTIFICATION_CATEGORIES,
} from "@/lib/notification-categories";
import {
  DEFAULT_ORDER_CATEGORY,
  ORDER_CATEGORIES,
} from "@/lib/order-categories";
import { pdfViewerSrc } from "@/lib/pdf-viewer";
import DocumentSummaryModal from "@/components/DocumentSummaryModal";
import {
  NotificationAmendedButton,
  NotificationAmendmentModal,
} from "@/components/NotificationAmendmentPanel";
import {
  getAmendedBy,
  hasAmendmentHistory,
} from "@/lib/document-legal-status-types";
import { formatNotificationListDetail } from "@/lib/notification-list-detail";
import { sortCirculars } from "@/lib/circular-sort";
import { sortNotifications } from "@/lib/notification-sort";
import { sortOrders } from "@/lib/order-sort";


/* PDF viewer: native browser embed via /api/pdf-view — zoom, pages, download, print. */

type Props = {
  documents: PdfDocument[];
  years: number[];
  initialType?: string;
  initialYear?: number | "all";
  initialCategory?: string;
  initialDocId?: number;
};

const PAGE_SIZE = 20;

function getVisiblePages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]);
  }
  return result;
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = getVisiblePages(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-[var(--border)] bg-brand-cream/30 px-4 py-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium shadow-sm disabled:opacity-40 hover:border-brand-orange hover:text-brand-orange-dark"
      >
        Prev
      </button>
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-sm text-[var(--muted)]">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-[2.5rem] rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors ${
              page === p
                ? "border-brand-orange bg-brand-orange text-white shadow-sm"
                : "border-[var(--border)] bg-white shadow-sm hover:border-brand-orange hover:text-brand-orange-dark"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium shadow-sm disabled:opacity-40 hover:border-brand-orange hover:text-brand-orange-dark"
      >
        Next
      </button>
    </div>
  );
}

const REGULATION_TYPES = [
  { value: "notification", label: "Notifications" },
  { value: "circular", label: "Circulars" },
  { value: "order", label: "Orders" },
  { value: "instruction", label: "Instructions" },
  { value: "advisory", label: "Advisory" },
];

const REGULATION_ORDER = [
  "CGST",
  "IGST",
  "UTGST",
  "Compensation Cess",
  "Other",
] as const;

const REGULATION_OPTIONS = [
  { value: "all", label: "All Regulations" },
  { value: "CGST", label: "CGST (Central Tax)" },
  { value: "IGST", label: "IGST (Integrated Tax)" },
  { value: "UTGST", label: "UTGST (Union Territory Tax)" },
  { value: "Compensation Cess", label: "Compensation Cess" },
  { value: "Other", label: "Other" },
];

const VALID_TYPES = new Set([
  ...REGULATION_TYPES.map((t) => t.value),
  "all",
]);
const ACT_WISE_TYPES = new Set(["notification", "circular", "order"]);
const REGULATION_FILTER_TYPES = new Set([
  "notification",
  "circular",
  "order",
  "instruction",
]);

function sortByLatestDate(docs: PdfDocument[]) {
  return [...docs].sort((a, b) =>
    (b.issued_date ?? "").localeCompare(a.issued_date ?? "")
  );
}

function sortDocumentsForView(docs: PdfDocument[], typeFilter: string) {
  if (typeFilter === "notification") {
    return sortNotifications(docs);
  }
  if (typeFilter === "circular") {
    return sortCirculars(docs);
  }
  if (typeFilter === "order") {
    return sortOrders(docs);
  }
  return sortByLatestDate(docs);
}

function DocumentTable({
  docs,
  selectedId,
  onSelect,
  numberLabel,
  emptyDetails,
  showSummaryButton,
  onShowSummary,
  showAmendedButton,
  activeAmendedId,
  onShowAmended,
  formatListDetail,
}: {
  docs: PdfDocument[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  numberLabel: string;
  emptyDetails: string;
  showSummaryButton?: boolean;
  onShowSummary?: (doc: PdfDocument) => void;
  showAmendedButton?: boolean;
  activeAmendedId?: number | null;
  onShowAmended?: (doc: PdfDocument) => void;
  formatListDetail?: (text: string) => string;
}) {
  return (
    <table className="doc-list-table w-full min-w-[18rem] table-fixed border-collapse text-[0.875rem]">
      <colgroup>
        <col className="w-[30%]" />
        <col className="w-[40%]" />
        <col className="w-[30%]" />
      </colgroup>
      <thead className="sticky top-0 z-10">
        <tr className="bg-gradient-to-r from-brand-navy-deep to-brand-navy text-white">
          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
            {numberLabel}
          </th>
          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
            Details
          </th>
          <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider">
            Date
          </th>
        </tr>
      </thead>
      <tbody>
        {docs.map((doc) => {
          const rawDetails =
            doc.summary_short?.trim() ||
            doc.title?.trim() ||
            emptyDetails;
          const details = formatListDetail
            ? formatListDetail(rawDetails)
            : rawDetails;
          const active = selectedId === doc.id;

          return (
            <tr
              key={doc.id}
              onClick={() => onSelect(doc.id)}
              className={`cursor-pointer border-b border-neutral-200 transition-colors hover:bg-brand-orange-light ${
                active ? "bg-brand-orange-light" : "bg-white"
              } ${doc.is_corrigendum ? "bg-neutral-50" : ""}`}
            >
              <td
                className={`px-3 py-2.5 align-top font-semibold leading-snug text-black ${
                  active ? "border-l-4 border-l-brand-orange bg-brand-orange-light" : "border-l-4 border-l-transparent"
                }`}
              >
                <span className="block break-words">{doc.notification_no}</span>
                {doc.is_corrigendum && (
                  <span className="mt-0.5 block text-xs font-medium text-brand-orange-dark">
                    Corrigendum
                  </span>
                )}
              </td>
              <td className="doc-list-details px-3 py-2.5 align-top text-black">
                <span className="block break-words leading-snug">{details}</span>
                {(showSummaryButton || showAmendedButton) && (
                  <div className="mt-2">
                    <div className="flex flex-nowrap items-center gap-2">
                      {showSummaryButton && onShowSummary && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShowSummary(doc);
                          }}
                          className="pill-btn pill-btn-orange shrink-0"
                        >
                          Show Summary
                        </button>
                      )}
                      {showAmendedButton &&
                        hasAmendmentHistory(doc.legal_status) &&
                        onShowAmended && (
                          <NotificationAmendedButton
                            active={activeAmendedId === doc.id}
                            onToggle={() => onShowAmended(doc)}
                          />
                        )}
                    </div>
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right align-top text-sm text-[var(--muted)]">
                {formatTableDate(doc.issued_date)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function getDocumentRegulation(doc: PdfDocument): string {
  const no = doc.notification_no?.toLowerCase() ?? "";
  if (no.includes("central tax")) return "CGST";
  if (no.includes("integrated tax")) return "IGST";
  if (no.includes("union territory tax") || no.includes("ut tax")) {
    return "UTGST";
  }
  if (no.includes("compensation cess")) return "Compensation Cess";

  const fn = doc.file_name.toLowerCase();
  if (fn.includes("-ct-") || fn.includes("-ct.")) return "CGST";
  if (fn.includes("-it-") || fn.includes("-it.")) return "IGST";
  if (fn.includes("-ut-") || fn.includes("-ut.")) return "UTGST";
  if (fn.includes("-cess-") || fn.includes("-cess.")) return "Compensation Cess";

  return "Other";
}

const ORDER_CATEGORY_ALIASES: Record<string, string[]> = {
  gst: ["gst", "central_tax", "central_tax_rate"],
};

function orderMatchesCategory(doc: PdfDocument, categoryFilter: string): boolean {
  if (categoryFilter === "all") return true;
  const aliases = ORDER_CATEGORY_ALIASES[categoryFilter];
  if (aliases) return aliases.includes(doc.category ?? "");
  return doc.category === categoryFilter;
}

function filterDocuments(
  documents: PdfDocument[],
  typeFilter: string,
  yearFilter: number | "all",
  regulationFilter: string,
  categoryFilter: string
) {
  return documents.filter((d) => {
    if (typeFilter !== "all" && d.doc_type !== typeFilter) return false;
    if (yearFilter !== "all" && d.year !== yearFilter) return false;
    if (ACT_WISE_TYPES.has(typeFilter) && categoryFilter !== "all") {
      const matchesCategory =
        typeFilter === "order"
          ? orderMatchesCategory(d, categoryFilter)
          : d.category === categoryFilter;
      if (!matchesCategory) return false;
    }
    if (
      regulationFilter !== "all" &&
      !ACT_WISE_TYPES.has(typeFilter) &&
      REGULATION_FILTER_TYPES.has(typeFilter) &&
      getDocumentRegulation(d) !== regulationFilter
    ) {
      return false;
    }
    return true;
  });
}

export default function DocumentsViewer({
  documents,
  years,
  initialType = "all",
  initialYear = "all",
  initialCategory = DEFAULT_NOTIFICATION_CATEGORY,
  initialDocId,
}: Props) {
  const defaultType = VALID_TYPES.has(initialType) ? initialType : "notification";
  const [typeFilter, setTypeFilter] = useState(defaultType);
  const [yearFilter, setYearFilter] = useState<number | "all">(initialYear);
  const [categoryFilter, setCategoryFilter] = useState(() => {
    if (defaultType === "notification") return initialCategory;
    if (defaultType === "circular") {
      return initialCategory !== "all" ? initialCategory : DEFAULT_CIRCULAR_CATEGORY;
    }
    if (defaultType === "order") {
      return initialCategory !== "all" ? initialCategory : DEFAULT_ORDER_CATEGORY;
    }
    return "all";
  });
  const [regulationFilter, setRegulationFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialDocId ?? null
  );
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryModalNo, setSummaryModalNo] = useState<string | null>(null);
  const [summaryModalType, setSummaryModalType] = useState<string | null>(null);
  const [summaryModalText, setSummaryModalText] = useState<string | null>(null);
  const [summaryModalLoading, setSummaryModalLoading] = useState(false);
  const [amendmentModalDoc, setAmendmentModalDoc] =
    useState<PdfDocument | null>(null);

  const handleShowDocumentSummary = async (doc: PdfDocument) => {
    setSummaryModalOpen(true);
    setSummaryModalNo(doc.notification_no);
    setSummaryModalType(doc.doc_type);
    const cached = doc.summary?.trim();
    if (cached) {
      setSummaryModalText(cached);
      setSummaryModalLoading(false);
      return;
    }
    setSummaryModalText(null);
    setSummaryModalLoading(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/summary`);
      if (res.ok) {
        const data = (await res.json()) as { summary?: string | null };
        setSummaryModalText(data.summary?.trim() || null);
      } else {
        setSummaryModalText(null);
      }
    } catch {
      setSummaryModalText(null);
    } finally {
      setSummaryModalLoading(false);
    }
  };

  const closeSummaryModal = () => {
    setSummaryModalOpen(false);
    setSummaryModalNo(null);
    setSummaryModalType(null);
    setSummaryModalText(null);
    setSummaryModalLoading(false);
  };

  const availableYears = useMemo(() => {
    let typeDocs =
      typeFilter === "all"
        ? documents
        : documents.filter((d) => d.doc_type === typeFilter);
    if (ACT_WISE_TYPES.has(typeFilter) && categoryFilter !== "all") {
      typeDocs = typeDocs.filter((d) =>
        typeFilter === "order"
          ? orderMatchesCategory(d, categoryFilter)
          : d.category === categoryFilter
      );
    }
    return Array.from(new Set(typeDocs.map((d) => d.year))).sort(
      (a, b) => b - a
    );
  }, [documents, typeFilter, categoryFilter]);

  useEffect(() => {
    setPage(1);
    setAmendmentModalDoc(null);
  }, [typeFilter, yearFilter, categoryFilter, regulationFilter]);

  useEffect(() => {
    if (
      initialDocId &&
      documents.some((doc) => doc.id === initialDocId)
    ) {
      setSelectedId(initialDocId);
    }
  }, [initialDocId, documents]);

  const handleShowAmendments = (doc: PdfDocument) => {
    setAmendmentModalDoc((prev) => (prev?.id === doc.id ? null : doc));
  };

  useEffect(() => {
    if (
      ACT_WISE_TYPES.has(typeFilter) &&
      yearFilter !== "all" &&
      availableYears.length > 0 &&
      !availableYears.includes(yearFilter)
    ) {
      setYearFilter(availableYears[0]);
    }
  }, [availableYears, categoryFilter, typeFilter, yearFilter]);

  const filtered = useMemo(
    () =>
      sortDocumentsForView(
        filterDocuments(
          documents,
          typeFilter,
          yearFilter,
          regulationFilter,
          categoryFilter
        ),
        typeFilter
      ),
    [documents, typeFilter, yearFilter, regulationFilter, categoryFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const useTablePagination = ACT_WISE_TYPES.has(typeFilter);
  const listDocs = useMemo(() => {
    if (!useTablePagination) return filtered;
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page, useTablePagination]);

  const effectiveSelectedId = useMemo(() => {
    if (selectedId !== null && documents.some((d) => d.id === selectedId)) {
      return selectedId;
    }
    if (selectedId !== null && filtered.some((d) => d.id === selectedId)) {
      return selectedId;
    }
    const visible = ACT_WISE_TYPES.has(typeFilter) ? listDocs : filtered;
    return visible[0]?.id ?? null;
  }, [filtered, listDocs, selectedId, documents, typeFilter]);

  const groupedByYear = useMemo(() => {
    const groups: Record<number, PdfDocument[]> = {};
    for (const doc of filtered) {
      if (!groups[doc.year]) groups[doc.year] = [];
      groups[doc.year].push(doc);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, docs]) => ({
        year: Number(year),
        docs: sortByLatestDate(docs),
      }));
  }, [filtered]);

  const useDocumentTable = ACT_WISE_TYPES.has(typeFilter);

  const selected =
    documents.find((d) => d.id === effectiveSelectedId) ?? null;

  const showCategoryFilter = ACT_WISE_TYPES.has(typeFilter);
  const categoryOptions =
    typeFilter === "circular"
      ? CIRCULAR_CATEGORIES
      : typeFilter === "order"
        ? ORDER_CATEGORIES
        : NOTIFICATION_CATEGORIES;
  const showRegulationFilter =
    REGULATION_FILTER_TYPES.has(typeFilter) && !ACT_WISE_TYPES.has(typeFilter);
  const tableNumberLabel =
    typeFilter === "circular"
      ? "Circular No."
      : typeFilter === "order"
        ? "Order No."
        : "Notf. No.";
  const tableEmptyDetails =
    typeFilter === "circular"
      ? "GST circular"
      : typeFilter === "order"
        ? "GST order"
        : "GST notification";

  const handleSelectPdf = (id: number) => {
    setSelectedId(id);
  };

  const handleOpenAmendingNotification = (id: number) => {
    setAmendmentModalDoc(null);
    handleSelectPdf(id);
  };

  const pageTitle =
    REGULATION_TYPES.find((t) => t.value === typeFilter)?.label ??
    "GST Documents";

  return (
    <div className="viewer-shell flex h-full flex-col">
      <div className="viewer-page-header shrink-0">
        <p className="section-label !text-brand-orange/90">GST regulations</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
          {pageTitle}
        </h1>
      </div>
      <div className="filter-band flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 lg:px-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <label className="filter-label">Regulation</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                const next = e.target.value;
                setTypeFilter(next);
                setRegulationFilter("all");
                if (next === "notification") {
                  setCategoryFilter(DEFAULT_NOTIFICATION_CATEGORY);
                } else if (next === "circular") {
                  setCategoryFilter(DEFAULT_CIRCULAR_CATEGORY);
                } else if (next === "order") {
                  setCategoryFilter(DEFAULT_ORDER_CATEGORY);
                } else {
                  setCategoryFilter("all");
                }
                setYearFilter("all");
              }}
              className="filter-select"
            >
              {REGULATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {showCategoryFilter && (
            <div className="flex items-center gap-3">
              <label className="filter-label">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="filter-select"
              >
                {categoryOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-3">
            <label className="filter-label">Year</label>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                );
              }}
              className="filter-select"
            >
              <option value="all">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {showRegulationFilter && (
            <div className="flex items-center gap-3">
              <label className="filter-label">Regulation</label>
              <select
                value={regulationFilter}
                onChange={(e) => setRegulationFilter(e.target.value)}
                className="filter-select"
              >
                {REGULATION_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 ${
          useDocumentTable ? "viewer-grid-wide-list" : "viewer-grid"
        }`}
      >
        <div className="flex min-h-0 min-w-0 flex-col border-b border-[var(--border)] lg:h-full lg:border-b-0 lg:border-r">
          <div
            className={`summary-panel min-h-0 flex-1 overflow-x-auto overflow-y-auto ${
              useDocumentTable ? "max-h-[42vh] lg:max-h-none" : "max-h-[38vh] lg:max-h-none"
            }`}
          >
            {filtered.length === 0 ? (
              <p className="p-5 text-base text-[var(--muted)]">
                No documents found.
              </p>
            ) : useDocumentTable ? (
              <>
                <DocumentTable
                  docs={listDocs}
                  selectedId={effectiveSelectedId}
                  onSelect={handleSelectPdf}
                  numberLabel={tableNumberLabel}
                  emptyDetails={tableEmptyDetails}
                  showSummaryButton={ACT_WISE_TYPES.has(typeFilter)}
                  onShowSummary={handleShowDocumentSummary}
                  showAmendedButton={typeFilter === "notification"}
                  activeAmendedId={amendmentModalDoc?.id ?? null}
                  onShowAmended={handleShowAmendments}
                  formatListDetail={
                    typeFilter === "notification"
                      ? formatNotificationListDetail
                      : undefined
                  }
                />
                {totalPages > 1 && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                )}
              </>
            ) : (
              groupedByYear.map(({ year, docs }) => (
                <div key={year}>
                  <div className="list-group-header">{year}</div>
                  <ul>
                    {docs.map((doc) => (
                      <li key={doc.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectPdf(doc.id)}
                          className={`w-full border-b border-[var(--border)] px-4 py-3.5 text-left transition-colors hover:bg-brand-orange-light ${
                            effectiveSelectedId === doc.id
                              ? "border-l-4 border-l-brand-orange bg-brand-orange-light"
                              : "border-l-4 border-l-transparent"
                          }`}
                        >
                          <p className="text-base font-semibold text-black">
                            {doc.notification_no}
                          </p>
                          <p className="mt-1 line-clamp-2 text-base leading-snug text-black">
                            {doc.title}
                          </p>
                          <p className="mt-1.5 text-sm text-[var(--muted)]">
                            {formatDate(doc.issued_date)}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col bg-white">
          <div className="flex min-h-[50vh] flex-1 flex-col overflow-hidden lg:min-h-0">
            {selected ? (
              <>
                <div className="flex shrink-0 items-center gap-3 border-b border-brand-orange/30 bg-gradient-to-r from-brand-navy-deep to-brand-navy px-5 py-3 text-white">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold tracking-tight">
                      {selected.notification_no}
                    </p>
                    <p className="truncate text-sm text-neutral-200">
                      {selected.summary_short || selected.title}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-neutral-300">
                    {formatDate(selected.issued_date)}
                  </span>
                </div>

                <iframe
                  key={selected.id}
                  src={pdfViewerSrc(selected.id)}
                  className="min-h-0 flex-1 border-0 bg-white"
                  style={{ width: "100%", height: "100%" }}
                  title={
                    REGULATION_TYPES.find((t) => t.value === selected.doc_type)
                      ?.label ?? selected.title
                  }
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-base text-[var(--muted)]">
                —
              </div>
            )}
          </div>
        </div>
      </div>

      <DocumentSummaryModal
        open={summaryModalOpen}
        documentNo={summaryModalNo}
        docType={summaryModalType}
        summary={summaryModalText}
        loading={summaryModalLoading}
        onClose={closeSummaryModal}
      />

      <NotificationAmendmentModal
        open={amendmentModalDoc !== null}
        notificationNo={amendmentModalDoc?.notification_no ?? null}
        amendments={
          amendmentModalDoc
            ? getAmendedBy(amendmentModalDoc.legal_status)
            : []
        }
        onOpenNotification={handleOpenAmendingNotification}
        onClose={() => setAmendmentModalDoc(null)}
      />

    </div>
  );
}