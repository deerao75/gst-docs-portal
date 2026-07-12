"use client";

import {
  categoriesForDocType,
  defaultCategoryForDocType,
} from "@/lib/admin-categories";
import { FormEvent, useEffect, useState } from "react";

const ADD_DOC_TYPES = [
  { value: "notification", label: "Notification" },
  { value: "circular", label: "Circular" },
  { value: "order", label: "Order" },
  { value: "instruction", label: "Instruction" },
  { value: "advisory", label: "Advisory" },
] as const;

type AddResult = {
  id: number;
  notification_no: string;
  list_detail: string;
};

export default function AdminAddDocumentForm({
  keyRequired,
  adminKey,
  onAdded,
}: {
  keyRequired: boolean;
  adminKey: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("notification");
  const [category, setCategory] = useState(defaultCategoryForDocType("notification"));
  const [listDetail, setListDetail] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [isCorrigendum, setIsCorrigendum] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AddResult | null>(null);

  const categories = categoriesForDocType(docType);

  useEffect(() => {
    setCategory(defaultCategoryForDocType(docType));
  }, [docType]);

  useEffect(() => {
    if (issuedDate && /^\d{4}-\d{2}-\d{2}$/.test(issuedDate)) {
      setYear(String(new Date(issuedDate + "T00:00:00").getFullYear()));
    }
  }, [issuedDate]);

  const resetForm = () => {
    setListDetail("");
    setIssuedDate("");
    setYear(String(new Date().getFullYear()));
    setIsCorrigendum(false);
    setFile(null);
    setError(null);
    setResult(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Choose a PDF file");
      return;
    }
    if (!listDetail.trim()) {
      setError("List detail is required");
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("doc_type", docType);
      form.append("category", category);
      form.append("list_detail", listDetail.trim());
      if (issuedDate) form.append("issued_date", issuedDate);
      if (year) form.append("year", year);
      form.append("is_corrigendum", String(isCorrigendum));

      const res = await fetch("/api/admin/documents", {
        method: "POST",
        headers: keyRequired ? { "x-admin-key": adminKey } : {},
        body: form,
      });

      const json = (await res.json()) as AddResult & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      setResult(json);
      setListDetail("");
      setIssuedDate("");
      setYear(String(new Date().getFullYear()));
      setIsCorrigendum(false);
      setFile(null);
      setError(null);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-2 border-brand-orange bg-brand-orange-light/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-bold text-black hover:bg-brand-orange-light"
      >
        <span>+ Add new document (upload PDF)</span>
        <span className="text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 border-t-2 border-brand-orange bg-white p-4"
        >
          <p className="text-sm text-neutral-600">
            Upload a PDF and enter list details. A unique document number is
            assigned automatically. Summary and amendment tracking can be added
            here later.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase text-neutral-600">
                Type *
              </span>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="border-2 border-black bg-white px-3 py-2"
                required
              >
                {ADD_DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase text-neutral-600">
                Category *
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border-2 border-black bg-white px-3 py-2"
                required
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase text-neutral-600">
                Year *
              </span>
              <input
                type="number"
                min={2017}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="border-2 border-black bg-white px-3 py-2"
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase text-neutral-600">
                Issued date
              </span>
              <input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="border-2 border-black bg-white px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-bold uppercase text-neutral-600">
                PDF file *
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="border-2 border-black bg-white px-3 py-2"
                required
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase text-neutral-600">
              List detail (shown on frontend) *
            </span>
            <textarea
              rows={3}
              value={listDetail}
              onChange={(e) => setListDetail(e.target.value)}
              placeholder="One-line summary shown in the Details column"
              className="border-2 border-black px-3 py-2"
              required
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isCorrigendum}
              onChange={(e) => setIsCorrigendum(e.target.checked)}
              className="h-4 w-4"
            />
            Corrigendum
          </label>

          {error && (
            <p className="border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          {result && (
            <p className="border-2 border-green-700 bg-green-50 px-3 py-2 text-sm text-green-900">
              Saved — ID {result.id}, number{" "}
              <strong>{result.notification_no}</strong>. It is live on the
              portal now.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-orange px-6 py-2 font-bold text-white hover:bg-brand-orange-dark disabled:opacity-50"
            >
              {submitting ? "Uploading…" : "Upload & save"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="border-2 border-black px-4 py-2 text-sm font-bold"
            >
              Clear form
            </button>
          </div>
        </form>
      )}
    </div>
  );
}