import { Resend } from "resend";
import type { QuoteNotificationPayload, QuoteNotificationResult } from "./quoteNotificationTypes";

function formatLine(label: string, value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }
  return `${label}: ${trimmed}`;
}

function buildAdminEmailText(payload: QuoteNotificationPayload): string {
  const lines = [
    "A new quote request was submitted on XMBroider.",
    "",
    formatLine("Quote ID", payload.quoteId),
    formatLine("Site", payload.siteId),
    formatLine("Source", payload.source),
    "",
    "— Contact —",
    formatLine("Name", payload.name),
    formatLine("Email", payload.email),
    formatLine("Phone", payload.phone),
    "",
    "— Request —",
    formatLine("Service", payload.serviceNeeded),
    formatLine("Quantity", payload.quantity),
    formatLine("Deadline", payload.deadline),
    formatLine("Project details", payload.projectDetails),
  ];

  const previewLines = [
    formatLine("Product", payload.productName),
    formatLine("Brand", payload.productBrand),
    formatLine("Material", payload.productMaterial),
    formatLine("Color", payload.colorName),
    formatLine("Size", payload.size),
    formatLine("Placement", payload.placement),
    formatLine("Decoration", payload.decorationMethod),
    payload.logoWidthMm != null
      ? `Logo width: ${payload.logoWidthMm} mm${
          payload.logoWidthInches != null ? ` (${payload.logoWidthInches.toFixed(2)} in)` : ""
        }`
      : "",
    formatLine("Size preset", payload.sizePresetLabel),
    formatLine("Artwork", payload.artworkUrl),
    formatLine("Preview image", payload.previewImageUrl),
    formatLine("Product image", payload.productImageUrl),
  ].filter(Boolean);

  if (previewLines.length > 0) {
    lines.push("", "— Preview / product —", ...previewLines);
  }

  lines.push(
    "",
    "Open the admin dashboard to review:",
    "https://xmbroider.com/admin/quotes",
    "(Use your local /admin/quotes URL during development.)",
  );

  return lines.filter((line) => line !== "").join("\n");
}

function buildAdminEmailHtml(payload: QuoteNotificationPayload): string {
  const row = (label: string, value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed) {
      return "";
    }
    return `<tr><td style="padding:4px 12px 4px 0;font-weight:600;vertical-align:top;">${label}</td><td style="padding:4px 0;">${escapeHtml(trimmed)}</td></tr>`;
  };

  const link = (label: string, url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed) {
      return "";
    }
    return `<tr><td style="padding:4px 12px 4px 0;font-weight:600;vertical-align:top;">${label}</td><td style="padding:4px 0;"><a href="${escapeHtml(trimmed)}">${escapeHtml(trimmed)}</a></td></tr>`;
  };

  const rows = [
    row("Name", payload.name),
    row("Email", payload.email),
    row("Phone", payload.phone),
    row("Service", payload.serviceNeeded),
    row("Quantity", payload.quantity),
    row("Deadline", payload.deadline),
    row("Project details", payload.projectDetails),
    row("Source", payload.source),
    row("Product", payload.productName),
    row("Color", payload.colorName),
    row("Size", payload.size),
    row("Placement", payload.placement),
    link("Artwork", payload.artworkUrl),
    link("Preview", payload.previewImageUrl),
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#111;line-height:1.5;">
    <h2 style="margin:0 0 12px;">New XMBroider quote request</h2>
    <p style="margin:0 0 16px;">From <strong>${escapeHtml(payload.name)}</strong> · Quote <code>${escapeHtml(payload.quoteId)}</code></p>
    <table style="border-collapse:collapse;">${rows}</table>
    <p style="margin:16px 0 0;"><a href="https://xmbroider.com/admin/quotes">Open /admin/quotes</a> to review.</p>
  </body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCustomerConfirmationText(name: string): string {
  return [
    `Hi ${name},`,
    "",
    "Thank you for your quote request with XMBroider.",
    "",
    "We received your submission and will follow up soon.",
    "",
    "— XMBroider",
  ].join("\n");
}

export async function sendQuoteNotificationEmails(
  payload: QuoteNotificationPayload,
): Promise<QuoteNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const notifyEmail = process.env.QUOTE_NOTIFICATION_EMAIL?.trim();
  const fromEmail = process.env.QUOTE_FROM_EMAIL?.trim();

  if (!apiKey || !notifyEmail || !fromEmail) {
    return {
      ok: true,
      notificationStatus: "not_configured",
      errorSummary: "Email notification is not configured.",
    };
  }

  const resend = new Resend(apiKey);
  const subject = `New XMBroider quote request from ${payload.name}`;

  try {
    const adminResult = await resend.emails.send({
      from: fromEmail,
      to: notifyEmail,
      subject,
      text: buildAdminEmailText(payload),
      html: buildAdminEmailHtml(payload),
      replyTo: payload.email,
    });

    if (adminResult.error) {
      return {
        ok: false,
        notificationStatus: "failed",
        errorSummary: "Unable to send admin notification email.",
      };
    }

    let customerConfirmationSent = false;
    const sendCustomer =
      process.env.SEND_CUSTOMER_QUOTE_CONFIRMATION?.trim().toLowerCase() === "true";

    if (sendCustomer && payload.email) {
      const customerResult = await resend.emails.send({
        from: fromEmail,
        to: payload.email,
        subject: "We received your XMBroider quote request",
        text: buildCustomerConfirmationText(payload.name),
      });
      customerConfirmationSent = !customerResult.error;
    }

    return {
      ok: true,
      notificationStatus: "sent",
      customerConfirmationSent,
    };
  } catch {
    return {
      ok: false,
      notificationStatus: "failed",
      errorSummary: "Unable to send notification email.",
    };
  }
}
