export type LegislationItem = {
  title: string;
  summary: string;
  slug: string;
};

export type LegislationCatalog = {
  items: LegislationItem[];
};

export const ACTS_CATALOG: LegislationCatalog = {
  items: [
    {
      title: "Central Goods and Services Tax Act, 2017",
      slug: "central-goods-and-services-tax-act-2017",
      summary:
        "The principal statute for Central GST on intra-state supplies of goods and services. It covers registration, tax rates, returns, assessment, refunds, audits, and appeals for taxable persons.",
    },
    {
      title:
        "Central Goods And Services Tax (Extension To Jammu And Kashmir) Act, 2017",
      slug: "central-goods-and-services-tax-extension-to-jammu-and-kashmir-act-2017",
      summary:
        "Extends the CGST Act to Jammu and Kashmir following its adoption of the national GST framework. Aligns local indirect tax administration with the rest of India.",
    },
    {
      title: "Constitution (One Hundred And First Amendment) Act, 2016",
      slug: "constitution-one-hundred-and-first-amendment-act-2016",
      summary:
        "Constitutional amendment that authorises Parliament and states to levy GST on the supply of goods and services. Provides the legal foundation for replacing multiple indirect taxes with GST.",
    },
    {
      title: "Goods And Services Tax (Compensation To States) Act, 2017",
      slug: "goods-and-services-tax-compensation-to-states-act-2017",
      summary:
        "Enables payment of compensation to states for revenue loss during the GST transition period. Establishes the compensation cess and the institutional framework for disbursements.",
    },
    {
      title:
        "Integrated Goods And Services Tax (Extension To Jammu And Kashmir) Act, 2017",
      slug: "integrated-goods-and-services-tax-extension-to-jammu-and-kashmir-act-2017",
      summary:
        "Extends IGST law to transactions involving Jammu and Kashmir. Ensures inter-state and import supplies involving the UT are taxed under the unified IGST regime.",
    },
    {
      title: "Integrated Goods and Services Tax Act, 2017",
      slug: "integrated-goods-and-services-tax-act-2017",
      summary:
        "Governs IGST on inter-state supplies and imports of goods and services. Sets place-of-supply rules, applicable rates, and the manner of settlement of IGST revenue.",
    },
    {
      title: "Union Territory Goods And Services Tax Act, 2017",
      slug: "union-territory-goods-and-services-tax-act-2017",
      summary:
        "Applies GST in Union Territories without their own legislature, parallel to SGST in states. Regulates registration, payment, returns, and enforcement for UT businesses.",
    },
    {
      title: "Central Goods and Services Tax (Amendment) Act, 2018",
      slug: "central-goods-and-services-tax-amendment-act-2018",
      summary:
        "Amends the CGST Act, 2017 with changes to definitions, reverse charge, input tax credit utilisation, registration and other provisions. Brought into force from 1 February 2019.",
    },
    {
      title: "The Central Goods and Services Tax Amendment Act, 2023",
      slug: "the-central-goods-and-services-tax-amendment-act-2023",
      summary:
        "Amends the CGST Act, 2017 to update definitions, compliance requirements, and enforcement provisions. Gives effect to GST Council recommendations notified during 2023.",
    },
    {
      title: "THE CENTRAL GOODS AND SERVICES TAX (SECOND AMENDMENT) ACT, 2023",
      slug: "the-central-goods-and-services-tax-second-amendment-act-2023",
      summary:
        "Second set of 2023 legislative amendments to the CGST Act for specific policy and procedural changes. Modifies selected sections and schedules with notified effective dates.",
    },
    {
      title: "The Integrated Goods and Services Tax Amendment Act, 2023",
      slug: "the-integrated-goods-and-services-tax-amendment-act-2023",
      summary:
        "Amends the IGST Act, 2017 in line with contemporaneous CGST amendments. Updates provisions on inter-state supplies, imports, and related compliance obligations.",
    },
  ],
};

export const RULES_CATALOG: LegislationCatalog = {
  items: [
    {
      title: "Central Goods and Services Tax Rules, 2017",
      slug: "central-goods-and-services-tax-rules-2017",
      summary:
        "Primary procedural rules under CGST covering registration, invoicing, returns, payment, refunds, and assessments. Operationalises day-to-day compliance under the CGST Act.",
    },
    {
      title: "Integrated Goods and Services Tax Rules, 2017",
      slug: "integrated-goods-and-services-tax-rules-2017",
      summary:
        "Procedural rules for IGST covering registration, returns, refunds, and related compliance. Apply to inter-state and import transactions governed by the IGST Act.",
    },
    {
      title: "Goods and Services Tax Compensation Cess Rules, 2017",
      slug: "goods-and-services-tax-compensation-cess-rules-2017",
      summary:
        "Sets out registration, returns, payment, and record-keeping requirements for compensation cess. Governs procedural compliance for cess-liable registered persons.",
    },
    {
      title: "Goods and services Tax Settlement of funds Rules, 2017",
      slug: "goods-and-services-tax-settlement-of-funds-rules-2017",
      summary:
        "Provides for settlement and transfer of GST revenues among the Centre, states, and Union Territories. Establishes the accounting framework for periodic fund transfers.",
    },
    {
      title:
        "Union Territory Goods and Services Tax (Lakshadweep) Rules, 2017",
      slug: "union-territory-goods-and-services-tax-lakshadweep-rules-2017",
      summary:
        "UTGST procedural rules for Lakshadweep. Provide territory-specific guidance on GST compliance aligned with the UTGST Act.",
    },
    {
      title: "Union Territory Goods and Services Tax (Daman and Diu) Rules, 2017",
      slug: "union-territory-goods-and-services-tax-daman-and-diu-rules-2017",
      summary:
        "UTGST compliance rules for Daman and Diu. Set out operational requirements for tax payment, records, and returns in the territory.",
    },
    {
      title:
        "Union Territory Goods and Services Tax (Dadra and Nagar Haveli) Rules, 2017",
      slug: "union-territory-goods-and-services-tax-dadra-and-nagar-haveli-rules-2017",
      summary:
        "Procedural UTGST rules for Dadra and Nagar Haveli. Guide registration, invoicing, and return filing for taxpayers in the Union Territory.",
    },
    {
      title: "Union Territory Goods and Services Tax (Chandigarh) Rules, 2017",
      slug: "union-territory-goods-and-services-tax-chandigarh-rules-2017",
      summary:
        "UTGST rules applicable to registered persons in Chandigarh. Prescribe local procedural requirements for returns, payment, and documentation under UTGST.",
    },
    {
      title:
        "Union Territory Goods and Services Tax (Andaman and Nicobar Islands) Rules, 2017",
      slug: "union-territory-goods-and-services-tax-andaman-and-nicobar-islands-rules-2017",
      summary:
        "UTGST procedural rules framed for the Andaman and Nicobar Islands. Adapt CGST-style compliance requirements for businesses operating in that territory.",
    },
    {
      title:
        "Goods and Services Tax (Period of Levy and Collection of Cess) Rules, 2022",
      slug: "goods-and-services-tax-period-of-levy-and-collection-of-cess-rules-2022",
      summary:
        "Prescribes the period and manner of levy and collection of GST compensation cess. Supports administration of cess accounts and periodic cess compliance.",
    },
  ],
};