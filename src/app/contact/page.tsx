import ContactForm from "@/components/ContactForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Acer GST Reference Portal",
  description: "Get in touch with Acer Tax & Corporate Services LLP",
};

export default function ContactPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-brand-navy-deep text-white">
        <div className="hero-mesh absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-navy-deep/95 via-brand-navy/90 to-brand-navy-deep/80" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-16">
          <p className="section-label text-brand-orange">Get in touch</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Contact Us
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            Reach out to Acer Tax &amp; Corporate Services LLP for queries about
            this portal or GST matters. We welcome your feedback and suggestions.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 lg:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="info-tile">
            <p className="section-label">Telephone</p>
            <a
              href="tel:+918023446288"
              className="mt-2 block font-semibold text-brand-black hover:text-brand-orange-dark"
            >
              +91 80 23446288
            </a>
          </div>
          <div className="info-tile">
            <p className="section-label">Email</p>
            <a
              href="mailto:info@acertax.com"
              className="mt-2 block font-semibold text-brand-black hover:text-brand-orange-dark"
            >
              info@acertax.com
            </a>
          </div>
          <div className="info-tile">
            <p className="section-label">Address</p>
            <p className="mt-2 font-medium leading-snug text-brand-black">
              No. 8, 3rd Floor, Serpentine Road, Kumara Park West, Bengaluru —
              560020
            </p>
          </div>
        </div>

        <div className="panel px-6 py-8 sm:px-8">
          <h2 className="text-2xl font-bold text-brand-black">Send Feedback</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Tell us how we can improve the portal or report any issues you find.
          </p>
          <div className="mt-6 max-w-2xl">
            <ContactForm />
          </div>
        </div>

      </div>
    </div>
  );
}