type AdminStableLoadingCardProps = {
  message?: string;
};

/** Static light-theme markup safe for SSR and pre-hydration client render. */
export default function AdminStableLoadingCard({
  message = "Loading…",
}: AdminStableLoadingCardProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 lg:p-8">
      <div className="rounded-xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}
