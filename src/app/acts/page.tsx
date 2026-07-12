import TextLegislationHome from "@/components/TextLegislationHome";
import { ACTS_CATALOG } from "@/lib/legislation-catalog";

export default function ActsPage() {
  return (
    <TextLegislationHome
      catalog={ACTS_CATALOG}
      category="act"
      pageTitle="GST Acts"
    />
  );
}