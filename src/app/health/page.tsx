import {
  FINANCE_ACTS,
  GST_ADVISORIES,
  PDF_DOCUMENTS,
  TEXT_DOCUMENTS,
  TEXT_SECTIONS,
} from "@/lib/catalog-data";

export const dynamic = "force-dynamic";

export default function HealthPage() {
  const catalogs = [
    { name: "PDF documents", count: PDF_DOCUMENTS.length },
    { name: "Text documents", count: TEXT_DOCUMENTS.length },
    { name: "Text sections", count: TEXT_SECTIONS.length },
    { name: "Finance acts", count: FINANCE_ACTS.length },
    { name: "GST advisories", count: GST_ADVISORIES.items.length },
  ];

  const ok = catalogs.every((item) => item.count > 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 lg:px-6">
      <h1 className="text-2xl font-bold text-brand-black">Portal health</h1>
      <p className="mt-2 text-[var(--muted)]">
        Catalog data is bundled at build time (no filesystem reads).
      </p>

      <p
        className={`mt-6 inline-block rounded-lg px-4 py-2 text-sm font-semibold ${
          ok
            ? "bg-emerald-100 text-emerald-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {ok ? "All catalogs loaded" : "Some catalogs are empty"}
      </p>

      <ul className="mt-6 space-y-2 text-sm">
        {catalogs.map((item) => (
          <li
            key={item.name}
            className="flex justify-between rounded-lg border border-[var(--border)] px-4 py-3"
          >
            <span>{item.name}</span>
            <span className="font-mono font-semibold">{item.count}</span>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-[var(--muted)]">
        JSON API:{" "}
        <a href="/api/health" className="text-brand-orange hover:underline">
          /api/health
        </a>
      </p>
    </div>
  );
}