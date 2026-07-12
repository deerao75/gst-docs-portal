"use client";

import { renderBullets } from "@/lib/format";
import type { PdfDocument } from "@/lib/db";

type Props = {
  document: PdfDocument;
};

export default function SummaryContent({ document }: Props) {
  return (
    <div className="summary-panel h-full space-y-8 overflow-y-auto bg-slate-50 px-6 py-6 text-[0.95rem] leading-relaxed md:px-8">
      <section>
        <h3 className="section-label mb-3 border-b border-slate-200 pb-2">
          Key Points
        </h3>
        <ul
          className="list-disc space-y-3 pl-5 text-slate-800"
          dangerouslySetInnerHTML={{
            __html: renderBullets(document.summary_bullets || ""),
          }}
        />
      </section>

      <section>
        <h3 className="section-label mb-3 border-b border-slate-200 pb-2">
          Summary
        </h3>
        <p className="text-slate-800">{document.summary}</p>
      </section>

      <section>
        <h3 className="section-label mb-3 border-b border-slate-200 pb-2">
          Practical Application
        </h3>
        <p className="rounded-md border border-orange-200 bg-orange-50 px-5 py-4 text-slate-800">
          {document.practical_effect}
        </p>
      </section>
    </div>
  );
}