import type { TextDocumentWithSections } from "@/lib/db";
import {
  getActRulePairForSlug,
  getResolvedLegislationCrossLinks,
} from "@/lib/legislation-cross-links";
import type { ResolvedLegislationLink } from "@/lib/legislation-cross-links-types";
import { getLegislationSourceIndex } from "@/lib/legislation-source-links";
import type { LegislationSourceIndex } from "@/lib/legislation-source-links-types";

export type LegislationViewerExtras = {
  sectionCrossLinks?: Record<string, ResolvedLegislationLink[]>;
  sourceLinkIndex?: LegislationSourceIndex;
};

export function getLegislationViewerExtras(options: {
  category: "act" | "rule";
  slug: string;
  acts: TextDocumentWithSections[];
  rules: TextDocumentWithSections[];
}): LegislationViewerExtras {
  const { category, slug, acts, rules } = options;
  const sourceLinkIndex = getLegislationSourceIndex();
  const pair = getActRulePairForSlug(slug);
  if (!pair) return { sourceLinkIndex };

  const actDoc = acts.find((doc) => doc.slug === pair.actSlug);
  const rulesDoc = rules.find((doc) => doc.slug === pair.rulesSlug);
  if (!actDoc || !rulesDoc) return { sourceLinkIndex };

  const sectionCrossLinks =
    getResolvedLegislationCrossLinks({
      category,
      slug,
      actSections: actDoc.sections,
      ruleSections: rulesDoc.sections,
    }) ?? undefined;

  return {
    sectionCrossLinks,
    sourceLinkIndex,
  };
}