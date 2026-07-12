import PortalSearchForm from "@/components/PortalSearchForm";
import { searchPortal } from "@/lib/portal-search";
import { Suspense } from "react";

function SearchResults({ query }: { query?: string }) {
  const trimmed = query?.trim() ?? "";
  const results = trimmed ? searchPortal(trimmed) : undefined;

  return <PortalSearchForm initialQuery={trimmed} results={results} />;
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return (
    <div className="mx-auto px-4 py-10 lg:px-6">
      <Suspense fallback={<p className="text-[var(--muted)]">Loading search…</p>}>
        <SearchResults query={searchParams.q} />
      </Suspense>
    </div>
  );
}