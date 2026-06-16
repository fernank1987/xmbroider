import { GalleryPlaceholderIcon } from "./GalleryPlaceholderIcon";

type HomePreviewShowcaseFallbackProps = {
  mockupTitle: string;
  mockupSubtitle: string;
};

export default function HomePreviewShowcaseFallback({
  mockupTitle,
  mockupSubtitle,
}: HomePreviewShowcaseFallbackProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-background shadow-sm">
      <div className="flex aspect-[4/3] flex-col items-center justify-center bg-foreground/[0.03] px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-background">
          <GalleryPlaceholderIcon />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">{mockupTitle}</p>
        <p className="mt-1 max-w-xs text-center text-xs text-muted">{mockupSubtitle}</p>
      </div>
    </div>
  );
}
