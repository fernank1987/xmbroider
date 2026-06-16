"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "../lib/adminStyles";
import type { SaveStatusApi } from "../lib/useSaveStatus";
import { useSaveStatus } from "../lib/useSaveStatus";
import AdminSaveButton from "./AdminSaveButton";
import SaveStatusMessage from "./SaveStatusMessage";

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

  if (
    quote.artworkUrl &&
    quote.artworkStoragePath &&
    quote.placement &&
    quote.logoWidthMm !== null &&
    quote.logoWidthInches !== null &&
    quote.logoPositionX !== null &&
    quote.logoPositionY !== null
  ) {
    return [
      {
        label: "Logo 1",
        artworkUrl: quote.artworkUrl,
        artworkStoragePath: quote.artworkStoragePath,
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

  return [];
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
}: {
  quote: QuoteRequest;
  saveStatus: SaveStatusApi;
  onMarkReviewed: (quoteId: string) => void;
}) {
  if (!isQuoteUnread(quote)) {
    return null;
  }

  return (
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
  );
}

function QuotePreviewDetails({ quote }: { quote: QuoteRequest }) {
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

  return (
    <div className="space-y-3">
      <QuoteMetaBadges quote={quote} />
      {compositePreviewUrl && (
        <div>
          <p className={adminLabel}>Customer preview mockup</p>
          <a
            href={compositePreviewUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block max-w-2xl"
          >
            <div className={`${adminGalleryThumb} !aspect-[4/3] !h-auto !w-full max-w-2xl`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={compositePreviewUrl}
                alt={`Customer preview mockup for ${quote.name}`}
                className="h-full w-full object-contain p-2"
              />
            </div>
          </a>
          {quote.previewCompositeExportError && (
            <p className="mt-2 text-xs text-amber-700 admin-dark:text-amber-400">
              Export note: {quote.previewCompositeExportError}
            </p>
          )}
        </div>
      )}
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
      <div className="flex flex-wrap gap-3">
        {logoEntries.map((entry) => (
          <a
            key={`${entry.label}-artwork`}
            href={entry.artworkUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-28"
          >
            <div className={adminGalleryThumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.artworkUrl}
                alt={`${entry.label} artwork for ${quote.name}`}
                className="max-h-full max-w-full object-contain p-2"
              />
            </div>
            <p className={`mt-1 text-xs ${adminTableCellSubtle}`}>
              {entry.label} artwork
            </p>
          </a>
        ))}
        {!logoEntries.length && quote.artworkUrl && (
          <a
            href={quote.artworkUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-28"
          >
            <div className={adminGalleryThumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={quote.artworkUrl}
                alt={`Artwork for ${quote.name}`}
                className="max-h-full max-w-full object-contain p-2"
              />
            </div>
            <p className={`mt-1 text-xs ${adminTableCellSubtle}`}>Original artwork</p>
          </a>
        )}
        {quote.productImageUrl && (
          <a
            href={quote.productImageUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-28"
          >
            <div className={adminGalleryThumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={quote.productImageUrl}
                alt={`Product mockup for ${quote.name}`}
                className="max-h-full max-w-full object-contain p-2"
              />
            </div>
            <p className={`mt-1 text-xs ${adminTableCellSubtle}`}>Product photo</p>
          </a>
        )}
        {quote.previewImageUrl &&
          quote.previewImageUrl !== quote.previewCompositeUrl && (
            <a
              href={quote.previewImageUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-28"
            >
              <div className={adminGalleryThumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={quote.previewImageUrl}
                  alt={`Preview for ${quote.name}`}
                  className="max-h-full max-w-full object-contain p-2"
                />
              </div>
              <p className={`mt-1 text-xs ${adminTableCellSubtle}`}>Legacy preview</p>
            </a>
          )}
      </div>
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
                    <QuoteRowActions
                      quote={quote}
                      saveStatus={saveStatus}
                      onMarkReviewed={handleMarkAsReviewed}
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
              </article>
            ))}
          </div>

          <div className={`hidden lg:block ${adminTableWrap}`}>
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
                    <td className="min-w-[180px] px-4 py-4 align-top">
                      <QuotePreviewDetails quote={quote} />
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
                      <div className="mt-2">
                        <QuoteRowActions
                          quote={quote}
                          saveStatus={saveStatus}
                          onMarkReviewed={handleMarkAsReviewed}
                        />
                      </div>
                    </td>
                    <td className={`px-4 py-4 align-top ${adminTableCellSubtle}`}>
                      {formatQuoteDate(quote.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
