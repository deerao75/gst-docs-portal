"use client";

import type { LegislationCatalog, LegislationItem } from "@/lib/legislation-catalog";
import { toLegislationDisplayTitle } from "@/lib/legislation-format";
import Link from "next/link";

type Props = {
  catalog: LegislationCatalog;
  category: "act" | "rule";
  pageTitle: string;
};

const CARD_WIDTH =
  "w-full sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)] xl:w-[calc((100%-3rem)/4)]";

function LegislationCard({
  item,
  category,
  icon,
}: {
  item: LegislationItem;
  category: "act" | "rule";
  icon: string;
}) {
  const title = toLegislationDisplayTitle(item.title);
  const cardClass = `doc-card group flex h-full flex-col p-5 ${CARD_WIDTH}`;

  const inner = (
    <>
      <span className="icon-badge">{icon}</span>
      <h2 className="mt-4 text-base font-bold leading-snug text-brand-black group-hover:text-brand-orange">
        {title}
      </h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">
        {item.summary}
      </p>
      {item.slug ? (
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange">
          Explore
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      ) : (
        <span className="mt-4 text-sm font-medium text-slate-400">
          Content coming soon
        </span>
      )}
    </>
  );

  if (item.slug) {
    return (
      <Link href={`/${category}s/${item.slug}`} className={cardClass}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={`${cardClass} cursor-default opacity-90`}>{inner}</div>
  );
}

export default function TextLegislationHome({
  catalog,
  category,
  pageTitle,
}: Props) {
  const icon = category === "act" ? "§" : "R";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 lg:px-6 lg:pt-12">
      <div className="text-center">
        <p className="section-label">{category === "act" ? "Legislation" : "Procedural rules"}</p>
        <h1 className="page-heading mt-2">{pageTitle}</h1>
        <p className="page-subheading mx-auto">
          {category === "act"
            ? "Primary and allied GST statutes with concise descriptions."
            : "CGST, IGST, UTGST and related procedural rules under GST."}
        </p>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-4">
        {catalog.items.map((item) => (
          <LegislationCard
            key={item.title}
            item={item}
            category={category}
            icon={icon}
          />
        ))}
      </div>
    </div>
  );
}