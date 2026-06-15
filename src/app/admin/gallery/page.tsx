import AdminHeader from "../components/AdminHeader";
import { siteContent } from "@/lib/siteContent";

export default function AdminGalleryPage() {
  const { gallery } = siteContent;

  return (
    <>
      <AdminHeader
        title="Gallery"
        description="Manage portfolio images for the public gallery section."
      />

      <div className="flex-1 space-y-8 p-6 lg:p-8">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Image uploads will connect to Firebase Storage later. Upload controls
          below are placeholders only.
        </div>

        <section className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <svg
              className="h-8 w-8 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-300">
            Upload gallery image
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            PNG or JPG — drag and drop coming soon
          </p>
          <button
            type="button"
            disabled
            className="mt-4 cursor-not-allowed rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-500"
          >
            Choose file (coming soon)
          </button>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-base font-semibold text-white">
            Add gallery item (preview)
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="gallery-title"
                className="block text-sm font-medium text-zinc-300"
              >
                Title
              </label>
              <input
                id="gallery-title"
                type="text"
                placeholder="Embroidered Polo"
                disabled
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-500"
              />
            </div>
            <div>
              <label
                htmlFor="gallery-category"
                className="block text-sm font-medium text-zinc-300"
              >
                Category
              </label>
              <input
                id="gallery-category"
                type="text"
                placeholder="Embroidery"
                disabled
                className="mt-1 w-full cursor-not-allowed rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-500"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold text-white">
            Current gallery items ({gallery.items.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {gallery.items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-zinc-800">
                  {item.imageUrl ? (
                    <span className="text-xs text-zinc-400">Image set</span>
                  ) : (
                    <svg
                      className="h-10 w-10 text-zinc-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                  )}
                </div>
                <h3 className="mt-3 text-sm font-medium text-white">
                  {item.label}
                </h3>
                <p className="text-xs text-zinc-500">{item.category}</p>
                <p className="mt-1 font-mono text-xs text-zinc-600">
                  {item.id}
                </p>
                {item.imageUrl && (
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {item.imageUrl}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
