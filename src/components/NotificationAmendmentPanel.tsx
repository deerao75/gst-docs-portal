"use client";

import { formatTableDate } from "@/lib/format";
import { notificationCategoryLabel } from "@/lib/notification-categories";
import type { DocumentRelationRef } from "@/lib/document-legal-status-types";
import { useEffect } from "react";

type PanelProps = {
  amendments: DocumentRelationRef[];
  onOpenNotification: (id: number) => void;
};

function amendmentDescription(item: DocumentRelationRef): string | null {
  const note = item.note?.trim();
  if (note && note.length > 20) return note;
  const title = item.title?.trim();
  if (title && title.length > 20) return title;
  return note || title || null;
}

export function NotificationAmendedButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-colors ${
        active
          ? "border-brand-orange bg-brand-orange-light text-brand-orange-dark"
          : "border-brand-navy/30 bg-brand-cream text-brand-navy-deep hover:border-brand-orange/60 hover:bg-brand-orange-light hover:text-brand-orange-dark"
      }`}
      aria-expanded={active}
    >
      Amended
    </button>
  );
}

export default function NotificationAmendmentPanel({
  amendments,
  onOpenNotification,
}: PanelProps) {
  return (
    <ul className="divide-y divide-[var(--border)]">
      {amendments.map((item) => {
        const description = amendmentDescription(item);
        return (
          <li key={item.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <button
                type="button"
                onClick={() => onOpenNotification(item.id)}
                className="text-left text-sm font-semibold text-brand-orange-dark hover:underline"
              >
                {item.notification_no ?? `Notification #${item.id}`}
              </button>
              <span className="text-sm text-[var(--muted)]">
                {formatTableDate(item.issued_date ?? null)}
              </span>
              {(item.category || item.year) && (
                <span className="text-xs font-medium text-brand-black/70">
                  {item.category
                    ? notificationCategoryLabel(item.category)
                    : "Notification"}
                  {item.year ? ` · ${item.year}` : ""}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1.5 text-sm leading-snug text-brand-black/85">
                {description}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function NotificationAmendmentModal({
  open,
  notificationNo,
  amendments,
  onOpenNotification,
  onClose,
}: {
  open: boolean;
  notificationNo: string | null;
  amendments: DocumentRelationRef[];
  onOpenNotification: (id: number) => void;
  onClose: () => void;
}) {
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

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="amendment-modal-title"
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
          aria-label="Close amendments"
        >
          ×
        </button>

        <div className="modal-header">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
            Amendment history
          </p>
          <h2 id="amendment-modal-title" className="mt-1 text-lg font-bold">
            {notificationNo ?? "Notification"}
          </h2>
          <p className="mt-1 text-sm text-neutral-200">
            Amended by {amendments.length} subsequent notification
            {amendments.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="summary-panel max-h-[calc(85vh-8rem)] overflow-y-auto px-6 py-5">
          <NotificationAmendmentPanel
            amendments={amendments}
            onOpenNotification={onOpenNotification}
          />
        </div>
      </div>
    </div>
  );
}