"use client";

import LegislationInlineText from "@/components/LegislationInlineText";

type Props = {
  note: string;
};

export default function LegislationNoteItem({ note }: Props) {
  return (
    <p className="legislation-notes__item">
      <LegislationInlineText text={note} />
    </p>
  );
}