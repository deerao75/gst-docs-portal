"use client";

import type { LegislationSourceLink } from "@/lib/legislation-source-links-types";
import Link from "next/link";

type Props = {
  links: LegislationSourceLink[];
};

export default function LegislationSourceLinks({ links }: Props) {
  if (links.length === 0) return null;

  return (
    <div className="legislation-notes__actions">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="legislation-source-link"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}