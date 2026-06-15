"use client";

import type { SiteContent } from "@/lib/siteContent";

type QuoteFormProps = {
  form: SiteContent["quoteSection"]["form"];
};

export default function QuoteForm({ form }: QuoteFormProps) {
  return (
    <form
      className="mt-10 space-y-4 text-left"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-foreground"
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Your name"
            className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="service"
          className="block text-sm font-medium text-foreground"
        >
          Service needed
        </label>
        <select
          id="service"
          name="service"
          className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          defaultValue=""
        >
          <option value="" disabled>
            Select a service
          </option>
          {form.serviceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="details"
          className="block text-sm font-medium text-foreground"
        >
          Project details
        </label>
        <textarea
          id="details"
          name="details"
          rows={4}
          placeholder="Apparel type, quantity, logo placement, deadline..."
          className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-lg bg-accent px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-accent-hover sm:w-auto"
      >
        {form.submitLabel}
      </button>
      <p className="text-xs text-muted">{form.disclaimer}</p>
    </form>
  );
}
