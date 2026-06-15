import AdminHeader from "../components/AdminHeader";
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
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Service edits will be saved to Firestore later. Edit buttons are
          placeholders for now.
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 font-medium text-zinc-400">Title</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">
                    Description
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-400">
                    iconKey
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-400">
                    imageUrl
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                {services.map((service) => (
                  <tr key={service.id}>
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-white">{service.title}</p>
                      <p className="mt-0.5 font-mono text-xs text-zinc-600">
                        {service.id}
                      </p>
                    </td>
                    <td className="max-w-xs px-4 py-4 align-top text-zinc-400">
                      {service.description}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <code className="rounded bg-zinc-900 px-2 py-1 text-xs text-amber-400">
                        {service.iconKey}
                      </code>
                    </td>
                    <td className="px-4 py-4 align-top text-zinc-500">
                      {service.imageUrl ?? (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500"
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
