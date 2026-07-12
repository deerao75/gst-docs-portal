export type TeamMember = {
  id: string;
  name: string;
  designation: string;
  photo: string;
  linkedin?: string;
  bio: string;
};

/** Profile text sourced from www.acertax.com */
export const teamMembers: TeamMember[] = [
  {
    id: "jayaram-hiregange",
    name: "Jayaram Hiregange",
    designation: "Managing Partner",
    photo: "/images/team/jayaram-hiregange.jpg",
    linkedin: "https://www.linkedin.com/in/jayaram-hiregange-91b9211/",
    bio: `Jayaram holds a Bachelor’s degree in Law (LLB) from the University of Karnataka and a degree in Cost and Management Accountant (CMA) from The Institute of Cost & Management Accountants of India (ICMAI). Jayaram is a veteran in the field of indirect taxation with more than 25+ years of experience in Industry and Big 4 consulting firm. He has spent close to 13 years at PricewaterhouseCoopers (PwC) tax and advisory practice before leaving PwC to setup Acer Tax & Corporate Services LLP in the year 2014.

Jayaram over the years has advised numerous multi-national and Indian companies on a wide variety of matters covering GST, VAT, Service Tax, Excise and Customs. He also has rich experience in dealing with compliance, advisory and litigation matters across the indirect tax spectrum and has advised clients on critical and complex indirect tax matters. Further, he is specialized in supply-chain related advisory and structuring and has worked with various industries / sectors including IT / ITES, Manufacturing, Real-Estate, E-Commerce, SME’s, PSU’s etc.

Jayaram is a reputed name in the industry circles for his knowledge in indirect taxation and is a regular speaker on indirect tax matters at various industry forums.`,
  },
  {
    id: "vani-s",
    name: "Vani S",
    designation: "Managing Partner",
    photo: "/images/team/vani-s.jpg",
    linkedin: "https://www.linkedin.com/in/vanishri-shankaranarayana-2593475b/",
    bio: `Vani has over 20 plus years of professional experience in the field of Corporate Laws, Investments, Regulatory matters, Greenfield Projects, Labour Laws, Intellectual Property laws and Arbitration. She has extensive experience in advising clients in the areas of Mergers / Demergers and Reorganisation, Corporate Restructuring, Foreign Investment Consulting / Establishment of WoS, LLP, Joint Ventures, Corporate Law and other Regulatory matters.

Vani’s core area of expertise involves setting up Joint Ventures, Technical Collaborations, M&A, FDI, Real Estate, Secretarial Audit & Compliance, Regulatory Audit & Compliance, Legal Compliance Audit, Litigation Strategies including Arbitration, Due Diligence, drafting various Contracts, Advising on Corporate, Commercial, Labour & Industrial Laws, Employment Laws, Shareholders Agreements, Consortium Agreements, Bids & Tenders, Environmental Compliances etc. Her experience ranges across sectors – IT, Manufacturing, Automotive OEMs & Auto Components.

Vani has rolled out several training programs on Prevention of Sexual Harassment against Women at workplace etc. She has been involved in several workshops relating to foreign investments in India across sectors, and had represented numerous international companies in setting up industrial corridors and hand holding them on their legal requirements.`,
  },
  {
    id: "prakash-hegde",
    name: "Prakash Hegde",
    designation: "Principal Consultant – Direct Taxation",
    photo: "/images/team/prakash-hegde.jpg",
    linkedin: "https://www.linkedin.com/in/prakash-hegde-3416a8b/",
    bio: `Prakash graduated in Commerce [B.Com.] and Law [LL.B. (Special)] from Karnataka University. He was a University topper both in B.Com. (2nd Rank) and LL.B (1st Rank). He is a Fellow member of the Institute of Chartered Accountants of India (ICAI). He also holds a Masters’ in Business Administration [M.B.A.] from Indira Gandhi National Open University.

Prakash initially worked with a leading Co-Operative giant in South India, The Totgars’ Co-operative Sale Society Ltd. Sirsi as its Chief Executive Officer for about 6 years besides his practice as a Chartered Accountant. Later, he worked with PricewaterhouseCoopers (PwC) for about 10 years in the field of direct taxation and with Deloitte Haskins and Sells for about a year as a Director.

Prakash has advised many leading Indian and multi-national companies on a wide variety of matters covering corporate taxation, expatriate taxation, international taxation etc. He also has rich experience in dealing with compliance, advisory and litigation matters across the direct tax spectrum.

He is a well-known speaker and has conducted many seminars and sessions to clients and co-professionals. He regularly contributes to leading financial newspapers on various direct tax matters.`,
  },
  {
    id: "deepak-rao",
    name: "Deepak Rao",
    designation: "Partner – Indirect Taxation",
    photo: "/images/team/deepak-rao.jpg",
    linkedin: "https://www.linkedin.com/in/deepak-rao-ab6b7834/",
    bio: `Deepak holds a degree in law (LLB) from the Karnataka State Law University, a degree in Cost and Management Accountant (CMA) from The Institute of Cost & Management Accountants of India (ICMAI) and also holds a degree in Management in Business Administration (MBA) from the Institute of Chartered Financial Analyst of India (ICFAI). Deepak is a veteran in the field of indirect taxation with more than 25+ years of experience in Industry and Big 4 consulting.

Deepak spent close to 10 years with the global consumer goods giant Procter & Gamble (P&G) and another 10 years with the leading Big 4 consulting firms, PricewaterhouseCoopers (PwC) and Ernst & Young (EY) before joining Acer Tax & Corporate Services LLP in the year 2016.

Deepak over the years has advised numerous multinational and Indian companies on a wide variety of matters covering GST, VAT, Service Tax, Excise and Customs. Deepak has rich experience in dealing with compliance, advisory and litigation matters across the indirect tax spectrum and has advised clients on critical and complex indirect tax matters. Deepak is specialized in supply-chain related advisory and structuring and has worked with various industries / sectors including IT / ITES, Manufacturing, Real- Estate, Retail, Automobile, E-Commerce, SME’s etc.

Deepak is a prolific speaker and has conducted various seminars and sessions to clients across the industry and in association with CII, FICCI and other industry forms.`,
  },
  {
    id: "bishnu-agarwal",
    name: "Bishnu Agarwal",
    designation: "Partner – Indirect Taxation",
    photo: "/images/team/bishnu-agarwal.jpg",
    linkedin: "https://www.linkedin.com/in/bishnu-agarwal-13b39217/",
    bio: `Bishnu holds a Bachelor’s Degree in Commerce (B.Com) from Bangalore University, fellow membership of Institute of Chartered Accountants (FCA), qualified Company Secretary from Institute of Company Secretaries (CS) and Certified Information System Auditor (CISA) from Information System Audit and Control Association, USA.

He has more than 15 years of experience in the various areas such as Indirect Tax, Internal Financial Control, Audit & CFO Services which includes his stint of about four years with PricewaterhouseCoopers (PwC) dealing in indirect taxes and audits. He has handled matters of clients from diverse industries and has conducted many tax reviews. He has also represented clients in many tax forums.

He has served various fortune 500 companies in the area of indirect taxes and various types of audit.

He is rendering comprehensive professional services in the areas of Indirect Taxes, FTP, Internal Audit including Internal Financial Control and Other Regulatory Compliances.`,
  },
];

export function bioParagraphs(bio: string): string[] {
  return bio
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}