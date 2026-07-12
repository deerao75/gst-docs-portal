"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { bioParagraphs, teamMembers, type TeamMember } from "@/lib/team-members";

function teamCardClass(index: number): string {
  const base =
    "doc-card cursor-pointer overflow-hidden !shadow-sm transition-all hover:ring-1 hover:ring-brand-orange/40 sm:col-span-2";
  if (index === 3) return `${base} sm:col-start-2`;
  if (index === 4) return `${base} sm:col-start-4`;
  return base;
}

function TeamProfileModal({
  member,
  onClose,
}: {
  member: TeamMember;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-profile-title"
      onClick={onClose}
    >
      <div
        className="modal-panel max-h-[85vh] max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="modal-close"
          aria-label="Close profile"
        >
          ×
        </button>

        <div className="border-b border-brand-orange/30 bg-gradient-to-r from-brand-navy-deep to-brand-navy px-5 py-4 text-white sm:px-6">
          <p id="team-profile-title" className="text-lg font-bold tracking-tight">
            {member.name}
          </p>
          <p className="mt-1 text-sm text-neutral-200">{member.designation}</p>
        </div>

        <div className="max-h-[calc(85vh-8rem)] space-y-4 overflow-y-auto px-5 py-6 sm:px-6">
          {bioParagraphs(member.bio).map((paragraph, index) => (
            <p
              key={index}
              className="text-justify text-sm leading-relaxed text-brand-black sm:text-base"
            >
              {paragraph}
            </p>
          ))}
          {member.linkedin ? (
            <p className="pt-2">
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-brand-orange hover:underline"
              >
                View LinkedIn profile
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function TeamViewer() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected =
    teamMembers.find((member) => member.id === selectedId) ?? null;

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
        {teamMembers.map((member, index) => (
          <button
            key={member.id}
            type="button"
            onClick={() => setSelectedId(member.id)}
            className={`${teamCardClass(index)} text-left`}
          >
            <div className="relative aspect-[4/5] w-full bg-brand-cream">
              <Image
                src={member.photo}
                alt={member.name}
                fill
                className="object-cover object-top"
                sizes="(max-width: 640px) 100vw, 240px"
              />
            </div>
            <div className="border-t border-[var(--border)] px-4 py-3">
              <h2 className="font-semibold text-brand-black">{member.name}</h2>
              <p className="text-sm text-brand-orange-dark">{member.designation}</p>
            </div>
          </button>
        ))}
      </div>

      {selected ? (
        <TeamProfileModal member={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </>
  );
}