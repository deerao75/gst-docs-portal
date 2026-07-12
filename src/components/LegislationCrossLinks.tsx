"use client";

import Link from "next/link";
import type { ResolvedLegislationLink } from "@/lib/legislation-cross-links-types";

type Props = {
  links: ResolvedLegislationLink[];
  heading: string;
};

export default function LegislationCrossLinks({ links, heading }: Props) {
  if (links.length === 0) return null;

  return (
    <div className="flex min-w-[10rem] max-w-[58%] shrink-0 flex-col items-end gap-1.5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-brand-orange-light/95">
        {heading}
      </p>
      <div className="flex flex-wrap justify-end gap-1.5">
        {links.map((link) => (
          <Link
            key={`${link.label}-${link.href}`}
            href={link.href}
            className="rounded-full border border-brand-orange/35 bg-brand-orange-light px-2.5 py-0.5 text-xs font-semibold text-brand-orange-dark shadow-sm transition-colors hover:border-brand-orange hover:bg-brand-orange hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}