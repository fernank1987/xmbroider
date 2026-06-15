import { getFirebaseConfigStatus } from "@/lib/firebase/client";

type AdminFirebaseSetupNoticeProps = {
  context?: "login" | "protected";
};

export default function AdminFirebaseSetupNotice({
  context = "protected",
}: AdminFirebaseSetupNoticeProps) {
  const { missingKeys } = getFirebaseConfigStatus();

  const title =
    context === "login"
      ? "Firebase is not configured"
      : "Admin login requires Firebase";

  const description =
    context === "login"
      ? "Add your Firebase web app credentials to .env.local before signing in."
      : "Protected admin pages require Firebase Auth. Configure your environment variables to continue.";

  return (
    <div className="flex flex-1 items-center justify-center p-6 lg:p-8">
      <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Required Firebase environment variables are missing. The public site
          still works with local mock content.
        </div>
        <h1 className="mt-6 text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm text-slate-600">{description}</p>

        {missingKeys.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-900">
              Missing required keys:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {missingKeys.map((key) => (
                <li key={key}>
                  <code className="text-xs text-slate-800">{key}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Copy `.env.local.example` to `.env.local`</li>
          <li>Fill in all required `NEXT_PUBLIC_FIREBASE_*` values</li>
          <li>Restart the dev server after changing env vars</li>
          <li>Create an admin user in Firebase Authentication</li>
        </ul>
      </div>
    </div>
  );
}
