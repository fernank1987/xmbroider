"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteQuoteRequest, type DeleteQuoteRequestResult } from "@/lib/adminQuoteRequestsClient";
import {
  listQuoteRequests,
  markQuoteRequestAsRead,
  QUOTE_REQUEST_STATUSES,
  updateQuoteRequestStatus,
  type QuoteLogoPlacement,
  type QuoteRequest,
  type QuoteNotificationStatus,
  type QuoteRequestSource,
  type QuoteRequestStatus,
} from "@/lib/firebase/quoteRepository";
import { PLACEMENT_LABELS, type Placement } from "@/lib/logoPreview";
import { mmToInches } from "@/lib/logoSize";
import { PREVIEW_CALIBRATION_SOURCE_LABELS } from "@/lib/previewCalibration";
import { isQuoteUnread, countUnreadQuotes } from "@/lib/quoteUnread";
import {
  ESTIMATOR_COMPLEXITY_LABELS,
  ESTIMATOR_PLACEMENT_LABELS,
  formatEstimateCurrency,
  PRICE_ESTIMATE_DISCLAIMER,
} from "@/lib/pricing/embroideryEstimator";
import { siteContent } from "@/lib/siteContent";
import {
  adminBadgeMuted,
  adminBadgeNew,
  adminBodyText,
  adminCard,
  adminEmptyIcon,
  adminEmptyIconWrap,
  adminEmptyTitle,
  adminGalleryThumb,
  adminInput,
  adminLabel,
  adminNotice,
  adminSectionTitle,
  adminTableBody,
  adminTableCellMuted,
  adminTableCellSubtle,
  adminTableCellTitle,
  adminTableHead,
  adminTableHeadCell,
  adminTableWrap,
  adminTableScroll,
  adminTableActionsHeadCell,
  adminTableActionsCell,
} from "../lib/adminStyles";
import type { SaveStatusApi } from "../lib/useSaveStatus";
import { useSaveStatus } from "../lib/useSaveStatus";
import AdminSaveButton from "./AdminSaveButton";
import SaveStatusMessage from "./SaveStatusMessage";
import { useAdminAuth } from "./AdminAuthProvider";

const SITE_ID = siteContent.siteId;

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function formatQuoteDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatStatusLabel(status: QuoteRequestStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getServiceLabel(value: string): string {
  const match = siteContent.quoteSection.form.serviceOptions.find(
    (option) => option.value === value,
  );
  return match?.label ?? value;
}

function formatSource(source: QuoteRequestSource): string {
  return source === "logo_preview_tool" ? "Logo preview tool" : "Public quote form";
}

function formatProductType(quote: QuoteRequest): string {
  if (quote.productName) {
    return quote.productName;
  }
  if (quote.productLabel) {
    return quote.productLabel;
  }
  if (quote.productType) {
    return quote.productType;
  }
  return "—";
}

function formatColorName(quote: QuoteRequest): string {
  return quote.colorName ?? "—";
}

function formatPlacement(value: string | null): string {
  if (!value) {
    return "—";
  }
  return PLACEMENT_LABELS[value as Placement] ?? value;
}

function formatLogoDimensions(quote: QuoteRequest): string | null {
  if (quote.logoWidthMm !== null) {
    const widthInches =
      quote.logoWidthInches !== null
        ? quote.logoWidthInches
        : mmToInches(quote.logoWidthMm);
    let text = `${quote.logoWidthMm} mm (${widthInches.toFixed(2)} in) wide`;
    if (quote.estimatedLogoHeightMm !== null) {
      text += ` · ${quote.estimatedLogoHeightMm.toFixed(1)} mm (${mmToInches(
        quote.estimatedLogoHeightMm,
      ).toFixed(2)} in) tall`;
    }
    if (quote.sizePresetLabel) {
      text += ` · ${quote.sizePresetLabel}`;
    }
    return text;
  }
  if (quote.logoSize !== null) {
    return `${quote.logoSize}% of mockup width (legacy)`;
  }
  return null;
}

function formatLogoPlacementDimensions(placement: QuoteLogoPlacement): string {
  let text = `${placement.logoWidthMm} mm (${placement.logoWidthInches.toFixed(2)} in) wide`;
  if (placement.estimatedLogoHeightMm !== null) {
    text += ` · ${placement.estimatedLogoHeightMm.toFixed(1)} mm (${mmToInches(
      placement.estimatedLogoHeightMm,
    ).toFixed(2)} in) tall`;
  }
  if (placement.sizePresetLabel) {
    text += ` · ${placement.sizePresetLabel}`;
  }
  return text;
}

function getQuoteLogoEntries(quote: QuoteRequest): QuoteLogoPlacement[] {
  if (quote.logoPlacements && quote.logoPlacements.length > 0) {
    return quote.logoPlacements;
  }

  const legacyArtworkUrl =
    quote.artworkUrl ??
    (quote as QuoteRequest & { logoUrl?: string | null }).logoUrl ??
    null;
  const legacyArtworkStoragePath =
    quote.artworkStoragePath ??
    (quote as QuoteRequest & { logoStoragePath?: string | null }).logoStoragePath ??
    "";

  if (
    legacyArtworkUrl &&
    quote.placement &&
    quote.logoWidthMm !== null &&
    quote.logoWidthInches !== null &&
    quote.logoPositionX !== null &&
    quote.logoPositionY !== null
  ) {
    return [
      {
        label: "Logo 1",
        artworkUrl: legacyArtworkUrl,
        artworkStoragePath: legacyArtworkStoragePath,
        placement: quote.placement,
        logoWidthMm: quote.logoWidthMm,
        logoWidthInches: quote.logoWidthInches,
        estimatedLogoHeightMm: quote.estimatedLogoHeightMm,
        positionPercentX: quote.logoPositionX,
        positionPercentY: quote.logoPositionY,
        sizePresetLabel: quote.sizePresetLabel,
      },
    ];
  }

  if (legacyArtworkUrl) {
    return [
      {
        label: "Logo 1",
        artworkUrl: legacyArtworkUrl,
        artworkStoragePath: legacyArtworkStoragePath,
        placement: quote.placement ?? "left_chest",
        logoWidthMm: quote.logoWidthMm ?? 0,
        logoWidthInches:
          quote.logoWidthInches ??
          (quote.logoWidthMm !== null ? mmToInches(quote.logoWidthMm) : 0),
        estimatedLogoHeightMm: quote.estimatedLogoHeightMm,
        positionPercentX: quote.logoPositionX ?? 0,
        positionPercentY: quote.logoPositionY ?? 0,
        sizePresetLabel: quote.sizePresetLabel,
      },
    ];
  }

  return [];
}

function getArtworkDownloadFilename(entry: QuoteLogoPlacement): string {
  const fromPath = entry.artworkStoragePath?.split("/").pop()?.trim();
  if (fromPath) {
    return fromPath;
  }
  const labelSlug = entry.label.toLowerCase().replace(/\s+/g, "-");
  return `${labelSlug}-artwork.png`;
}

function formatLogoPosition(entry: QuoteLogoPlacement): string | null {
  if (entry.logoWidthMm <= 0) {
    return null;
  }
  return `${entry.positionPercentX.toFixed(1)}% · ${entry.positionPercentY.toFixed(1)}%`;
}

function ArtworkActionLinks({
  artworkUrl,
  downloadFilename,
  compact = false,
}: {
  artworkUrl: string;
  downloadFilename: string;
  compact?: boolean;
}) {
  const buttonClass = compact
    ? "inline-flex items-center rounded border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 admin-dark:border-zinc-600 admin-dark:text-zinc-300 admin-dark:hover:bg-zinc-800"
    : "inline-flex items-center rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 admin-dark:border-zinc-600 admin-dark:text-zinc-300 admin-dark:hover:bg-zinc-800";

  return (
    <div className="flex flex-wrap gap-2">
      <a href={artworkUrl} target="_blank" rel="noreferrer" className={buttonClass}>
        Open artwork
      </a>
      <a
        href={artworkUrl}
        download={downloadFilename}
        target="_blank"
        rel="noreferrer"
        className={buttonClass}
      >
        Download artwork
      </a>
    </div>
  );
}

function UploadedArtworkCard({
  entry,
  quoteName,
  compact = false,
}: {
  entry: QuoteLogoPlacement;
  quoteName: string;
  compact?: boolean;
}) {
  const thumbSizeClass = compact ? "h-20 w-20" : "h-24 w-24";
  const position = formatLogoPosition(entry);
  const hasSize = entry.logoWidthMm > 0;

  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-2.5 admin-dark:border-zinc-700 admin-dark:bg-zinc-900/40">
      <a
        href={entry.artworkUrl}
        target="_blank"
        rel="noreferrer"
        className={`${thumbSizeClass} shrink-0`}
      >
        <div className={`${adminGalleryThumb} h-full w-full`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.artworkUrl}
            alt={`${entry.label} artwork for ${quoteName}`}
            className="max-h-full max-w-full object-contain p-1.5"
          />
        </div>
      </a>
      <div className="min-w-0 flex-1 space-y-1">
        <p className={`text-sm font-medium ${adminTableCellTitle}`}>{entry.label}</p>
        <p className={`text-xs ${adminTableCellMuted}`}>
          Placement: {formatPlacement(entry.placement)}
        </p>
        {hasSize ? (
          <p className={`text-xs ${adminTableCellMuted}`}>
            Size: {formatLogoPlacementDimensions(entry)}
          </p>
        ) : null}
        {position ? (
          <p className={`text-xs ${adminTableCellSubtle}`}>Position: {position}</p>
        ) : null}
        <ArtworkActionLinks
          artworkUrl={entry.artworkUrl}
          downloadFilename={getArtworkDownloadFilename(entry)}
          compact={compact}
        />
      </div>
    </div>
  );
}

function UploadedArtworkSection({
  entries,
  quoteName,
  compact = false,
}: {
  entries: QuoteLogoPlacement[];
  quoteName: string;
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div>
      <p className={adminLabel}>Uploaded artwork</p>
      <div className={`mt-2 grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
        {entries.map((entry) => (
          <UploadedArtworkCard
            key={`${entry.label}-${entry.artworkUrl}`}
            entry={entry}
            quoteName={quoteName}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

function ProductPhotoSection({
  productImageUrl,
  quoteName,
  compact = false,
}: {
  productImageUrl: string;
  quoteName: string;
  compact?: boolean;
}) {
  const thumbSizeClass = compact ? "w-20" : "w-28";

  return (
    <div>
      <p className={adminLabel}>Product photo</p>
      <a
        href={productImageUrl}
        target="_blank"
        rel="noreferrer"
        className={`mt-2 block ${thumbSizeClass}`}
      >
        <div className={adminGalleryThumb}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={productImageUrl}
            alt={`Product photo for ${quoteName}`}
            className="max-h-full max-w-full object-contain p-2"
          />
        </div>
      </a>
      <p className={`mt-1 text-xs ${adminTableCellSubtle}`}>Catalog product image</p>
    </div>
  );
}

function formatCalibrationInfo(quote: QuoteRequest): string | null {
  if (quote.previewCalibrationSource) {
    return PREVIEW_CALIBRATION_SOURCE_LABELS[quote.previewCalibrationSource];
  }
  if (quote.previewCalibrationUsed) {
    return "Calibrated garment bounds";
  }
  return null;
}

function formatQuoteProductMeta(quote: QuoteRequest): string | null {
  const parts: string[] = [];
  if (quote.productBrand) {
    parts.push(quote.productBrand);
  }
  if (quote.productMaterial) {
    parts.push(quote.productMaterial);
  }
  if (quote.decorationMethod) {
    parts.push(quote.decorationMethod);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatNotificationStatus(status: QuoteNotificationStatus | null): string {
  switch (status) {
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    case "not_configured":
      return "Not configured";
    case "pending":
      return "Pending";
    default:
      return "Unknown";
  }
}

function getNotificationStatusClassName(status: QuoteNotificationStatus | null): string {
  switch (status) {
    case "sent":
      return "text-emerald-700 admin-dark:text-emerald-300";
    case "failed":
      return "text-red-700 admin-dark:text-red-300";
    case "not_configured":
      return "text-amber-700 admin-dark:text-amber-300";
    case "pending":
      return "text-slate-600 admin-dark:text-slate-300";
    default:
      return adminTableCellMuted;
  }
}

function QuoteNotificationDetails({ quote }: { quote: QuoteRequest }) {
  return (
    <div className="space-y-1">
      <p className={adminLabel}>Email notification</p>
      <p className={`text-sm font-medium ${getNotificationStatusClassName(quote.notificationStatus)}`}>
        {formatNotificationStatus(quote.notificationStatus)}
      </p>
      {quote.notificationSentAt && (
        <p className={`text-xs ${adminTableCellSubtle}`}>
          Sent {formatQuoteDate(quote.notificationSentAt)}
        </p>
      )}
      {quote.notificationErrorSummary && (
        <p className="text-xs text-amber-700 admin-dark:text-amber-400">
          {quote.notificationErrorSummary}
        </p>
      )}
    </div>
  );
}

function QuoteUnreadBadge({ quote }: { quote: QuoteRequest }) {
  if (!isQuoteUnread(quote)) {
    return null;
  }
  return <span className={adminBadgeNew}>New</span>;
}

function QuoteMetaBadges({ quote }: { quote: QuoteRequest }) {
  const badges: string[] = [];
  const logoEntries = getQuoteLogoEntries(quote);
  badges.push(formatSource(quote.source));
  if (quote.productName) {
    badges.push(quote.productName);
  }
  if (quote.colorName) {
    badges.push(quote.colorName);
  }
  if (quote.size) {
    badges.push(`Size ${quote.size}`);
  }
  if (logoEntries.length > 1) {
    badges.push(`${logoEntries.length} logos`);
  } else if (logoEntries.length === 1) {
    badges.push(formatPlacement(logoEntries[0].placement));
  } else if (quote.placement) {
    badges.push(formatPlacement(quote.placement));
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span key={badge} className={adminBadgeMuted}>
          {badge}
        </span>
      ))}
    </div>
  );
}

function QuoteRowActions({
  quote,
  saveStatus,
  onMarkReviewed,
  onDeleted,
}: {
  quote: QuoteRequest;
  saveStatus: SaveStatusApi;
  onMarkReviewed: (quoteId: string) => void;
  onDeleted: (result: DeleteQuoteRequestResult) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      {isQuoteUnread(quote) ? (
        <AdminSaveButton
          actionKey={`quote:${quote.id}:markRead`}
          saveStatus={saveStatus}
          idleLabel="Mark as reviewed"
          savingLabel="Saving…"
          savedLabel="Reviewed"
          variant="outline"
          size="xs"
          onClick={() => onMarkReviewed(quote.id)}
        />
      ) : null}
      <QuoteDeleteButton quote={quote} saveStatus={saveStatus} onDeleted={onDeleted} />
    </div>
  );
}

function QuoteDeleteButton({
  quote,
  saveStatus,
  onDeleted,
}: {
  quote: QuoteRequest;
  saveStatus: SaveStatusApi;
  onDeleted: (result: DeleteQuoteRequestResult) => void;
}) {
  const { user } = useAdminAuth();

  const handleDelete = () => {
    if (
      !window.confirm(
        "Delete this quote request and its uploaded files? This cannot be undone.",
      )
    ) {
      return;
    }

    if (!user) {
      return;
    }

    void saveStatus.runAction(
      `quote:${quote.id}:delete`,
      async () => {
        const idToken = await user.getIdToken(true);
        const result = await deleteQuoteRequest({
          quoteRequestId: quote.id,
          idToken,
        });
        onDeleted(result);
      },
      { savedMessage: "Deleted" },
    );
  };

  return (
    <AdminSaveButton
      actionKey={`quote:${quote.id}:delete`}
      saveStatus={saveStatus}
      idleLabel="Delete"
      savingLabel="Deleting…"
      savedLabel="Deleted"
      variant="danger"
      size="xs"
      onClick={handleDelete}
      disabled={!user}
    />
  );
}

function QuotePriceEstimateSection({
  quote,
  compact = false,
}: {
  quote: QuoteRequest;
  compact?: boolean;
}) {
  const estimate = quote.priceEstimate;

  if (compact) {
    if (!estimate) {
      return (
        <p className={`text-xs ${adminTableCellSubtle}`}>No price estimate</p>
      );
    }

    return (
      <div className="mt-2 space-y-1 rounded border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-xs admin-dark:border-zinc-700 admin-dark:bg-zinc-900/50">
        <p className="font-medium text-slate-800 admin-dark:text-zinc-200">
          Est. {formatEstimateCurrency(estimate.estimatedTotal)}
        </p>
        <p className={adminTableCellSubtle}>
          {estimate.quantity} ·{" "}
          {ESTIMATOR_PLACEMENT_LABELS[estimate.placement] ?? estimate.placement}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 admin-dark:border-zinc-700 admin-dark:bg-zinc-900/50">
      <p className={`text-xs font-semibold uppercase tracking-wide ${adminBodyText}`}>
        Price estimate
      </p>

      {estimate ? (
        <>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className={adminLabel}>SKU</dt>
              <dd className={adminTableCellMuted}>{estimate.productSku}</dd>
            </div>
            <div>
              <dt className={adminLabel}>Quantity</dt>
              <dd className={adminTableCellMuted}>{estimate.quantity}</dd>
            </div>
            <div>
              <dt className={adminLabel}>Placement</dt>
              <dd className={adminTableCellMuted}>
                {ESTIMATOR_PLACEMENT_LABELS[estimate.placement] ?? estimate.placement}
              </dd>
            </div>
            <div>
              <dt className={adminLabel}>Complexity</dt>
              <dd className={adminTableCellMuted}>
                {ESTIMATOR_COMPLEXITY_LABELS[estimate.complexity] ?? estimate.complexity}
              </dd>
            </div>
            <div>
              <dt className={adminLabel}>Blank shirts</dt>
              <dd className={adminTableCellMuted}>
                {formatEstimateCurrency(estimate.blankSubtotal)}
              </dd>
            </div>
            <div>
              <dt className={adminLabel}>Embroidery</dt>
              <dd className={adminTableCellMuted}>
                {formatEstimateCurrency(estimate.decorationSubtotal)}
              </dd>
            </div>
            <div>
              <dt className={adminLabel}>Setup / digitizing</dt>
              <dd className={adminTableCellMuted}>
                {estimate.setupFeeWaived ? (
                  <span className="space-y-1">
                    <span className="block">Waived</span>
                    <span className={`block text-xs ${adminTableCellSubtle}`}>
                      Original setup fee:{" "}
                      {formatEstimateCurrency(estimate.setupFeeOriginal)}
                    </span>
                    {estimate.setupFeeWaivedAtQty !== null && (
                      <span className={`block text-xs ${adminTableCellSubtle}`}>
                        Waived at quantity: {estimate.setupFeeWaivedAtQty}
                      </span>
                    )}
                  </span>
                ) : (
                  formatEstimateCurrency(estimate.setupFeeApplied)
                )}
              </dd>
            </div>
            <div>
              <dt className={adminLabel}>Estimated total</dt>
              <dd className="font-semibold text-slate-900 admin-dark:text-white">
                {formatEstimateCurrency(estimate.estimatedTotal)}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500 admin-dark:text-zinc-500">
            {PRICE_ESTIMATE_DISCLAIMER} · {estimate.pricingVersion}
          </p>
        </>
      ) : (
        <p className={`text-sm ${adminTableCellMuted}`}>No estimate saved with this request.</p>
      )}

      <div className="border-t border-slate-200 pt-3 admin-dark:border-zinc-700">
        <p className={`text-xs font-semibold uppercase tracking-wide ${adminBodyText}`}>
          Final pricing (admin)
        </p>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className={adminLabel}>Final stitch count</dt>
            <dd className={adminTableCellMuted}>
              {quote.finalStitchCount ?? "—"}
            </dd>
          </div>
          <div>
            <dt className={adminLabel}>Final decoration price</dt>
            <dd className={adminTableCellMuted}>
              {quote.finalDecorationPrice !== null
                ? formatEstimateCurrency(quote.finalDecorationPrice)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className={adminLabel}>Final setup fee</dt>
            <dd className={adminTableCellMuted}>
              {quote.finalSetupFee !== null
                ? formatEstimateCurrency(quote.finalSetupFee)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className={adminLabel}>Final total</dt>
            <dd className={adminTableCellMuted}>
              {quote.finalTotal !== null ? formatEstimateCurrency(quote.finalTotal) : "—"}
            </dd>
          </div>
          {quote.finalPricingNotes && (
            <div className="sm:col-span-2">
              <dt className={adminLabel}>Final pricing notes</dt>
              <dd className={`whitespace-pre-wrap ${adminTableCellMuted}`}>
                {quote.finalPricingNotes}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

function QuotePreviewDetails({
  quote,
  compact = false,
}: {
  quote: QuoteRequest;
  compact?: boolean;
}) {
  if (quote.source !== "logo_preview_tool") {
    return (
      <div className="space-y-2">
        <QuoteMetaBadges quote={quote} />
        <p className={`text-sm ${adminTableCellMuted}`}>
          Standard quote form submission.
        </p>
      </div>
    );
  }

  const logoEntries = getQuoteLogoEntries(quote);
  const compositePreviewUrl = quote.previewCompositeUrl ?? quote.previewImageUrl;
  const hasCompositePreview = Boolean(compositePreviewUrl);
  const previewSizeClass = compact ? "max-w-[140px]" : "max-w-2xl";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <QuoteMetaBadges quote={quote} />
      {hasCompositePreview && (
        <div>
          <p className={adminLabel}>Customer preview mockup</p>
          <a
            href={compositePreviewUrl!}
            target="_blank"
            rel="noreferrer"
            className={`mt-2 block ${previewSizeClass}`}
          >
            <div className={`${adminGalleryThumb} !aspect-[4/3] !h-auto !w-full ${previewSizeClass}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={compositePreviewUrl!}
                alt={`Customer preview mockup for ${quote.name}`}
                className="h-full w-full object-contain p-2"
              />
            </div>
          </a>
        </div>
      )}
      {!hasCompositePreview && quote.previewCompositeExportError && (
        <p className="text-xs text-amber-700 admin-dark:text-amber-400">
          Composite preview unavailable: {quote.previewCompositeExportError}
        </p>
      )}
      {hasCompositePreview && quote.previewCompositeExportError && (
        <p className="text-xs text-slate-500 admin-dark:text-zinc-400">
          Export note: {quote.previewCompositeExportError}
        </p>
      )}

      <UploadedArtworkSection
        entries={logoEntries}
        quoteName={quote.name}
        compact={compact}
      />

      {!compact && (
      <>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className={adminLabel}>Product</dt>
          <dd className={adminTableCellMuted}>{formatProductType(quote)}</dd>
        </div>
        <div>
          <dt className={adminLabel}>Color</dt>
          <dd className={adminTableCellMuted}>{formatColorName(quote)}</dd>
        </div>
        {quote.size && (
          <div>
            <dt className={adminLabel}>Size</dt>
            <dd className={adminTableCellMuted}>{quote.size}</dd>
          </div>
        )}
        {quote.productId && (
          <div>
            <dt className={adminLabel}>Product ID</dt>
            <dd className={adminTableCellMuted}>{quote.productId}</dd>
          </div>
        )}
        <div>
          <dt className={adminLabel}>Placement</dt>
          <dd className={adminTableCellMuted}>
            {logoEntries.length > 0
              ? logoEntries
                  .map(
                    (entry) =>
                      `${entry.label}: ${formatPlacement(entry.placement)}`,
                  )
                  .join(" · ")
              : formatPlacement(quote.placement)}
          </dd>
        </div>
        {logoEntries.length > 0 ? (
          logoEntries.map((entry) => (
            <div key={`${entry.label}-${entry.placement}`} className="sm:col-span-2">
              <dt className={adminLabel}>{entry.label}</dt>
              <dd className={`${adminTableCellMuted} space-y-1`}>
                <p>{formatPlacement(entry.placement)}</p>
                <p>{formatLogoPlacementDimensions(entry)}</p>
                {entry.positionPercentX !== null && entry.positionPercentY !== null && (
                  <p className={`text-xs ${adminTableCellSubtle}`}>
                    Position {entry.positionPercentX.toFixed(1)}% ·{" "}
                    {entry.positionPercentY.toFixed(1)}%
                  </p>
                )}
              </dd>
            </div>
          ))
        ) : (
          formatLogoDimensions(quote) && (
            <div>
              <dt className={adminLabel}>Logo size</dt>
              <dd className={adminTableCellMuted}>{formatLogoDimensions(quote)}</dd>
            </div>
          )
        )}
        {quote.productPhysicalWidthMm !== null && (
          <div>
            <dt className={adminLabel}>Mockup reference width</dt>
            <dd className={adminTableCellMuted}>{quote.productPhysicalWidthMm} mm</dd>
          </div>
        )}
        {formatQuoteProductMeta(quote) && (
          <div>
            <dt className={adminLabel}>Product details</dt>
            <dd className={adminTableCellMuted}>{formatQuoteProductMeta(quote)}</dd>
          </div>
        )}
        {quote.logoPositionX !== null &&
          quote.logoPositionY !== null &&
          logoEntries.length <= 1 && (
          <div>
            <dt className={adminLabel}>Logo position</dt>
            <dd className={adminTableCellMuted}>
              {quote.logoPositionX.toFixed(1)}% · {quote.logoPositionY.toFixed(1)}%
            </dd>
          </div>
        )}
        {formatCalibrationInfo(quote) && (
          <div>
            <dt className={adminLabel}>Preview calibration</dt>
            <dd className={adminTableCellMuted}>{formatCalibrationInfo(quote)}</dd>
          </div>
        )}
      </dl>
      {quote.productImageUrl ? (
        <ProductPhotoSection
          productImageUrl={quote.productImageUrl}
          quoteName={quote.name}
          compact={false}
        />
      ) : null}
      {quote.previewImageUrl &&
        !quote.previewCompositeUrl &&
        quote.previewImageUrl !== quote.previewCompositeUrl && (
          <div>
            <p className={adminLabel}>Legacy preview</p>
            <a
              href={quote.previewImageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block w-28"
            >
              <div className={adminGalleryThumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={quote.previewImageUrl}
                  alt={`Legacy preview for ${quote.name}`}
                  className="max-h-full max-w-full object-contain p-2"
                />
              </div>
            </a>
          </div>
        )}
      </>
      )}
    </div>
  );
}

function QuoteStatusSelect({
  quote,
  saveStatus,
  onStatusChange,
}: {
  quote: QuoteRequest;
  saveStatus: SaveStatusApi;
  onStatusChange: (quoteId: string, status: QuoteRequestStatus) => void;
}) {
  const actionKey = `quote:${quote.id}:status`;
  const entry = saveStatus.getEntry(actionKey);
  const disabled = saveStatus.isSaving(actionKey);

  return (
    <div className="space-y-1">
      <select
        value={quote.status}
        disabled={disabled}
        onChange={(event) =>
          onStatusChange(quote.id, event.target.value as QuoteRequestStatus)
        }
        className={adminInput}
        aria-label={`Status for ${quote.name}`}
      >
        {QUOTE_REQUEST_STATUSES.map((status) => (
          <option key={status} value={status}>
            {formatStatusLabel(status)}
          </option>
        ))}
      </select>
      {entry.status === "saving" && <SaveStatusMessage status="saving" message="Saving…" />}
      {entry.status === "saved" && (
        <SaveStatusMessage status="saved" message={entry.message ?? "Saved"} />
      )}
      {entry.status === "error" && entry.message && (
        <SaveStatusMessage
          status="error"
          message={entry.message}
          onDismiss={() => saveStatus.dismissError(actionKey)}
        />
      )}
    </div>
  );
}

export default function AdminQuotesEditor() {
  const saveStatus = useSaveStatus();
  const serviceLabels = useMemo(
    () =>
      Object.fromEntries(
        siteContent.quoteSection.form.serviceOptions.map((option) => [
          option.value,
          option.label,
        ]),
      ),
    [],
  );

  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadQuotes() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const items = await listQuoteRequests(SITE_ID);
        if (!cancelled) {
          setQuotes(items);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error, "Could not load quote requests."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadQuotes();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStatusChange = (quoteId: string, status: QuoteRequestStatus) => {
    void saveStatus.runAction(
      `quote:${quoteId}:status`,
      async () => {
        setStatusMessage(null);
        setErrorMessage(null);
        const updated = await updateQuoteRequestStatus(SITE_ID, quoteId, status);
        setQuotes((current) =>
          current.map((quote) => (quote.id === quoteId ? updated : quote)),
        );
        setStatusMessage("Quote status updated.");
      },
      { savedMessage: "Saved" },
    );
  };

  const handleMarkAsReviewed = (quoteId: string) => {
    void saveStatus.runAction(
      `quote:${quoteId}:markRead`,
      async () => {
        const updated = await markQuoteRequestAsRead(SITE_ID, quoteId);
        setQuotes((current) =>
          current.map((quote) => (quote.id === quoteId ? updated : quote)),
        );
      },
      { savedMessage: "Reviewed" },
    );
  };

  const handleQuoteDeleted = (result: DeleteQuoteRequestResult) => {
    setQuotes((current) => current.filter((quote) => quote.id !== result.quoteRequestId));
    const fileLabel = result.deletedFilesCount === 1 ? "file" : "files";
    setStatusMessage(
      `Quote request deleted. ${result.deletedFilesCount} uploaded ${fileLabel} removed.`,
    );
    if (result.warnings?.length) {
      setErrorMessage(`Some files could not be removed: ${result.warnings.join(" ")}`);
    } else {
      setErrorMessage(null);
    }
  };

  const unreadCount = useMemo(() => countUnreadQuotes(quotes), [quotes]);

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <div className={adminNotice}>
        Quote requests save to Firestore at{" "}
        <code className="text-xs">sites/{SITE_ID}/quoteRequests/{"{quoteRequestId}"}</code>.
        Public visitors can submit requests; only authenticated admins can read and update them.
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 admin-dark:border-red-500/30 admin-dark:bg-red-500/10 admin-dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {statusMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 admin-dark:border-emerald-500/30 admin-dark:bg-emerald-500/10 admin-dark:text-emerald-200">
          {statusMessage}
        </div>
      )}

      {loading ? (
        <div className={`${adminCard} px-8 py-10 text-center`}>
          <p className={adminBodyText}>Loading quote requests…</p>
        </div>
      ) : quotes.length === 0 ? (
        <div className={`max-w-md px-8 py-12 text-center ${adminCard} mx-auto`}>
          <div className={adminEmptyIconWrap}>
            <svg
              className={adminEmptyIcon}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h2 className={adminEmptyTitle}>No quote requests yet</h2>
          <p className={`mt-2 text-sm leading-relaxed ${adminBodyText}`}>
            New submissions from the public quote form and logo preview tool will appear here.
          </p>
        </div>
      ) : (
        <>
          <p className={`text-sm ${adminBodyText}`}>
            {quotes.length} quote request{quotes.length === 1 ? "" : "s"} · newest first
            {unreadCount > 0 && (
              <span className="ml-2 font-medium text-amber-700 admin-dark:text-amber-400">
                · {unreadCount} unread
              </span>
            )}
          </p>

          <div className="space-y-4 lg:hidden">
            {quotes.map((quote) => (
              <article key={quote.id} className={`${adminCard} space-y-4 p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={adminSectionTitle}>{quote.name}</h3>
                      <QuoteUnreadBadge quote={quote} />
                    </div>
                    <p className={`mt-1 text-sm ${adminBodyText}`}>{quote.email}</p>
                    <p className={`mt-1 text-xs ${adminTableCellSubtle}`}>
                      {formatQuoteDate(quote.createdAt)}
                    </p>
                  </div>
                  <div className="min-w-[160px] flex-1 space-y-2">
                    <label className={adminLabel}>Status</label>
                    <QuoteStatusSelect
                      quote={quote}
                      saveStatus={saveStatus}
                      onStatusChange={handleStatusChange}
                    />
                    <label className={`${adminLabel} mt-3 block`}>Actions</label>
                    <QuoteRowActions
                      quote={quote}
                      saveStatus={saveStatus}
                      onMarkReviewed={handleMarkAsReviewed}
                      onDeleted={handleQuoteDeleted}
                    />
                  </div>
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className={adminLabel}>Phone</dt>
                    <dd className={adminTableCellMuted}>{quote.phone || "—"}</dd>
                  </div>
                  <div>
                    <dt className={adminLabel}>Service</dt>
                    <dd className={adminTableCellMuted}>
                      {serviceLabels[quote.serviceNeeded] ?? getServiceLabel(quote.serviceNeeded)}
                    </dd>
                  </div>
                  <div>
                    <dt className={adminLabel}>Quantity</dt>
                    <dd className={adminTableCellMuted}>{quote.quantity || "—"}</dd>
                  </div>
                  <div>
                    <dt className={adminLabel}>Deadline</dt>
                    <dd className={adminTableCellMuted}>{quote.deadline || "—"}</dd>
                  </div>
                </dl>

                <div>
                  <p className={adminLabel}>Project details</p>
                  <p className={`mt-1 whitespace-pre-wrap text-sm ${adminBodyText}`}>
                    {quote.projectDetails}
                  </p>
                </div>

                <QuoteNotificationDetails quote={quote} />
                <QuotePreviewDetails quote={quote} />
                <QuotePriceEstimateSection quote={quote} />
              </article>
            ))}
          </div>

          <div className={`hidden lg:block ${adminTableWrap}`}>
            <div className={adminTableScroll}>
              <table className="min-w-full text-left text-sm">
                <thead className={adminTableHead}>
                  <tr>
                    <th className={adminTableHeadCell}>Customer</th>
                    <th className={adminTableHeadCell}>Service</th>
                    <th className={adminTableHeadCell}>Quantity</th>
                    <th className={adminTableHeadCell}>Deadline</th>
                    <th className={adminTableHeadCell}>Project details</th>
                    <th className={adminTableHeadCell}>Preview</th>
                    <th className={adminTableHeadCell}>Email</th>
                    <th className={adminTableHeadCell}>Status</th>
                    <th className={adminTableHeadCell}>Submitted</th>
                    <th className={adminTableActionsHeadCell}>Actions</th>
                  </tr>
                </thead>
                <tbody className={adminTableBody}>
                  {quotes.map((quote) => (
                    <tr key={quote.id}>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={adminTableCellTitle}>{quote.name}</p>
                          <QuoteUnreadBadge quote={quote} />
                        </div>
                        <p className={`mt-1 ${adminTableCellMuted}`}>{quote.email}</p>
                        <p className={`mt-1 ${adminTableCellSubtle}`}>
                          {quote.phone || "No phone"}
                        </p>
                      </td>
                      <td className={`px-4 py-4 align-top ${adminTableCellMuted}`}>
                        {serviceLabels[quote.serviceNeeded] ??
                          getServiceLabel(quote.serviceNeeded)}
                      </td>
                      <td className={`px-4 py-4 align-top ${adminTableCellMuted}`}>
                        {quote.quantity || "—"}
                      </td>
                      <td className={`px-4 py-4 align-top ${adminTableCellMuted}`}>
                        {quote.deadline || "—"}
                      </td>
                      <td className={`max-w-xs px-4 py-4 align-top ${adminTableCellMuted}`}>
                        <p className="line-clamp-4 whitespace-pre-wrap">
                          {quote.projectDetails}
                        </p>
                      </td>
                      <td className="min-w-[180px] max-w-xs px-4 py-4 align-top">
                        <QuotePreviewDetails quote={quote} compact />
                        <QuotePriceEstimateSection quote={quote} compact />
                      </td>
                      <td className="min-w-[140px] px-4 py-4 align-top">
                        <QuoteNotificationDetails quote={quote} />
                      </td>
                      <td className="min-w-[160px] px-4 py-4 align-top">
                        <QuoteStatusSelect
                          quote={quote}
                          saveStatus={saveStatus}
                          onStatusChange={handleStatusChange}
                        />
                      </td>
                      <td className={`px-4 py-4 align-top ${adminTableCellSubtle}`}>
                        {formatQuoteDate(quote.createdAt)}
                      </td>
                      <td className={adminTableActionsCell}>
                        <QuoteRowActions
                          quote={quote}
                          saveStatus={saveStatus}
                          onMarkReviewed={handleMarkAsReviewed}
                          onDeleted={handleQuoteDeleted}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
