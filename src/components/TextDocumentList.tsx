import Link from "next/link";
import type { TextDocument } from "@/lib/db";

type Props = {
  documents: TextDocument[];
  category: "act" | "rule";
  categoryLabel: string;
};

export default function TextDocumentList({
  documents,
  category,
  categoryLabel,
}: Props) {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-semibold tracking-tight text-black">
        {categoryLabel}
      </h1>

      <div className="grid gap-5 md:grid-cols-2">
        {documents.map((doc) => (
          <Link
            key={doc.slug}
            href={`/${category}s/${doc.slug}`}
            className="panel group p-6 transition-all hover:border-brand-orange hover:shadow-md"
          >
            <p className="text-sm font-medium text-[var(--muted)]">
              {doc.year || "—"}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-black group-hover:text-brand-orange-dark">
              {doc.title}
            </h2>
          </Link>
        ))}
      </div>

      {documents.length === 0 && (
        <p className="text-base text-[var(--muted)]">
          No {categoryLabel.toLowerCase()} available.
        </p>
      )}
    </div>
  );
}