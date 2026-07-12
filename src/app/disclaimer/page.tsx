export default function DisclaimerPage() {
  return (
    <div className="panel mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-4xl font-semibold text-black">Disclaimer</h1>
      <div className="mt-8 space-y-5 text-base leading-relaxed text-[var(--muted)]">
        <p>
          The Acer GST Reference Portal is provided by Acer Tax &amp; Corporate
          Services LLP for general informational purposes only. While every effort
          is made to ensure accuracy, the content — including summaries,
          notifications, and legislative text — should not be relied upon as a
          substitute for professional tax advice.
        </p>
        <p>
          Users must verify all information against original government
          publications and current law before taking any action. Acer Tax &amp;
          Corporate Services LLP accepts no liability for any loss or damage
          arising from use of this portal.
        </p>
        <p>
          Summaries are interpretative aids and do not represent official
          government positions. The portal may be updated, modified, or
          withdrawn without notice.
        </p>
      </div>
    </div>
  );
}