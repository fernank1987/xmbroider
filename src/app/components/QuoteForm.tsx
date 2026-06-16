"use client";

import { useCallback, useRef, useState } from "react";
import QuoteSuccessPanel from "./QuoteSuccessPanel";
import TurnstileWidget, { type TurnstileWidgetHandle } from "./TurnstileWidget";
import {
  getInitialTurnstileToken,
  getTurnstileStatusText,
  isQuoteSubmissionAvailable,
  isTurnstileDevBypassActive,
  isTurnstileSubmitReady,
  submitQuoteRequest,
  TURNSTILE_EXPIRED_MESSAGE,
  TURNSTILE_MISSING_CHECK_MESSAGE,
} from "@/lib/turnstileClient";
import type { SiteContent } from "@/lib/siteContent";

type QuoteFormProps = {
  siteId: string;
  form: SiteContent["quoteSection"]["form"];
};

type QuoteFormFields = {
  name: string;
  email: string;
  phone: string;
  serviceNeeded: string;
  quantity: string;
  deadline: string;
  projectDetails: string;
};

const emptyFields: QuoteFormFields = {
  name: "",
  email: "",
  phone: "",
  serviceNeeded: "",
  quantity: "",
  deadline: "",
  projectDetails: "",
};

const QUOTE_SUCCESS_MESSAGE = "Quote request received. We'll follow up soon.";

function getSubmitErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to submit your quote request. Please try again.";
}

function validateFields(fields: QuoteFormFields): string | null {
  if (!fields.name.trim()) {
    return "Name is required.";
  }
  if (!fields.email.trim()) {
    return "Email is required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    return "Enter a valid email address.";
  }
  if (!fields.serviceNeeded.trim()) {
    return "Service needed is required.";
  }
  if (!fields.projectDetails.trim()) {
    return "Project details are required.";
  }
  return null;
}

export default function QuoteForm({ siteId, form }: QuoteFormProps) {
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const turnstileDevBypass = isTurnstileDevBypassActive();
  const [fields, setFields] = useState<QuoteFormFields>(emptyFields);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(
    getInitialTurnstileToken(),
  );
  const [turnstileExpired, setTurnstileExpired] = useState(false);
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const submissionAvailable = isQuoteSubmissionAvailable();

  const resetTurnstile = useCallback(() => {
    setTurnstileExpired(false);
    if (turnstileDevBypass) {
      setTurnstileToken(getInitialTurnstileToken());
      return;
    }
    turnstileRef.current?.reset();
  }, [turnstileDevBypass]);

  const handleTurnstileTokenChange = useCallback((token: string | null) => {
    setTurnstileToken(token);
    if (token) {
      setTurnstileExpired(false);
      setErrorMessage(null);
    }
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileExpired(true);
    setErrorMessage(TURNSTILE_EXPIRED_MESSAGE);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileExpired(false);
    setErrorMessage(TURNSTILE_MISSING_CHECK_MESSAGE);
  }, []);

  const updateField = (field: keyof QuoteFormFields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    setErrorMessage(null);
  };

  const handleSubmitAnother = () => {
    setSubmitted(false);
    setErrorMessage(null);
    setFields(emptyFields);
    setTurnstileToken(turnstileDevBypass ? getInitialTurnstileToken() : null);
    setTurnstileExpired(false);
    setTurnstileWidgetKey((current) => current + 1);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!submissionAvailable) {
      setErrorMessage(
        "Quote requests are temporarily unavailable. Please contact us directly by phone or email.",
      );
      return;
    }

    const validationError = validateFields(fields);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!isTurnstileSubmitReady(turnstileToken)) {
      setErrorMessage(TURNSTILE_MISSING_CHECK_MESSAGE);
      return;
    }

    setSubmitting(true);

    try {
      const { quoteId } = await submitQuoteRequest({
        siteId,
        turnstileToken: turnstileToken!,
        quote: {
          name: fields.name,
          email: fields.email,
          phone: fields.phone || undefined,
          serviceNeeded: fields.serviceNeeded,
          quantity: fields.quantity || undefined,
          deadline: fields.deadline || undefined,
          projectDetails: fields.projectDetails,
        },
      });

      if (process.env.NODE_ENV === "development") {
        console.log("[quote] created", {
          quoteId,
          source: "public_quote_form",
        });
      }

      setFields(emptyFields);
      setSubmitted(true);
    } catch (error) {
      setErrorMessage(getSubmitErrorMessage(error));
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  const turnstileStatusText = getTurnstileStatusText({
    token: turnstileToken,
    expired: turnstileExpired,
    devBypass: turnstileDevBypass,
  });

  const inputClassName =
    "mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60";

  if (submitted) {
    return (
      <div className="mt-10">
        <QuoteSuccessPanel
          title="Quote request received"
          message={QUOTE_SUCCESS_MESSAGE}
          primaryAction={{
            label: "Submit another quote",
            onClick: handleSubmitAnother,
          }}
        />
      </div>
    );
  }

  return (
    <form className="mt-10 space-y-4 text-left" onSubmit={(event) => void handleSubmit(event)}>
      {!submissionAvailable && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Online quote submission is unavailable right now. Please use the contact
          details on this page to reach us directly.
        </div>
      )}

      {turnstileDevBypass && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Turnstile keys are not configured. Development anti-spam bypass is active.
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="quote-name" className="block text-sm font-medium text-foreground">
            Name <span className="text-accent">*</span>
          </label>
          <input
            id="quote-name"
            name="name"
            type="text"
            required
            value={fields.name}
            disabled={submitting}
            placeholder="Your name"
            onChange={(event) => updateField("name", event.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="quote-email" className="block text-sm font-medium text-foreground">
            Email <span className="text-accent">*</span>
          </label>
          <input
            id="quote-email"
            name="email"
            type="email"
            required
            value={fields.email}
            disabled={submitting}
            placeholder="you@company.com"
            onChange={(event) => updateField("email", event.target.value)}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="quote-phone" className="block text-sm font-medium text-foreground">
            Phone
          </label>
          <input
            id="quote-phone"
            name="phone"
            type="tel"
            value={fields.phone}
            disabled={submitting}
            placeholder="(401) 555-0100"
            onChange={(event) => updateField("phone", event.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="quote-service" className="block text-sm font-medium text-foreground">
            Service needed <span className="text-accent">*</span>
          </label>
          <select
            id="quote-service"
            name="serviceNeeded"
            required
            value={fields.serviceNeeded}
            disabled={submitting}
            onChange={(event) => updateField("serviceNeeded", event.target.value)}
            className={inputClassName}
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="quote-quantity" className="block text-sm font-medium text-foreground">
            Quantity
          </label>
          <input
            id="quote-quantity"
            name="quantity"
            type="text"
            value={fields.quantity}
            disabled={submitting}
            placeholder="e.g. 24 polos"
            onChange={(event) => updateField("quantity", event.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="quote-deadline" className="block text-sm font-medium text-foreground">
            Deadline
          </label>
          <input
            id="quote-deadline"
            name="deadline"
            type="text"
            value={fields.deadline}
            disabled={submitting}
            placeholder="e.g. March 15"
            onChange={(event) => updateField("deadline", event.target.value)}
            className={inputClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor="quote-details" className="block text-sm font-medium text-foreground">
          Project details <span className="text-accent">*</span>
        </label>
        <textarea
          id="quote-details"
          name="projectDetails"
          rows={4}
          required
          value={fields.projectDetails}
          disabled={submitting}
          placeholder="Apparel type, logo placement, colors, special instructions..."
          onChange={(event) => updateField("projectDetails", event.target.value)}
          className={inputClassName}
        />
      </div>

      {!turnstileDevBypass && (
        <div className="space-y-2">
          <TurnstileWidget
            key={turnstileWidgetKey}
            ref={turnstileRef}
            onTokenChange={handleTurnstileTokenChange}
            onExpire={handleTurnstileExpire}
            onError={handleTurnstileError}
          />
          <p
            className={`text-sm ${
              isTurnstileSubmitReady(turnstileToken)
                ? "text-emerald-700"
                : turnstileExpired
                  ? "text-amber-700"
                  : "text-muted"
            }`}
          >
            {turnstileStatusText}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={
          submitting || !submissionAvailable || !isTurnstileSubmitReady(turnstileToken)
        }
        className="w-full rounded-lg bg-accent px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitting ? "Submitting…" : form.submitLabel}
      </button>
      <p className="text-xs text-muted">{form.disclaimer}</p>
    </form>
  );
}
