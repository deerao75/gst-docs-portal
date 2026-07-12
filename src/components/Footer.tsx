import Image from "next/image";
import Link from "next/link";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/acts", label: "Acts" },
  { href: "/rules", label: "Rules" },
  { href: "/documents?type=notification", label: "Notifications" },
  { href: "/documents?type=circular", label: "Circulars" },
  { href: "/documents?type=order", label: "Orders" },
  { href: "/documents?type=instruction", label: "Instructions" },
  { href: "/documents?type=advisory", label: "Advisory" },
  { href: "/contact", label: "Contact Us" },
];

const ourWebsites = [
  { href: "https://www.acertax.com", label: "www.acertax.com", desc: "LLP Website" },
  { href: "https://www.acergst.com", label: "www.acergst.com", desc: "GST Case Laws" },
  { href: "https://www.acerres.com", label: "www.acerres.com", desc: "Real Estate" },
];

export default function Footer() {
  const mid = Math.ceil(quickLinks.length / 2);
  const quickLinksLeft = quickLinks.slice(0, mid);
  const quickLinksRight = quickLinks.slice(mid);

  return (
    <footer className="mt-auto bg-brand-navy-deep text-white">
      <div className="accent-bar" />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div>
          <Image
            src="/images/acer-logo.png"
            alt="Acer Tax"
            width={140}
            height={52}
            className="h-10 w-auto rounded-lg bg-white px-2 py-1"
          />
          <p className="mt-4 text-base font-semibold text-brand-orange">
            Acer Tax &amp; Corporate Services LLP
          </p>
          <address className="mt-2 not-italic text-sm leading-relaxed text-slate-400">
            No. 8, 3rd Floor, Serpentine Road,
            <br />
            Kumara Park West, Bengaluru — 560020
          </address>
          <p className="mt-3 text-sm text-slate-400">
            +91 80 23446288 ·{" "}
            <a href="mailto:info@acertax.com" className="text-slate-200 transition-colors hover:text-brand-orange">
              info@acertax.com
            </a>
          </p>
        </div>

        <div>
          <h3 className="section-label mb-4 !text-brand-orange/90">Quick Links</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <ul className="space-y-2">
              {quickLinksLeft.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-300 transition-colors hover:text-brand-orange">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="space-y-2">
              {quickLinksRight.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-300 transition-colors hover:text-brand-orange">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h3 className="section-label mb-4 !text-brand-orange/90">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/disclaimer" className="text-slate-300 transition-colors hover:text-brand-orange">
                Disclaimer
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="text-slate-300 transition-colors hover:text-brand-orange">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/admin/documents" className="text-slate-300 transition-colors hover:text-brand-orange">
                Admin — List editor
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="section-label mb-4 !text-brand-orange/90">Our Websites</h3>
          <ul className="space-y-3 text-sm">
            {ourWebsites.map((site) => (
              <li key={site.href}>
                <a
                  href={site.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <span className="font-semibold text-white transition-colors group-hover:text-brand-orange">
                    {site.label}
                  </span>
                  <span className="block text-slate-500">{site.desc}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-sm text-slate-500 lg:px-6">
        © {new Date().getFullYear()} Acer Tax &amp; Corporate Services LLP. All rights reserved.
      </div>
    </footer>
  );
}