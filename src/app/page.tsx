import Image from "next/image";
import Link from "next/link";

const firstRow = [
  {
    href: "/acts",
    title: "Acts",
    desc: "CGST, IGST, UTGST and allied legislation — browsable section by section with full statutory text.",
    icon: "§",
    color: "from-amber-500/20 to-orange-600/10",
  },
  {
    href: "/rules",
    title: "Rules",
    desc: "CGST Rules and related procedural provisions — organised by rule number for quick reference.",
    icon: "R",
    color: "from-slate-500/20 to-slate-700/10",
  },
  {
    href: "/finance-acts",
    title: "Finance Acts",
    desc: "Annual Finance Acts since GST (2017) — full official PDFs with year-wise browsing.",
    icon: "F",
    color: "from-cyan-500/15 to-sky-600/10",
  },
  {
    href: "/documents?type=notification",
    title: "Notifications",
    desc: "Central Tax, IGST, UTGST and Compensation Cess notifications with PDF access and summaries.",
    icon: "N",
    color: "from-orange-500/20 to-amber-600/10",
  },
];

const secondRow = [
  {
    href: "/documents?type=circular",
    title: "Circulars",
    desc: "Departmental circulars clarifying GST law, procedures, and compliance requirements.",
    icon: "C",
    color: "from-blue-500/15 to-indigo-600/10",
  },
  {
    href: "/documents?type=order",
    title: "Orders",
    desc: "Official orders issued under GST statutes and rules by the competent authorities.",
    icon: "O",
    color: "from-emerald-500/15 to-teal-600/10",
  },
  {
    href: "/documents?type=instruction",
    title: "Instructions",
    desc: "Administrative instructions and operational guidance for field formations and taxpayers.",
    icon: "I",
    color: "from-violet-500/15 to-purple-600/10",
  },
  {
    href: "/documents?type=advisory",
    title: "Advisory",
    desc: "Expert advisories and interpretative guidance on complex GST matters and transactions.",
    icon: "A",
    color: "from-rose-500/15 to-pink-600/10",
  },
  {
    href: "/gst-press-releases",
    title: "Press Releases",
    desc: "GST Council meeting minutes since 2017 — official outcomes and recommendations by meeting.",
    icon: "P",
    color: "from-indigo-500/15 to-blue-600/10",
  },
];

const thirdRow = [
  {
    href: "/gst-forms",
    title: "Forms",
    desc: "172 statutory GST forms from CGST Rules Part-B — registration, returns, refunds, appeals and more.",
    icon: "Fm",
    color: "from-teal-500/15 to-emerald-600/10",
  },
];

const regulations = [...firstRow, ...secondRow, ...thirdRow];

function RegulationCard({
  card,
}: {
  card: (typeof regulations)[number];
}) {
  return (
    <Link href={card.href} className="doc-card group flex h-full flex-col p-6">
      <span
        className={`icon-badge bg-gradient-to-br ${card.color} !from-brand-navy !to-brand-navy-deep`}
      >
        {card.icon}
      </span>
      <h3 className="mt-4 text-lg font-bold text-brand-black group-hover:text-brand-orange">
        {card.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">
        {card.desc}
      </p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange">
        Explore
        <span
          aria-hidden="true"
          className="transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-brand-navy-deep text-white">
        <div className="hero-mesh absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy-deep via-brand-navy/95 to-brand-navy-deep/90" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:gap-14 lg:px-6 lg:py-20 xl:py-24">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-orange md:text-base">
              Acer Tax &amp; Corporate Services LLP
            </p>
            <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              Your complete
              <span className="mt-2 block bg-gradient-to-r from-brand-orange to-amber-400 bg-clip-text text-transparent">
                GST Reference Library
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-300 md:text-xl">
              Acts, Rules, Finance Acts, Forms, Press Releases, Notifications, Circulars, Orders,
              Instructions and Advisory — built for practitioners, businesses, and compliance teams.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/documents?type=notification" className="btn-primary !px-7 !py-3 !text-base">
                Browse Notifications
              </Link>
              <Link
                href="/acts"
                className="btn-outline !border-white/30 !bg-white/10 !px-7 !py-3 !text-base !text-white hover:!border-brand-orange hover:!bg-brand-orange"
              >
                Explore Acts
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-brand-orange/30 to-amber-500/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/15 shadow-2xl">
              <div className="relative aspect-[5/4] w-full sm:aspect-[4/3]">
                <Image
                  src="/images/hero-banner.jpg"
                  alt="Professional tax and corporate advisory workspace"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-deep/50 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="text-center">
            <p className="section-label">Browse by category</p>
            <h2 className="page-heading mt-2">GST Regulations</h2>
            <p className="page-subheading mx-auto">
              Acts, Rules, Finance Acts, Forms, Press Releases, Notifications, Circulars, Orders,
              Instructions and Advisory collectively form the GST regulatory framework. Select any
              category to explore.
            </p>
          </div>

          {/* Tablet/desktop: 4 centered + 5 rows; each card is 2/10 cols (same width as original 5-up row) */}
          <div className="mt-12 hidden space-y-5 sm:block">
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-10">
              <div className="hidden lg:col-span-1 lg:block" aria-hidden="true" />
              {firstRow.map((card) => (
                <div key={card.href} className="lg:col-span-2">
                  <RegulationCard card={card} />
                </div>
              ))}
              <div className="hidden lg:col-span-1 lg:block" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-10">
              {secondRow.map((card) => (
                <div key={card.href} className="lg:col-span-2">
                  <RegulationCard card={card} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-10">
              <div className="hidden lg:col-span-4 lg:block" aria-hidden="true" />
              {thirdRow.map((card) => (
                <div key={card.href} className="lg:col-span-2">
                  <RegulationCard card={card} />
                </div>
              ))}
              <div className="hidden lg:col-span-4 lg:block" aria-hidden="true" />
            </div>
          </div>

          {/* Mobile: stacked grid */}
          <div className="mt-12 grid gap-5 sm:hidden">
            {regulations.map((card) => (
              <RegulationCard key={card.href} card={card} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}