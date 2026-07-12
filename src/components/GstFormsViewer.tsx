"use client";

import { useMemo, useState } from "react";
import type { GstForm } from "@/lib/gst-forms-types";
import { gstFormViewerSrc } from "@/lib/gst-form-viewer";

type Props = {
  forms: GstForm[];
  initialSlug?: string;
};

function formCategory(code: string): string {
  if (code.startsWith("GSTR")) return "Returns";
  const prefix = code.split("-")[0];
  const labels: Record<string, string> = {
    REG: "Registration",
    CMP: "Composition",
    ITC: "Input Tax Credit",
    PMT: "Payment",
    RFD: "Refund",
    ASMT: "Assessment",
    ADT: "Audit",
    ARA: "Advance Ruling",
    APL: "Appeal",
    DRC: "Demand & Recovery",
    EWB: "E-Way Bill",
    INV: "Invoice",
    INS: "Inspection",
    ENR: "Enrolment",
    PCT: "Precinct",
    TRAN: "Transition",
    CPD: "Compensation",
    RVN: "Revision",
    STL: "Settlement",
    MOV: "Movement",
    SPL: "Special",
  };
  return labels[prefix] ?? prefix;
}

export default function GstFormsViewer({ forms, initialSlug }: Props) {
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialSlug ?? forms[0]?.slug ?? null
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return forms;
    return forms.filter(
      (form) =>
        form.code.toLowerCase().includes(q) ||
        form.title.toLowerCase().includes(q) ||
        formCategory(form.code).toLowerCase().includes(q)
    );
  }, [forms, query]);

  const selected =
    forms.find((form) => form.slug === selectedSlug) ?? filtered[0] ?? null;

  return (
    <div className="viewer-shell flex h-full flex-col">
      <div className="viewer-page-header shrink-0">
        <p className="section-label !text-brand-orange/90">CBIC / GST Portal</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
          GST Forms
        </h1>
      </div>

      <div className="filter-band px-4 py-3.5 lg:px-5">
        <p className="text-sm text-[var(--muted)]">
          {forms.length} statutory forms from the consolidated CGST Rules Part-B
          (amended to 1 January 2022). Search by form number or category.
        </p>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search forms (e.g. REG-01, GSTR-3B, Refund)"
          className="mt-3 w-full max-w-xl rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        />
      </div>

      <div className="viewer-grid-finance-acts min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-col border-b border-[var(--border)] lg:h-full lg:border-b-0 lg:border-r">
          <div className="summary-panel min-h-0 max-h-[42vh] flex-1 overflow-x-auto overflow-y-auto lg:max-h-none">
            {filtered.length === 0 ? (
              <p className="p-5 text-base text-[var(--muted)]">No forms match your search.</p>
            ) : (
              <table className="doc-list-table w-full min-w-[24rem] border-collapse text-[0.875rem]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-brand-navy-deep to-brand-navy text-white">
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Form
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((form) => {
                    const active = selected?.slug === form.slug;
                    return (
                      <tr
                        key={form.slug}
                        onClick={() => setSelectedSlug(form.slug)}
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
                          {form.title}
                        </td>
                        <td className="px-3 py-2.5 align-top text-sm text-[var(--muted)]">
                          {formCategory(form.code)}
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
            {selected ? (
              <>
                <div className="flex shrink-0 items-center gap-3 border-b border-brand-orange/30 bg-gradient-to-r from-brand-navy-deep to-brand-navy px-5 py-3 text-white">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold tracking-tight">{selected.title}</p>
                    <a
                      href={selected.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-neutral-200 underline-offset-2 hover:underline"
                    >
                      {selected.source_label}
                    </a>
                  </div>
                  <a
                    href={`/api/gst-form/${encodeURIComponent(selected.slug)}?download=1`}
                    className="shrink-0 rounded-md border border-white/30 px-3 py-1.5 text-sm font-semibold text-white hover:border-brand-orange hover:bg-brand-orange/20"
                  >
                    Download
                  </a>
                </div>

                <iframe
                  key={selected.slug}
                  src={gstFormViewerSrc(selected.slug)}
                  className="min-h-0 flex-1 border-0 bg-white"
                  style={{ width: "100%", height: "100%" }}
                  title={selected.title}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-base text-[var(--muted)]">
                Select a form to view the PDF.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}