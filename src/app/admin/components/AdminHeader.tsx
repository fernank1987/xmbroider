type AdminHeaderProps = {
  title: string;
  description?: string;
};

export default function AdminHeader({ title, description }: AdminHeaderProps) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 px-6 py-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        {title}
      </h1>
      {description && (
        <p className="mt-1 max-w-3xl text-sm text-zinc-400">{description}</p>
      )}
    </header>
  );
}
