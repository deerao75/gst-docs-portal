export default function PrivacyPolicyPage() {
  return (
    <div className="panel mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-4xl font-semibold text-black">Privacy Policy</h1>
      <div className="mt-8 space-y-5 text-base leading-relaxed text-[var(--muted)]">
        <p>
          Acer Tax &amp; Corporate Services LLP respects your privacy. This
          portal is a reference tool and does not require user registration.
          We do not knowingly collect personal data through routine browsing of
          this website.
        </p>
        <p>
          Standard server logs may record technical information such as IP
          address, browser type, and pages visited for security and performance
          purposes. This data is used only for internal administration and is
          not sold or shared with third parties for marketing.
        </p>
        <p>
          If you contact us via email or phone, any information you provide will
          be handled in accordance with applicable data protection laws and used
          only to respond to your enquiry.
        </p>
        <p>
          For questions regarding this policy, contact{" "}
          <a
            href="mailto:info@acertax.com"
            className="text-brand-orange-dark hover:underline"
          >
            info@acertax.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}