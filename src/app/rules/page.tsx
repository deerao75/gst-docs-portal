import TextLegislationHome from "@/components/TextLegislationHome";
import { RULES_CATALOG } from "@/lib/legislation-catalog";

export default function RulesPage() {
  return (
    <TextLegislationHome
      catalog={RULES_CATALOG}
      category="rule"
      pageTitle="GST Rules"
    />
  );
}