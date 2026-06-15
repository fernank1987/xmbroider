import AdminHeader from "./components/AdminHeader";
import AdminStatCard from "./components/AdminStatCard";
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
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
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
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm font-medium text-zinc-400">Site ID</p>
            <p className="mt-2 font-mono text-lg text-white">
              {siteContent.siteId}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Used for multi-site support when Firestore is connected
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-white">Quick links</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            <li>
              <a href="/admin/site" className="text-amber-400 hover:text-amber-300">
                Edit site content →
              </a>
            </li>
            <li>
              <a
                href="/admin/gallery"
                className="text-amber-400 hover:text-amber-300"
              >
                Manage gallery →
              </a>
            </li>
            <li>
              <a
                href="/admin/services"
                className="text-amber-400 hover:text-amber-300"
              >
                Manage services →
              </a>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
