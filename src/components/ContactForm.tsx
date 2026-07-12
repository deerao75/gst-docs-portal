"use client";

import { FormEvent, useState } from "react";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const subject = String(data.get("subject") ?? "Portal Feedback");
    const message = String(data.get("message") ?? "");

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      "",
      message,
    ].join("\n");

    window.location.href = `mailto:info@acertax.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
    form.reset();
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-brand-orange/30 bg-brand-orange/5 px-6 py-8 text-center">
        <p className="text-lg font-semibold text-black">Thank you for your feedback!</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Your email client should open shortly. If it does not, write to{" "}
          <a
            href="mailto:info@acertax.com"
            className="text-brand-orange-dark hover:underline"
          >
            info@acertax.com
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 text-sm font-medium text-brand-orange-dark hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-black">
            Name <span className="text-brand-orange">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-brand-orange"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-black">
            Email <span className="text-brand-orange">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-brand-orange"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="mb-1 block text-sm font-medium text-black">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-brand-orange"
          placeholder="Feedback on the GST Reference Portal"
        />
      </div>

      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-black">
          Message <span className="text-brand-orange">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full resize-y rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-brand-orange"
          placeholder="Share your feedback, suggestions, or report an issue..."
        />
      </div>

      <button type="submit" className="btn-primary !px-6 !py-2.5 !text-sm">
        Send Feedback
      </button>
    </form>
  );
}