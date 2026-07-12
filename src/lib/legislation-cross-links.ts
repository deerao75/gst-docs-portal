import type { TextSection } from "@/lib/db";
import type {
  LegislationCrossLinkData,
  ResolvedLegislationLink,
} from "@/lib/legislation-cross-links-types";
import fs from "fs";
import path from "path";

export const CGST_ACT_SLUG = "central-goods-and-services-tax-act-2017";
export const CGST_RULES_SLUG = "central-goods-and-services-tax-rules-2017";
export const IGST_ACT_SLUG = "integrated-goods-and-services-tax-act-2017";
export const IGST_RULES_SLUG = "integrated-goods-and-services-tax-rules-2017";

const ACT_RULE_PAIRS: Record<
  string,
  { actSlug: string; rulesSlug: string }
> = {
  [CGST_ACT_SLUG]: { actSlug: CGST_ACT_SLUG, rulesSlug: CGST_RULES_SLUG },
  [CGST_RULES_SLUG]: { actSlug: CGST_ACT_SLUG, rulesSlug: CGST_RULES_SLUG },
  [IGST_ACT_SLUG]: { actSlug: IGST_ACT_SLUG, rulesSlug: IGST_RULES_SLUG },
  [IGST_RULES_SLUG]: { actSlug: IGST_ACT_SLUG, rulesSlug: IGST_RULES_SLUG },
};

const cache = new Map<string, LegislationCrossLinkData | null>();

function crossLinkFilePath(actSlug: string): string {
  return path.join(
    process.cwd(),
    "data",
    "legislation_cross_links",
    `${actSlug}.json`
  );
}

export function getLegislationCrossLinkData(
  actSlug: string
): LegislationCrossLinkData | null {
  if (cache.has(actSlug)) {
    return cache.get(actSlug) ?? null;
  }

  const filePath = crossLinkFilePath(actSlug);
  if (!fs.existsSync(filePath)) {
    cache.set(actSlug, null);
    return null;
  }

  const data = JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  ) as LegislationCrossLinkData;
  cache.set(actSlug, data);
  return data;
}

function indexSectionsByNumber(
  sections: TextSection[]
): Map<string, TextSection> {
  return new Map(sections.map((section) => [section.section_number, section]));
}

function compareLegislationNumber(a: string, b: string): number {
  const parse = (value: string) => {
    const match = /^(\d+)([A-Z]*)$/.exec(value);
    return match
      ? { num: Number(match[1]), suffix: match[2] }
      : { num: 0, suffix: value };
  };
  const left = parse(a);
  const right = parse(b);
  if (left.num !== right.num) return left.num - right.num;
  return left.suffix.localeCompare(right.suffix);
}

function buildHref(
  category: "act" | "rule",
  slug: string,
  section: TextSection | undefined
): string | null {
  if (!section) return null;
  return `/${category}s/${slug}?sectionId=${section.id}`;
}

export function getResolvedLegislationCrossLinks(options: {
  category: "act" | "rule";
  slug: string;
  actSections: TextSection[];
  ruleSections: TextSection[];
}): Record<string, ResolvedLegislationLink[]> | null {
  const { category, slug, actSections, ruleSections } = options;
  const pair = ACT_RULE_PAIRS[slug];
  if (!pair) return null;

  const data = getLegislationCrossLinkData(pair.actSlug);
  if (!data) return null;

  const actByNumber = indexSectionsByNumber(actSections);
  const ruleByNumber = indexSectionsByNumber(ruleSections);
  const resolved: Record<string, ResolvedLegislationLink[]> = {};

  if (category === "act") {
    for (const [actSectionNumber, ruleNumbers] of Object.entries(
      data.act_to_rules
    )) {
      const links = ruleNumbers
        .sort(compareLegislationNumber)
        .map((ruleNumber) => {
          const href = buildHref(
            "rule",
            data.rules_slug,
            ruleByNumber.get(ruleNumber)
          );
          if (!href) return null;
          return {
            label: `Rule ${ruleNumber}`,
            href,
          };
        })
        .filter((link): link is ResolvedLegislationLink => link !== null);

      if (links.length > 0) {
        resolved[actSectionNumber] = links;
      }
    }
    return resolved;
  }

  for (const [ruleNumber, actSectionNumbers] of Object.entries(
    data.rules_to_act
  )) {
    const links = actSectionNumbers
      .sort(compareLegislationNumber)
      .map((actSectionNumber) => {
        const href = buildHref(
          "act",
          data.act_slug,
          actByNumber.get(actSectionNumber)
        );
        if (!href) return null;
        return {
          label: `Section ${actSectionNumber}`,
          href,
        };
      })
      .filter((link): link is ResolvedLegislationLink => link !== null);

    if (links.length > 0) {
      resolved[ruleNumber] = links;
    }
  }

  return resolved;
}

export function getActRulePairForSlug(
  slug: string
): { actSlug: string; rulesSlug: string } | null {
  return ACT_RULE_PAIRS[slug] ?? null;
}