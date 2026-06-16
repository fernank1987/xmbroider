export type QuoteNotificationPayload = {
  quoteId: string;
  siteId: string;
  name: string;
  email: string;
  phone?: string | null;
  serviceNeeded: string;
  quantity?: string | null;
  deadline?: string | null;
  projectDetails: string;
  source: string;
  productName?: string | null;
  productBrand?: string | null;
  productMaterial?: string | null;
  colorName?: string | null;
  size?: string | null;
  placement?: string | null;
  decorationMethod?: string | null;
  logoWidthMm?: number | null;
  logoWidthInches?: number | null;
  sizePresetLabel?: string | null;
  artworkUrl?: string | null;
  previewImageUrl?: string | null;
  productImageUrl?: string | null;
};

export type QuoteNotificationResult = {
  ok: boolean;
  notificationStatus: "sent" | "failed" | "not_configured";
  customerConfirmationSent?: boolean;
  errorSummary?: string;
};
