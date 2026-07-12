export type LegislationCrossLinkData = {
  act_slug: string;
  rules_slug: string;
  act_to_rules: Record<string, string[]>;
  rules_to_act: Record<string, string[]>;
};

export type ResolvedLegislationLink = {
  label: string;
  href: string;
};