"use client";

import type { AiSummary } from "@/lib/ai-summary-pilot";

type Props = {
  data: AiSummary;
};

export default function AiSummaryContent({ data }: Props) {
  return (
    <div className="summary-panel h-full space-y-8 overflow-y-auto bg-neutral-50 px-6 py-6 md:px-8">
      <p className="rounded border border-brand-orange/30 bg-brand-orange-light px-4 py-2 text-sm text-neutral-700">
        AI-generated summary — for reference only. Verify against the original
        notification.
      </p>

      <section>
        <h3 className="section-label mb-3 border-b border-neutral-200 pb-2">
          Key Points
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-black">
          {data.key_points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="section-label mb-3 border-b border-neutral-200 pb-2">
          Summary
        </h3>
        <p className="rounded-md border border-brand-orange/30 bg-brand-orange-light px-5 py-4 text-base leading-relaxed text-black">
          {data.summary}
        </p>
      </section>
    </div>
  );
}