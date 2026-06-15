"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listQuoteRequests,
  QUOTE_REQUEST_STATUSES,
  updateQuoteRequestStatus,
  type QuoteRequest,
  type QuoteRequestStatus,
} from "@/lib/firebase/quoteRepository";
import { siteContent } from "@/lib/siteContent";
import {
  adminBodyText,
  adminCard,
  adminEmptyIcon,
  adminEmptyIconWrap,
  adminEmptyTitle,
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

function QuoteStatusSelect({
  quote,
  disabled,
  onStatusChange,
}: {
  quote: QuoteRequest;
  disabled: boolean;
  onStatusChange: (quoteId: string, status: QuoteRequestStatus) => void;
}) {
  return (
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
  );
}

export default function AdminQuotesEditor() {
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
  const [busyQuoteId, setBusyQuoteId] = useState<string | null>(null);

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

  const handleStatusChange = async (quoteId: string, status: QuoteRequestStatus) => {
    setBusyQuoteId(quoteId);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const updated = await updateQuoteRequestStatus(SITE_ID, quoteId, status);
      setQuotes((current) =>
        current.map((quote) => (quote.id === quoteId ? updated : quote)),
      );
      setStatusMessage("Quote status updated.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to update quote status."));
    } finally {
      setBusyQuoteId(null);
    }
  };

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
            New submissions from the public quote form will appear here.
          </p>
        </div>
      ) : (
        <>
          <p className={`text-sm ${adminBodyText}`}>
            {quotes.length} quote request{quotes.length === 1 ? "" : "s"} · newest first
          </p>

          <div className="space-y-4 lg:hidden">
            {quotes.map((quote) => (
              <article key={quote.id} className={`${adminCard} space-y-4 p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className={adminSectionTitle}>{quote.name}</h3>
                    <p className={`mt-1 text-sm ${adminBodyText}`}>{quote.email}</p>
                    <p className={`mt-1 text-xs ${adminTableCellSubtle}`}>
                      {formatQuoteDate(quote.createdAt)}
                    </p>
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <label className={adminLabel}>Status</label>
                    <QuoteStatusSelect
                      quote={quote}
                      disabled={busyQuoteId === quote.id}
                      onStatusChange={(quoteId, status) => void handleStatusChange(quoteId, status)}
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
                  <th className={adminTableHeadCell}>Status</th>
                  <th className={adminTableHeadCell}>Submitted</th>
                </tr>
              </thead>
              <tbody className={adminTableBody}>
                {quotes.map((quote) => (
                  <tr key={quote.id}>
                    <td className="px-4 py-4 align-top">
                      <p className={adminTableCellTitle}>{quote.name}</p>
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
                    <td className="min-w-[160px] px-4 py-4 align-top">
                      <QuoteStatusSelect
                        quote={quote}
                        disabled={busyQuoteId === quote.id}
                        onStatusChange={(quoteId, status) =>
                          void handleStatusChange(quoteId, status)
                        }
                      />
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
