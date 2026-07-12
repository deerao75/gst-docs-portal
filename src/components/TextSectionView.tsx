import Link from "next/link";
import type { TextSection } from "@/lib/db";

type Props = {
  title: string;
  category: "act" | "rule";
  categoryLabel: string;
  slug: string;
  sections: TextSection[];
};

export default function TextSectionView({
  title,
  category,
  categoryLabel,
  sections,
}: Props) {
  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/${category}s`}
          className="text-base text-brand-orange-dark hover:underline"
        >
          ← {categoryLabel}
        </Link>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-black">
          {title}
        </h1>
      </div>

      <div className="flex gap-8">
        <nav className="hidden w-60 shrink-0 lg:block">
          <div className="panel sticky top-6 p-4">
            <p className="section-label mb-3">Sections</p>
            <ul className="space-y-1 text-base">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#section-${s.section_number}`}
                    className="block rounded px-2 py-1.5 text-black hover:bg-brand-orange-light"
                  >
                    § {s.section_number} — {s.section_title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-6">
          {sections.map((section) => (
            <article
              key={section.id}
              id={`section-${section.section_number}`}
              className="panel p-7"
            >
              <header className="border-b border-[var(--border)] pb-4">
                <p className="section-label">
                  Section {section.section_number}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-black">
                  {section.section_title}
                </h2>
              </header>
              <div className="mt-5 text-lg leading-relaxed text-black">
                {section.content}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}