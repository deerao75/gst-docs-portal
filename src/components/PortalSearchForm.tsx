"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PortalSearchResults } from "@/lib/portal-search";
import { notificationCategoryLabel } from "@/lib/notification-categories";

type Props = {
  initialQuery?: string;
  results?: PortalSearchResults;
};

export default function PortalSearchForm({ initialQuery = "", results }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  return (
    <div className="mx-auto max-w-4xl">
      <p className="section-label">Quick lookup</p>
      <h1 className="page-heading mt-2">Search by section or notification</h1>
      <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
        Jump directly to an Act section, Rule, or GST notification number. Try{" "}
        <code className="rounded bg-brand-cream px-1.5 py-0.5 text-sm">16</code>,{" "}
        <code className="rounded bg-brand-cream px-1.5 py-0.5 text-sm">s 20</code>, or{" "}
        <code className="rounded bg-brand-cream px-1.5 py-0.5 text-sm">28/2023</code>.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Section 16, Rule 46, 39/2021..."
          className="search-input min-w-0 flex-1"
          aria-label="Search query"
        />
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>

      {results ? (
        <div className="mt-10 space-y-8">
          {results.legislation.length === 0 && results.notifications.length === 0 ? (
            <p className="rounded-xl border border-[var(--border)] bg-white px-5 py-4 text-sm text-[var(--muted)]">
              No matches for <strong className="text-brand-black">{results.query}</strong>.
              Use a section number like <strong>16</strong> or a notification like{" "}
              <strong>28/2023</strong>.
            </p>
          ) : null}

          {results.legislation.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-brand-navy-deep">
                Legislation ({results.legislation.length})
              </h2>
              <ul className="mt-3 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-white">
                {results.legislation.map((hit) => (
                  <li key={hit.href}>
                    <Link
                      href={hit.href}
                      className="block px-5 py-4 transition-colors hover:bg-brand-orange-light/60"
                    >
                      <p className="text-sm font-semibold text-brand-orange-dark">
                        {hit.kind === "act" ? "Section" : "Rule"} {hit.sectionNumber}
                      </p>
                      <p className="mt-1 text-base font-semibold text-brand-black">
                        {hit.sectionTitle}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {hit.documentTitle}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {results.notifications.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-brand-navy-deep">
                Notifications ({results.notifications.length})
              </h2>
              <ul className="mt-3 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-white">
                {results.notifications.map((hit) => (
                  <li key={hit.href}>
                    <Link
                      href={hit.href}
                      className="block px-5 py-4 transition-colors hover:bg-brand-orange-light/60"
                    >
                      <p className="text-sm font-semibold text-brand-orange-dark">
                        {hit.notificationNo ?? `Notification #${hit.id}`}
                      </p>
                      <p className="mt-1 text-base font-semibold text-brand-black">
                        {hit.title}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {hit.category
                          ? notificationCategoryLabel(hit.category)
                          : "Notification"}
                        {hit.year ? ` · ${hit.year}` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}