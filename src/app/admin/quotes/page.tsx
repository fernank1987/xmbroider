import AdminHeader from "../components/AdminHeader";

export default function AdminQuotesPage() {
  return (
    <>
      <AdminHeader
        title="Quotes"
        description="Review and respond to customer quote requests."
      />

      <div className="flex flex-1 items-center justify-center p-6 lg:p-8">
        <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900 px-8 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
            <svg
              className="h-7 w-7 text-zinc-500"
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
          <h2 className="mt-5 text-lg font-semibold text-white">
            No quote requests yet
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Quote requests from the public site will appear here after the
            preview and quote form is connected to the backend.
          </p>
          <p className="mt-4 text-xs text-zinc-500">
            Customers can currently submit the homepage form, but submissions
            are not stored yet.
          </p>
        </div>
      </div>
    </>
  );
}
