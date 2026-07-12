"use client";

import { docTypeLabel } from "@/lib/format";
import { useEffect } from "react";

type Props = {
  open: boolean;
  documentNo: string | null;
  docType: string | null;
  summary: string | null;
  loading: boolean;
  onClose: () => void;
};

export default function DocumentSummaryModal({
  open,
  documentNo,
  docType,
  summary,
  loading,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const heading =
    docType === "circular" ||
    docType === "notification" ||
    docType === "order"
      ? `${docTypeLabel(docType)} summary`
      : "Document summary";

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-summary-title"
      onClick={onClose}
    >
      <div
        className="modal-panel max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="modal-close"
          aria-label="Close summary"
        >
          ×
        </button>

        <div className="modal-header">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
            {heading}
          </p>
          <h2 id="document-summary-title" className="mt-1 text-lg font-bold">
            {documentNo ?? "Document"}
          </h2>
        </div>

        <div className="summary-panel max-h-[calc(85vh-5.5rem)] overflow-y-auto px-6 py-5 text-base leading-[1.75] text-black">
          {loading ? (
            <p className="text-[var(--muted)]">Loading summary…</p>
          ) : summary ? (
            summary.split(/\n\n+/).map((para, i) => (
              <p
                key={i}
                className={`text-justify [text-align-last:left] [hyphens:auto] ${
                  i > 0 ? "mt-4" : ""
                }`}
              >
                {para.trim()}
              </p>
            ))
          ) : (
            <p className="text-[var(--muted)]">Summary not available.</p>
          )}
        </div>
      </div>
    </div>
  );
}