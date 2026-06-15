type AdminStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export default function AdminStatCard({ label, value, hint }: AdminStatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-sm font-medium text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
