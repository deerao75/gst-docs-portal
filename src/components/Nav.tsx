"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const regulationLinks = [
  { href: "/acts", label: "Acts" },
  { href: "/rules", label: "Rules" },
  { href: "/finance-acts", label: "Finance Acts" },
  { href: "/gst-press-releases", label: "Press Releases" },
  { href: "/gst-forms", label: "Forms" },
  { href: "/documents?type=notification", label: "Notifications" },
  { href: "/documents?type=circular", label: "Circulars" },
  { href: "/documents?type=order", label: "Orders" },
  { href: "/documents?type=instruction", label: "Instructions" },
  { href: "/documents?type=advisory", label: "Advisory" },
];

export default function Nav() {
  const pathname = usePathname();
  const [regulationsOpen, setRegulationsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const regulationsRef = useRef<HTMLDivElement>(null);

  const regulationsActive =
    pathname === "/documents" ||
    pathname.startsWith("/acts") ||
    pathname.startsWith("/rules") ||
    pathname.startsWith("/finance-acts") ||
    pathname.startsWith("/gst-press-releases") ||
    pathname.startsWith("/gst-forms");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        regulationsRef.current &&
        !regulationsRef.current.contains(e.target as Node)
      ) {
        setRegulationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setRegulationsOpen(false);
  }, [pathname]);

  const navLinkClass = (active: boolean) =>
    `rounded-lg px-4 py-2.5 text-base font-semibold transition-all duration-200 ${
      active
        ? "bg-brand-orange text-white shadow-sm"
        : "text-brand-black hover:bg-brand-orange-light hover:text-brand-orange-dark"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--header-border)] bg-[var(--header-bg)] shadow-nav backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <Image
            src="/images/acer-logo.png"
            alt="Acer Tax & Corporate Services"
            width={280}
            height={106}
            className="h-12 w-auto transition-opacity group-hover:opacity-90 md:h-14"
            priority
          />
        </Link>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-brand-black lg:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <nav
          className={`${
            mobileOpen
              ? "absolute left-0 right-0 top-full border-b border-[var(--border)] bg-white p-4 shadow-lg"
              : "hidden"
          } lg:flex lg:items-center lg:gap-1`}
        >
          <Link href="/" className={navLinkClass(pathname === "/")}>
            Home
          </Link>

          <Link href="/search" className={navLinkClass(pathname === "/search")}>
            Search
          </Link>

          <div ref={regulationsRef} className="relative">
            <button
              type="button"
              onClick={() => setRegulationsOpen((open) => !open)}
              className={`flex w-full items-center gap-1.5 lg:inline-flex ${navLinkClass(regulationsActive)}`}
              aria-expanded={regulationsOpen}
              aria-haspopup="true"
            >
              <span>Regulations</span>
              <svg
                className={`h-4 w-4 shrink-0 transition-transform ${regulationsOpen ? "rotate-180" : ""}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {regulationsOpen && (
              <ul className="mt-1 rounded-xl border border-[var(--border)] bg-white py-1 shadow-card lg:absolute lg:left-0 lg:top-full lg:z-50 lg:mt-2 lg:min-w-[15rem]">
                {regulationLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setRegulationsOpen(false)}
                      className="block px-4 py-2.5 text-base font-medium text-brand-black transition-colors hover:bg-brand-orange-light hover:text-brand-orange-dark"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link href="/team" className={navLinkClass(pathname === "/team")}>
            Our Team
          </Link>

          <Link href="/contact" className={navLinkClass(pathname === "/contact")}>
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}