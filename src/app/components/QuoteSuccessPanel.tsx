type QuoteSuccessPanelProps = {
  title: string;
  message: string;
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
};

export default function QuoteSuccessPanel({
  title,
  message,
  primaryAction,
  secondaryAction,
}: QuoteSuccessPanelProps) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h2 className="mt-5 text-2xl font-bold text-foreground">{title}</h2>
      <p className="mt-3 text-muted">{message}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={primaryAction.onClick}
          className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          {primaryAction.label}
        </button>
        {secondaryAction && (
          <a
            href={secondaryAction.href}
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
          >
            {secondaryAction.label}
          </a>
        )}
      </div>
    </div>
  );
}
