import AdminHeader from "../../components/AdminHeader";
import {
  adminBodyText,
  adminButtonSmallDisabled,
  adminCode,
  adminNotice,
  adminTableBody,
  adminTableCellMuted,
  adminTableCellSubtle,
  adminTableCellTitle,
  adminTableHead,
  adminTableHeadCell,
  adminTableWrap,
} from "../../lib/adminStyles";
import { siteContent } from "@/lib/siteContent";

export default function AdminServicesPage() {
  const { services } = siteContent;

  return (
    <>
      <AdminHeader
        title="Services"
        description="Manage homepage service cards shown on the public site."
      />

      <div className="flex-1 space-y-6 p-6 lg:p-8">
        <div className={adminNotice}>
          Service edits will be saved to Firestore later. Edit buttons are
          placeholders for now.
        </div>

        <div className={adminTableWrap}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className={adminTableHead}>
                <tr>
                  <th className={adminTableHeadCell}>Title</th>
                  <th className={adminTableHeadCell}>Description</th>
                  <th className={adminTableHeadCell}>iconKey</th>
                  <th className={adminTableHeadCell}>imageUrl</th>
                  <th className={adminTableHeadCell}>Actions</th>
                </tr>
              </thead>
              <tbody className={adminTableBody}>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td className="px-4 py-4 align-top">
                      <p className={adminTableCellTitle}>{service.title}</p>
                      <p className={`mt-0.5 ${adminTableCellSubtle}`}>
                        {service.id}
                      </p>
                    </td>
                    <td className={`max-w-xs px-4 py-4 align-top ${adminTableCellMuted}`}>
                      {service.description}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <code className={adminCode}>{service.iconKey}</code>
                    </td>
                    <td className={`px-4 py-4 align-top ${adminBodyText}`}>
                      {service.imageUrl ?? (
                        <span className="text-slate-400 admin-dark:text-zinc-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <button
                        type="button"
                        disabled
                        className={adminButtonSmallDisabled}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
