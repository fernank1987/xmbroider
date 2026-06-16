"use client";

import AdminStatCard from "../components/AdminStatCard";
import { useUnreadQuoteCount } from "../hooks/useUnreadQuoteCount";
import { adminAccentLink, adminCard, adminCardHint, adminCardMutedLabel, adminCardValue, adminSectionTitle } from "../lib/adminStyles";
import { siteContent } from "@/lib/siteContent";

type AdminDashboardStatsProps = {
  serviceCount: number;
  galleryCount: number;
};

export default function AdminDashboardStats({
  serviceCount,
  galleryCount,
}: AdminDashboardStatsProps) {
  const unreadQuoteCount = useUnreadQuoteCount();
  const quoteHint =
    unreadQuoteCount === null
      ? "Loading quote requests…"
      : unreadQuoteCount > 0
        ? `${unreadQuoteCount} unread quote request${unreadQuoteCount === 1 ? "" : "s"}`
        : "All quote requests reviewed";

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Site name" value={siteContent.brand.name} />
        <AdminStatCard label="Business location" value={siteContent.brand.location} />
        <AdminStatCard
          label="Services"
          value={serviceCount}
          hint="Active service cards on homepage"
        />
        <AdminStatCard
          label="Gallery items"
          value={galleryCount}
          hint="Portfolio placeholders"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminStatCard
          label="Quote requests"
          value={unreadQuoteCount ?? "—"}
          hint={quoteHint}
        />
        <div className={`${adminCard} p-5`}>
          <p className={adminCardMutedLabel}>Site ID</p>
          <p className={`${adminCardValue} font-mono text-lg`}>{siteContent.siteId}</p>
          <p className={adminCardHint}>Used for multi-site Firestore paths</p>
        </div>
      </div>

      <div className={`${adminCard} p-5`}>
        <h2 className={adminSectionTitle}>Quick links</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <a href="/admin/site" className={adminAccentLink}>
              Edit site content →
            </a>
          </li>
          <li>
            <a href="/admin/gallery" className={adminAccentLink}>
              Manage gallery →
            </a>
          </li>
          <li>
            <a href="/admin/quotes" className={adminAccentLink}>
              Review quote requests →
              {unreadQuoteCount !== null && unreadQuoteCount > 0 && (
                <span className="ml-1 text-amber-700 admin-dark:text-amber-400">
                  ({unreadQuoteCount} new)
                </span>
              )}
            </a>
          </li>
        </ul>
      </div>
    </>
  );
}
