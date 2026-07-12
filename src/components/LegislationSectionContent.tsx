"use client";

import LegislationInlineText from "@/components/LegislationInlineText";
import LegislationNoteItem from "@/components/LegislationNoteItem";
import LegislationSourceLinks from "@/components/LegislationSourceLinks";
import { parseLegislationContent } from "@/lib/legislation-content";
import {
  dedupeLegislationSourceLinks,
  resolveLegislationNoteLinks,
} from "@/lib/legislation-source-links-resolve";
import type { LegislationSourceIndex } from "@/lib/legislation-source-links-types";
import { useMemo } from "react";

type Props = {
  content: string;
  sourceLinkIndex?: LegislationSourceIndex;
};

export default function LegislationSectionContent({
  content,
  sourceLinkIndex,
}: Props) {
  const { paragraphs, notes } = parseLegislationContent(content);

  const sourceLinks = useMemo(() => {
    if (!sourceLinkIndex || notes.length === 0) return [];
    const allLinks = notes.flatMap((note) =>
      resolveLegislationNoteLinks(note, sourceLinkIndex)
    );
    return dedupeLegislationSourceLinks(allLinks);
  }, [notes, sourceLinkIndex]);

  return (
    <div className="legislation-prose text-base leading-relaxed text-black">
      <div lang="en">
        {paragraphs.map((paragraph, index) => (
          <p
            key={`${index}-${paragraph.text.slice(0, 32)}`}
            className={
              paragraph.isHeading
                ? "legislation-prose__para legislation-prose__para--heading"
                : "legislation-prose__para"
            }
          >
            <LegislationInlineText text={paragraph.text} />
          </p>
        ))}
      </div>

      {notes.length > 0 ? (
        <aside
          className="legislation-notes"
          aria-label="Amendment and source notes"
        >
          <div className="legislation-notes__panel">
            {notes.map((note, index) => (
              <LegislationNoteItem
                key={`note-${index}-${note.slice(0, 32)}`}
                note={note}
              />
            ))}
            <LegislationSourceLinks links={sourceLinks} />
          </div>
        </aside>
      ) : null}
    </div>
  );
}