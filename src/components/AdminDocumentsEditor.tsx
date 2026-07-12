"use client";

import AdminAddDocumentForm from "@/components/AdminAddDocumentForm";
import { formatTableDate } from "@/lib/format";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

const DOC_TYPES = [
  { value: "all", label: "All types" },
  { value: "notification", label: "Notifications" },
  { value: "circular", label: "Circulars" },
  { value: "order", label: "Orders" },
  { value: "instruction", label: "Instructions" },
  { value: "advisory", label: "Advisory" },
] as const;

type AdminItem = {
  id: number;
  doc_type: string;
  category: string | null;
  notification_no: string | null;
  issued_date: string | null;
  year: number;
  list_detail: string;
  show_summary: string;
  file_name: string;
  is_corrigendum: boolean;
  list_detail_manual: boolean;
  summary_manual: boolean;
  legal_status_label: string;
  legal_status_refs: string;
  admin_uploaded: boolean;
};

type AdminResponse = {
  items: AdminItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  years: number[];
  typeCounts: Record<string, number>;
};

const ADMIN_KEY_STORAGE = "gst-portal-admin-key";

export default function AdminDocumentsEditor({
  keyRequired,
}: {
  keyRequired: boolean;
}) {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(!keyRequired);
  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminResponse | null>(null);
  const [listDrafts, setListDrafts] = useState<Record<number, string>>({});
  const [summaryDrafts, setSummaryDrafts] = useState<Record<number, string>>({});
  const [statusLabelDrafts, setStatusLabelDrafts] = useState<
    Record<number, string>
  >({});
  const [statusRefsDrafts, setStatusRefsDrafts] = useState<
    Record<number, string>
  >({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_KEY_STORAGE);
    if (stored) {
      setAdminKey(stored);
      if (keyRequired) setAuthenticated(true);
    }
  }, [keyRequired]);

  const fetchDocs = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: typeFilter,
        page: String(page),
        pageSize: "50",
      });
      if (yearFilter !== "all") params.set("year", String(yearFilter));
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/admin/documents?${params}`, {
        headers: keyRequired ? { "x-admin-key": adminKey } : {},
      });
      if (!res.ok) {
        if (res.status === 401) {
          setAuthenticated(false);
          sessionStorage.removeItem(ADMIN_KEY_STORAGE);
        }
        throw new Error("Could not load documents");
      }
      const json = (await res.json()) as AdminResponse;
      setData(json);
      const nextList: Record<number, string> = {};
      const nextSummary: Record<number, string> = {};
      const nextStatusLabel: Record<number, string> = {};
      const nextStatusRefs: Record<number, string> = {};
      for (const item of json.items) {
        nextList[item.id] = item.list_detail;
        nextSummary[item.id] = item.show_summary;
        nextStatusLabel[item.id] = item.legal_status_label;
        nextStatusRefs[item.id] = item.legal_status_refs;
      }
      setListDrafts(nextList);
      setSummaryDrafts(nextSummary);
      setStatusLabelDrafts(nextStatusLabel);
      setStatusRefsDrafts(nextStatusRefs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [adminKey, authenticated, keyRequired, page, search, typeFilter, yearFilter]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, yearFilter, search]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem(ADMIN_KEY_STORAGE, adminKey);
    setAuthenticated(true);
  };

  const handleSave = async (id: number) => {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/documents/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(keyRequired ? { "x-admin-key": adminKey } : {}),
        },
        body: JSON.stringify({
          list_detail: listDrafts[id] ?? "",
          summary: summaryDrafts[id] ?? "",
          legal_status_label: statusLabelDrafts[id] ?? "",
          legal_status_refs: statusRefsDrafts[id] ?? "",
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSavedId(id);
      setTimeout(() => setSavedId(null), 2000);
      await fetchDocs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-md border-2 border-black bg-white p-8">
        <h1 className="text-2xl font-bold text-black">Admin — List details</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Enter the admin key to edit list titles shown on the public portal.
        </p>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Admin key"
            className="w-full border-2 border-black px-3 py-2"
            required
          />
          <button
            type="submit"
            className="w-full bg-brand-orange px-4 py-2 font-bold text-white hover:bg-brand-orange-dark"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide text-black">
            Document admin
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Upload PDFs, edit list details, Show Summary text, or legal status
            (Withdrawn / Rescinded). All changes save to{" "}
            <code className="text-xs">data/pdf_documents.json</code>.
          </p>
        </div>
        <Link
          href="/documents?type=notification"
          className="border-2 border-black px-4 py-2 text-sm font-bold hover:border-brand-orange"
        >
          ← Back to portal
        </Link>
      </div>

      <AdminAddDocumentForm
        keyRequired={keyRequired}
        adminKey={adminKey}
        onAdded={fetchDocs}
      />

      <div className="flex flex-wrap items-end gap-4 border-2 border-neutral-200 bg-neutral-50 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase text-neutral-600">
            Type
          </span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="min-w-[10rem] border-2 border-black bg-white px-3 py-2"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
                {data?.typeCounts[t.value] !== undefined
                  ? ` (${data.typeCounts[t.value]})`
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase text-neutral-600">
            Year
          </span>
          <select
            value={yearFilter}
            onChange={(e) =>
              setYearFilter(
                e.target.value === "all" ? "all" : Number(e.target.value)
              )
            }
            className="min-w-[8rem] border-2 border-black bg-white px-3 py-2"
          >
            <option value="all">All years</option>
            {(data?.years ?? []).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <span className="text-xs font-bold uppercase text-neutral-600">
            Search
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Number, title, filename, ID…"
            className="border-2 border-black bg-white px-3 py-2"
          />
        </label>
      </div>

      {error && (
        <p className="border-2 border-red-600 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-auto border-2 border-black">
        <table className="w-full min-w-[88rem] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[3rem]" />
            <col className="w-[5rem]" />
            <col className="w-[8rem]" />
            <col className="w-[5rem]" />
            <col className="w-[14%]" />
            <col className="w-[22%]" />
            <col className="w-[14%]" />
            <col className="w-[4rem]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-brand-black text-white">
            <tr>
              <th className="px-2 py-2 text-left text-xs uppercase">ID</th>
              <th className="px-2 py-2 text-left text-xs uppercase">Type</th>
              <th className="px-2 py-2 text-left text-xs uppercase">Number</th>
              <th className="px-2 py-2 text-left text-xs uppercase">Date</th>
              <th className="px-2 py-2 text-left text-xs uppercase">
                List detail
              </th>
              <th className="px-2 py-2 text-left text-xs uppercase">
                Show summary
              </th>
              <th className="px-2 py-2 text-left text-xs uppercase">
                Legal status
              </th>
              <th className="px-2 py-2 text-right text-xs uppercase">Save</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                  Loading…
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                  No documents match this filter.
                </td>
              </tr>
            ) : (
              data?.items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-200">
                  <td className="px-2 py-2 align-top text-neutral-600">
                    {item.id}
                  </td>
                  <td className="px-2 py-2 align-top capitalize">{item.doc_type}</td>
                  <td className="px-2 py-2 align-top font-semibold break-words">
                    {item.notification_no}
                    {item.is_corrigendum && (
                      <span className="mt-0.5 block text-xs text-brand-orange-dark">
                        Corrigendum
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 align-top text-neutral-600">
                    {formatTableDate(item.issued_date)}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <textarea
                      rows={2}
                      value={listDrafts[item.id] ?? ""}
                      onChange={(e) =>
                        setListDrafts((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="w-full resize-y border border-neutral-300 px-2 py-1.5 text-sm leading-snug"
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <textarea
                      rows={4}
                      value={summaryDrafts[item.id] ?? ""}
                      onChange={(e) =>
                        setSummaryDrafts((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="w-full resize-y border border-neutral-300 px-2 py-1.5 text-sm leading-snug"
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <select
                      value={statusLabelDrafts[item.id] ?? ""}
                      onChange={(e) =>
                        setStatusLabelDrafts((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="mb-1 w-full border border-neutral-300 bg-white px-2 py-1 text-xs"
                    >
                      <option value="">— None —</option>
                      <option value="withdrawn">Withdrawn</option>
                      <option value="rescinded">Rescinded</option>
                    </select>
                    <textarea
                      rows={3}
                      value={statusRefsDrafts[item.id] ?? ""}
                      onChange={(e) =>
                        setStatusRefsDrafts((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      placeholder="Related numbers, one per line"
                      className="w-full resize-y border border-neutral-300 px-2 py-1.5 text-xs leading-snug"
                    />
                    <p className="mt-1 truncate text-xs text-neutral-400">
                      {item.file_name}
                    </p>
                  </td>
                  <td className="px-2 py-2 align-top text-right">
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => handleSave(item.id)}
                      className="bg-brand-orange px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-orange-dark disabled:opacity-50"
                    >
                      {savingId === item.id
                        ? "…"
                        : savedId === item.id
                          ? "Saved"
                          : "Save"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 border-t border-neutral-200 pt-3">
          <p className="text-sm text-neutral-600">
            Page {data.page} of {data.totalPages} — {data.total} documents
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-2 border-black px-3 py-1 text-sm disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= data.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="border-2 border-black px-3 py-1 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}