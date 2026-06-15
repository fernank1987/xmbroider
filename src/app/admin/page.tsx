import AdminHeader from "./components/AdminHeader";
import AdminStatCard from "./components/AdminStatCard";
import {
  adminAccentLink,
  adminCard,
  adminCardHint,
  adminCardMutedLabel,
  adminCardValue,
  adminNotice,
  adminSectionTitle,
} from "./lib/adminStyles";
import { siteContent } from "@/lib/siteContent";

const PLACEHOLDER_QUOTE_COUNT = 0;

export default function AdminDashboardPage() {
  const { brand, services, gallery } = siteContent;

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Overview of your XMBroider site content. Data is loaded from local mock content until Firestore is connected."
      />

      <div className="flex-1 space-y-8 p-6 lg:p-8">
        <div className={adminNotice}>
          UI-only admin shell — changes are not saved yet. Firestore and
          authentication will be added in a later phase.
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard label="Site name" value={brand.name} />
          <AdminStatCard label="Business location" value={brand.location} />
          <AdminStatCard
            label="Services"
            value={services.length}
            hint="Active service cards on homepage"
          />
          <AdminStatCard
            label="Gallery items"
            value={gallery.items.length}
            hint="Portfolio placeholders"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <AdminStatCard
            label="Quote requests"
            value={PLACEHOLDER_QUOTE_COUNT}
            hint="Placeholder until quote form is connected"
          />
          <div className={`${adminCard} p-5`}>
            <p className={adminCardMutedLabel}>Site ID</p>
            <p className={`${adminCardValue} font-mono text-lg`}>
              {siteContent.siteId}
            </p>
            <p className={adminCardHint}>
              Used for multi-site support when Firestore is connected
            </p>
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
              <a href="/admin/services" className={adminAccentLink}>
                Manage services →
              </a>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
