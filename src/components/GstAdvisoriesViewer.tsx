"use client";

import GstAdvisoryContent from "@/components/GstAdvisoryContent";
import { formatDate, formatTableDate } from "@/lib/format";
import type { GstAdvisory } from "@/lib/gst-advisories-types";
import { useEffect, useMemo, useState } from "react";

type Props = {
  advisories: GstAdvisory[];
  years: number[];
  modules: string[];
  catalogUpdatedAt?: string;
  initialYear?: number | "all";
  initialModule?: string;
  initialId?: number;
};

const PAGE_SIZE = 20;

function getVisiblePages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
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

export default function GstAdvisoriesViewer({
  advisories,
  years,
  modules,
  catalogUpdatedAt,
  initialYear = "all",
  initialModule = "all",
  initialId,
}: Props) {
  const [yearFilter, setYearFilter] = useState<number | "all">(initialYear);
  const [moduleFilter, setModuleFilter] = useState(initialModule);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(initialId ?? null);

  const filtered = useMemo(() => {
    return advisories.filter((item) => {
      if (yearFilter !== "all" && item.year !== yearFilter) return false;
      if (moduleFilter !== "all" && item.module !== moduleFilter) return false;
      return true;
    });
  }, [advisories, yearFilter, moduleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [yearFilter, moduleFilter]);

  useEffect(() => {
    if (selectedId && filtered.some((item) => item.id === selectedId)) return;
    setSelectedId(pageItems[0]?.id ?? filtered[0]?.id ?? null);
  }, [filtered, pageItems, selectedId]);

  useEffect(() => {
    if (initialId && advisories.some((item) => item.id === initialId)) {
      setSelectedId(initialId);
    }
  }, [initialId, advisories]);

  const selected =
    advisories.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="viewer-shell flex h-full flex-col">
      <div className="viewer-page-header shrink-0">
        <p className="section-label !text-brand-orange/90">GST regulations</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
          Advisory
        </h1>
      </div>

      <div className="filter-band flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 lg:px-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <label className="filter-label">Year</label>
            <select
              value={yearFilter}
              onChange={(e) =>
                setYearFilter(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
              className="filter-select"
            >
              <option value="all">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="filter-label">Module</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Modules</option>
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-[var(--muted)]">
          {filtered.length} advisories
          {catalogUpdatedAt ? ` · synced ${catalogUpdatedAt}` : ""}
        </p>
      </div>

      <div className="viewer-grid-wide-list min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-col border-b border-[var(--border)] lg:h-full lg:border-b-0 lg:border-r">
          <div className="summary-panel min-h-0 max-h-[42vh] flex-1 overflow-x-auto overflow-y-auto lg:max-h-none">
            {filtered.length === 0 ? (
              <p className="p-5 text-base text-[var(--muted)]">
                No advisories found.
              </p>
            ) : (
              <>
                <table className="doc-list-table w-full min-w-[24rem] border-collapse text-[0.875rem]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-brand-navy-deep to-brand-navy text-white">
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                        Title
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item) => {
                      const active = selected?.id === item.id;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className={`cursor-pointer border-b border-neutral-200 transition-colors hover:bg-brand-orange-light ${
                            active ? "bg-brand-orange-light" : "bg-white"
                          }`}
                        >
                          <td
                            className={`whitespace-nowrap px-3 py-2.5 align-top text-sm text-[var(--muted)] ${
                              active
                                ? "border-l-4 border-l-brand-orange bg-brand-orange-light"
                                : "border-l-4 border-l-transparent"
                            }`}
                          >
                            {formatTableDate(item.issued_date)}
                          </td>
                          <td className="px-3 py-2.5 align-top font-semibold leading-snug text-black">
                            <span className="block break-words">{item.title}</span>
                            <span className="mt-1 block text-xs font-medium text-[var(--muted)]">
                              {item.module}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {totalPages > 1 ? (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-[var(--border)] bg-brand-cream/30 px-4 py-3">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((value) => value - 1)}
                      className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium shadow-sm disabled:opacity-40 hover:border-brand-orange hover:text-brand-orange-dark"
                    >
                      Prev
                    </button>
                    {getVisiblePages(page, totalPages).map((entry, index) =>
                      entry === "ellipsis" ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-1 text-sm text-[var(--muted)]"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={entry}
                          type="button"
                          onClick={() => setPage(entry)}
                          className={`min-w-[2.5rem] rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors ${
                            page === entry
                              ? "border-brand-orange bg-brand-orange text-white shadow-sm"
                              : "border-[var(--border)] bg-white shadow-sm hover:border-brand-orange hover:text-brand-orange-dark"
                          }`}
                        >
                          {entry}
                        </button>
                      )
                    )}
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((value) => value + 1)}
                      className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium shadow-sm disabled:opacity-40 hover:border-brand-orange hover:text-brand-orange-dark"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col bg-white">
          <div className="flex min-h-[50vh] flex-1 flex-col overflow-hidden lg:min-h-0">
            {selected ? (
              <>
                <div className="flex shrink-0 items-start gap-3 border-b border-brand-orange/30 bg-gradient-to-r from-brand-navy-deep to-brand-navy px-5 py-3 text-white">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold tracking-tight leading-snug">
                      {selected.title}
                    </p>
                    <p className="mt-1 text-sm text-neutral-200">
                      {selected.module}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-neutral-300">
                    {formatDate(selected.issued_date)}
                  </span>
                </div>
                <div className="summary-panel min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  <GstAdvisoryContent html={selected.content_html} />
                  {selected.pdf_urls.length > 0 ? (
                    <div className="mt-6 border-t border-[var(--border)] pt-4">
                      <p className="text-sm font-semibold text-brand-navy">
                        Related PDFs
                      </p>
                      <ul className="mt-2 space-y-2">
                        {selected.pdf_urls.map((url) => (
                          <li key={url}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-brand-orange-dark underline-offset-2 hover:underline"
                            >
                              {url.split("/").pop()}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="mt-6 text-xs text-[var(--muted)]">
                    Source:{" "}
                    <a
                      href={selected.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-2 hover:underline"
                    >
                      GST Portal
                    </a>
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-base text-[var(--muted)]">
                Select an advisory to read.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}