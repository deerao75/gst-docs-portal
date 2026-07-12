import TeamViewer from "@/components/TeamViewer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Team | Acer GST Reference Portal",
  description: "Meet the professionals behind Acer Tax & Corporate Services LLP",
};

export default function TeamPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-brand-navy-deep text-white">
        <div className="hero-mesh absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy-deep/95 via-brand-navy/90 to-brand-navy-deep/80" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-16">
          <p className="section-label text-brand-orange">Acer Tax &amp; Corporate Services LLP</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Our Team
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            The professionals behind Acer Tax &amp; Corporate Services LLP — experienced
            advisors in direct and indirect taxation, corporate compliance, and GST.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
        <TeamViewer />
      </div>
    </div>
  );
}