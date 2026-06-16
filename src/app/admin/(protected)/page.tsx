import AdminHeader from "../components/AdminHeader";
import AdminDashboardStats from "../components/AdminDashboardStats";
import { adminNotice } from "../lib/adminStyles";
import { siteContent } from "@/lib/siteContent";

export default function AdminDashboardPage() {
  const { services, gallery } = siteContent;

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Overview of your XMBroider site content and admin tools."
      />

      <div className="flex-1 space-y-8 p-6 lg:p-8">
        <div className={adminNotice}>
          Admin authentication is active. Quote requests save to Firestore and can
          trigger email notifications when Resend is configured.
        </div>

        <AdminDashboardStats
          serviceCount={services.length}
          galleryCount={gallery.items.length}
        />
      </div>
    </>
  );
}
