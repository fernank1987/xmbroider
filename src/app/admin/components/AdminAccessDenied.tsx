import AdminLogoutButton from "./AdminAuthActions";

export default function AdminAccessDenied() {
  return (
    <div className="flex flex-1 items-center justify-center p-6 lg:p-8">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-3 text-sm text-slate-600">
          Your account is signed in, but it is not authorized for the XMBroider
          admin dashboard.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Contact the site owner if you believe this is a mistake.
        </p>
        <div className="mt-6 flex justify-center">
          <AdminLogoutButton className="justify-center" />
        </div>
      </div>
    </div>
  );
}
