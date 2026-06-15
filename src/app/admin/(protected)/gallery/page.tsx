import AdminHeader from "../../components/AdminHeader";
import {
  adminBodyText,
  adminButtonOutlineDisabled,
  adminCard,
  adminCardValue,
  adminGalleryThumb,
  adminGalleryThumbIcon,
  adminInputDisabled,
  adminLabel,
  adminNotice,
  adminSectionTitle,
  adminUploadIcon,
  adminUploadIconWrap,
  adminUploadZone,
} from "../../lib/adminStyles";
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
        <div className={adminNotice}>
          Image uploads will connect to Firebase Storage later. Upload controls
          below are placeholders only.
        </div>

        <section className={adminUploadZone}>
          <div className={adminUploadIconWrap}>
            <svg
              className={adminUploadIcon}
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
          <p className={`mt-4 text-sm font-medium ${adminSectionTitle}`}>
            Upload gallery image
          </p>
          <p className={`mt-1 text-xs ${adminBodyText}`}>
            PNG or JPG — drag and drop coming soon
          </p>
          <button type="button" disabled className={`mt-4 ${adminButtonOutlineDisabled}`}>
            Choose file (coming soon)
          </button>
        </section>

        <section className={`${adminCard} p-6`}>
          <h2 className={adminSectionTitle}>Add gallery item (preview)</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="gallery-title" className={adminLabel}>
                Title
              </label>
              <input
                id="gallery-title"
                type="text"
                placeholder="Embroidered Polo"
                disabled
                className={adminInputDisabled}
              />
            </div>
            <div>
              <label htmlFor="gallery-category" className={adminLabel}>
                Category
              </label>
              <input
                id="gallery-category"
                type="text"
                placeholder="Embroidery"
                disabled
                className={adminInputDisabled}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className={`mb-4 ${adminSectionTitle}`}>
            Current gallery items ({gallery.items.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {gallery.items.map((item) => (
              <article key={item.id} className={`${adminCard} p-4`}>
                <div className={adminGalleryThumb}>
                  {item.imageUrl ? (
                    <span className={`text-xs ${adminBodyText}`}>Image set</span>
                  ) : (
                    <svg
                      className={adminGalleryThumbIcon}
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
                <h3 className={`mt-3 text-sm font-medium ${adminCardValue}`}>
                  {item.label}
                </h3>
                <p className={`text-xs ${adminBodyText}`}>{item.category}</p>
                <p className={`mt-1 font-mono text-xs text-slate-400 admin-dark:text-zinc-600`}>
                  {item.id}
                </p>
                {item.imageUrl && (
                  <p className={`mt-1 truncate text-xs ${adminBodyText}`}>
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
