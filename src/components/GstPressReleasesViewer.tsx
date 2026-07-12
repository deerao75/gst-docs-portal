"use client";

import { useState } from "react";
import type { GstPressRelease } from "@/lib/gst-press-releases";
import { gstPressReleaseListTitle } from "@/lib/gst-press-release-display";
import { gstPressReleaseViewerSrc } from "@/lib/gst-press-release-viewer";
import { formatDate, formatTableDate } from "@/lib/format";

type Props = {
  releases: GstPressRelease[];
  initialId?: number;
};

export default function GstPressReleasesViewer({ releases, initialId }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(
    initialId ?? releases[0]?.id ?? null
  );

  const selected =
    releases.find((item) => item.id === selectedId) ?? releases[0] ?? null;

  return (
    <div className="viewer-shell flex h-full flex-col">
      <div className="viewer-page-header shrink-0">
        <p className="section-label !text-brand-orange/90">GST Council</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
          Press Releases
        </h1>
      </div>

      <div className="filter-band px-4 py-3.5 lg:px-5">
        <p className="text-sm text-[var(--muted)]">
          GST Council meeting minutes since 2017 — latest first.
        </p>
      </div>

      <div className="viewer-grid-finance-acts min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-col border-b border-[var(--border)] lg:h-full lg:border-b-0 lg:border-r">
          <div className="summary-panel min-h-0 max-h-[42vh] flex-1 overflow-x-auto overflow-y-auto lg:max-h-none">
            {releases.length === 0 ? (
              <p className="p-5 text-base text-[var(--muted)]">
                No press releases found.
              </p>
            ) : (
              <table className="doc-list-table w-full min-w-[28rem] border-collapse text-[0.875rem]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-brand-navy-deep to-brand-navy text-white">
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Meeting
                    </th>
                    <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((item) => {
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
                          className={`px-3 py-2.5 align-top font-semibold leading-snug text-black ${
                            active
                              ? "border-l-4 border-l-brand-orange bg-brand-orange-light"
                              : "border-l-4 border-l-transparent"
                          }`}
                        >
                          <span className="block break-words">
                            {gstPressReleaseListTitle(
                              item.title,
                              item.original_url
                            )}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right align-top text-sm text-[var(--muted)]">
                          {formatTableDate(item.date)}
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
                      href={selected.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-neutral-200 underline-offset-2 hover:underline"
                    >
                      View on GST Council / PIB
                    </a>
                  </div>
                  <span className="shrink-0 text-sm text-neutral-300">
                    {formatDate(selected.date)}
                  </span>
                </div>

                <iframe
                  key={selected.id}
                  src={gstPressReleaseViewerSrc(selected.id)}
                  className="min-h-0 flex-1 border-0 bg-white"
                  style={{ width: "100%", height: "100%" }}
                  title={selected.title}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-base text-[var(--muted)]">
                Select a press release to view the PDF.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}