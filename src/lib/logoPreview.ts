export const PLACEMENTS = [
  "left_chest",
  "right_chest",
  "center_chest",
  "sleeve",
  "hat_front",
] as const;

export type Placement = (typeof PLACEMENTS)[number];

export type PlacementPreset = {
  x: number;
  y: number;
  size: number;
};

/** Legacy image-relative placement presets (superseded by garment-local presets in previewCalibration). */
export const PLACEMENT_PRESETS: Record<Placement, PlacementPreset> = {
  left_chest: { x: 38, y: 40, size: 22 },
  right_chest: { x: 62, y: 40, size: 22 },
  center_chest: { x: 50, y: 44, size: 28 },
  sleeve: { x: 20, y: 48, size: 18 },
  hat_front: { x: 50, y: 58, size: 32 },
};

export const PLACEMENT_LABELS: Record<Placement, string> = {
  left_chest: "Left chest",
  right_chest: "Right chest",
  center_chest: "Center chest",
  sleeve: "Sleeve",
  hat_front: "Hat front",
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function loadImageFromSrc(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) {
      image.crossOrigin = crossOrigin;
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });
}

async function loadImageViaBlobFetch(src: string): Promise<HTMLImageElement> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Unable to fetch image: ${src}`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    return await loadImageFromSrc(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export async function loadImageElement(src: string): Promise<HTMLImageElement> {
  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return loadImageFromSrc(src);
  }

  try {
    return await loadImageFromSrc(src, "anonymous");
  } catch {
    return loadImageViaBlobFetch(src);
  }
}

export async function loadImageWithFallback(
  primarySrc: string,
  fallbackSrc?: string,
): Promise<HTMLImageElement | null> {
  try {
    return await loadImageElement(primarySrc);
  } catch {
    if (fallbackSrc && fallbackSrc !== primarySrc) {
      try {
        return await loadImageElement(fallbackSrc);
      } catch {
        return null;
      }
    }
    return null;
  }
}
