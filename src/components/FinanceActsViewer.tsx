"use client";

import { useState } from "react";
import type { FinanceAct } from "@/lib/finance-acts";
import { financeActViewerSrc } from "@/lib/finance-act-viewer";
import { formatDate, formatTableDate } from "@/lib/format";

type Props = {
  acts: FinanceAct[];
  initialActId?: number;
};

export default function FinanceActsViewer({ acts, initialActId }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(
    initialActId ?? acts[0]?.id ?? null
  );

  const selected =
    acts.find((act) => act.id === selectedId) ?? acts[0] ?? null;

  return (
    <div className="viewer-shell flex h-full flex-col">
      <div className="viewer-page-header shrink-0">
        <p className="section-label !text-brand-orange/90">GST legislation</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
          Finance Acts
        </h1>
      </div>

      <div className="filter-band px-4 py-3.5 lg:px-5">
        <p className="text-sm text-[var(--muted)]">
          Full Finance Act PDFs from India Budget, eGazette and GST Council —
          latest first.
        </p>
      </div>

      <div className="viewer-grid-finance-acts min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-col border-b border-[var(--border)] lg:h-full lg:border-b-0 lg:border-r">
          <div className="summary-panel min-h-0 max-h-[42vh] flex-1 overflow-x-auto overflow-y-auto lg:max-h-none">
            {acts.length === 0 ? (
              <p className="p-5 text-base text-[var(--muted)]">
                No Finance Acts found.
              </p>
            ) : (
              <table className="doc-list-table w-full min-w-[26rem] border-collapse text-[0.875rem]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-brand-navy-deep to-brand-navy text-white">
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Act
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                      Assent date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {acts.map((act) => {
                    const active = selected?.id === act.id;
                    return (
                      <tr
                        key={act.id}
                        onClick={() => setSelectedId(act.id)}
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
                          <span className="block break-words">{act.title}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right align-top text-sm text-[var(--muted)]">
                          {formatTableDate(act.assent_date)}
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
                    <p className="text-base font-bold tracking-tight">
                      {selected.title}
                    </p>
                    <a
                      href={selected.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-neutral-200 underline-offset-2 hover:underline"
                    >
                      Official source
                    </a>
                  </div>
                  <span className="shrink-0 text-sm text-neutral-300">
                    {formatDate(selected.assent_date)}
                  </span>
                </div>

                <iframe
                  key={selected.id}
                  src={financeActViewerSrc(selected.id)}
                  className="min-h-0 flex-1 border-0 bg-white"
                  style={{ width: "100%", height: "100%" }}
                  title={selected.title}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-base text-[var(--muted)]">
                Select a Finance Act to view the PDF.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}