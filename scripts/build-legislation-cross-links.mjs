import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const PAIRS = [
  {
    actSlug: "central-goods-and-services-tax-act-2017",
    rulesSlug: "central-goods-and-services-tax-rules-2017",
  },
  {
    actSlug: "integrated-goods-and-services-tax-act-2017",
    rulesSlug: "integrated-goods-and-services-tax-rules-2017",
  },
];

const documents = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "text_documents.json"), "utf-8")
);
const sections = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "text_sections.json"), "utf-8")
);

const SECTION_REF_RE = /section\s+(\d+[A-Z]?)/gi;

function compareLegislationNumber(a, b) {
  const parse = (value) => {
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

function uniqueSorted(values, validSet) {
  return [...new Set(values)]
    .filter((value) => validSet.has(value))
    .sort(compareLegislationNumber);
}

function buildPairLinks({ actSlug, rulesSlug }) {
  const actDoc = documents.find((doc) => doc.slug === actSlug);
  const rulesDoc = documents.find((doc) => doc.slug === rulesSlug);
  if (!actDoc || !rulesDoc) {
    throw new Error(`Missing documents for ${actSlug} / ${rulesSlug}`);
  }

  const actSections = sections.filter((section) => section.document_id === actDoc.id);
  const ruleSections = sections.filter((section) => section.document_id === rulesDoc.id);
  const actSectionNumbers = new Set(
    actSections.map((section) => section.section_number)
  );
  const ruleSectionNumbers = new Set(
    ruleSections.map((section) => section.section_number)
  );

  const actToRules = {};
  const rulesToAct = {};

  for (const rule of ruleSections) {
    const referencedSections = new Set();
    let match;
    while ((match = SECTION_REF_RE.exec(rule.content)) !== null) {
      if (actSectionNumbers.has(match[1])) {
        referencedSections.add(match[1]);
      }
    }

    for (const actSectionNumber of referencedSections) {
      if (!actToRules[actSectionNumber]) {
        actToRules[actSectionNumber] = [];
      }
      actToRules[actSectionNumber].push(rule.section_number);

      if (!rulesToAct[rule.section_number]) {
        rulesToAct[rule.section_number] = [];
      }
      rulesToAct[rule.section_number].push(actSectionNumber);
    }
  }

  for (const key of Object.keys(actToRules)) {
    actToRules[key] = uniqueSorted(actToRules[key], ruleSectionNumbers);
  }
  for (const key of Object.keys(rulesToAct)) {
    rulesToAct[key] = uniqueSorted(rulesToAct[key], actSectionNumbers);
  }

  return {
    act_slug: actSlug,
    rules_slug: rulesSlug,
    act_to_rules: actToRules,
    rules_to_act: rulesToAct,
    stats: {
      act_sections_linked: Object.keys(actToRules).length,
      rules_linked: Object.keys(rulesToAct).length,
      total_act_sections: actSections.length,
      total_rules: ruleSections.length,
    },
  };
}

const outDir = path.join(ROOT, "data", "legislation_cross_links");
fs.mkdirSync(outDir, { recursive: true });

for (const pair of PAIRS) {
  const output = buildPairLinks(pair);
  const outPath = path.join(outDir, `${pair.actSlug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log("Wrote", outPath);
  console.log(output.stats);
}