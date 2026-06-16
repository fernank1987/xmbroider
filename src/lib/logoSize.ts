import type { Placement } from "./logoPreview";
import { clamp } from "./logoPreview";
import type { PreviewProduct } from "./logoPreviewProducts";

export const MM_PER_INCH = 25.4;

/** Default printable width for polo, t-shirt, hoodie mockups. */
export const DEFAULT_APPAREL_PHYSICAL_WIDTH_MM = 530;

/** Default printable width for hat/cap mockups. */
export const HAT_PHYSICAL_WIDTH_MM = 180;

export type LogoSizePreset = {
  id: string;
  label: string;
  widthMm: number;
  placements?: Placement[];
};

export const LOGO_SIZE_PRESETS: LogoSizePreset[] = [
  { id: "hat_front", label: "Hat front", widthMm: 55, placements: ["hat_front"] },
  {
    id: "small_left_chest",
    label: "Small left chest",
    widthMm: 70,
    placements: ["left_chest", "right_chest", "sleeve"],
  },
  {
    id: "standard_left_chest",
    label: "Standard left chest",
    widthMm: 85,
    placements: ["left_chest", "right_chest"],
  },
  {
    id: "large_left_chest",
    label: "Large left chest",
    widthMm: 95,
    placements: ["left_chest", "right_chest"],
  },
  { id: "four_inch", label: "4 inch / large logo", widthMm: 102 },
  {
    id: "dtf_center",
    label: "DTF center chest",
    widthMm: 220,
    placements: ["center_chest"],
  },
];

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

export function formatMmWithInches(mm: number): string {
  const inches = mmToInches(mm);
  return `${mm} mm (${inches.toFixed(2)} in)`;
}

export function logoWidthMmToPercent(
  logoWidthMm: number,
  productPhysicalWidthMm: number,
): number {
  if (productPhysicalWidthMm <= 0) {
    return 22;
  }
  return clamp((logoWidthMm / productPhysicalWidthMm) * 100, 5, 80);
}

export function estimateLogoHeightMm(
  logoWidthMm: number,
  artworkAspectRatio: number | null,
): number | null {
  if (!artworkAspectRatio || artworkAspectRatio <= 0) {
    return null;
  }
  return logoWidthMm / artworkAspectRatio;
}

export function getProductPhysicalWidthMm(
  product: PreviewProduct,
  placement?: Placement,
): number {
  if (
    typeof product.previewPhysicalWidthMm === "number" &&
    product.previewPhysicalWidthMm > 0
  ) {
    return product.previewPhysicalWidthMm;
  }

  if (placement === "hat_front") {
    return HAT_PHYSICAL_WIDTH_MM;
  }

  const category = product.category?.toLowerCase() ?? "";
  if (category.includes("hat") || category.includes("cap")) {
    return HAT_PHYSICAL_WIDTH_MM;
  }

  return DEFAULT_APPAREL_PHYSICAL_WIDTH_MM;
}

export function getLogoSizePresetsForPlacement(placement: Placement): LogoSizePreset[] {
  const placementSpecific = LOGO_SIZE_PRESETS.filter(
    (preset) => preset.placements?.includes(placement),
  );
  if (placementSpecific.length > 0) {
    return placementSpecific;
  }

  return LOGO_SIZE_PRESETS.filter((preset) => !preset.placements);
}

export function getDefaultLogoWidthForPlacement(placement: Placement): {
  widthMm: number;
  label: string;
} {
  const presets = getLogoSizePresetsForPlacement(placement);
  const preferred = presets[0];
  if (preferred) {
    return { widthMm: preferred.widthMm, label: preferred.label };
  }

  switch (placement) {
    case "hat_front":
      return { widthMm: 55, label: "Hat front" };
    case "center_chest":
      return { widthMm: 220, label: "DTF center chest" };
    case "sleeve":
      return { widthMm: 70, label: "Small left chest" };
    default:
      return { widthMm: 85, label: "Standard left chest" };
  }
}

export function findMatchingPresetLabel(widthMm: number, placement: Placement): string | null {
  const presets = getLogoSizePresetsForPlacement(placement);
  const match = presets.find((preset) => preset.widthMm === widthMm);
  return match?.label ?? null;
}

export type ProductionSizeWarning = {
  message: string;
  severity: "info" | "warning";
};

export function getProductionSizeWarning(
  placement: Placement,
  logoWidthMm: number,
): ProductionSizeWarning | null {
  if (placement === "left_chest" || placement === "right_chest") {
    if (logoWidthMm < 70 || logoWidthMm > 95) {
      return {
        severity: "warning",
        message:
          "Embroidery left chest logos are usually 70–95 mm wide for best stitch quality.",
      };
    }
    return null;
  }

  if (placement === "hat_front") {
    if (logoWidthMm < 45 || logoWidthMm > 60) {
      return {
        severity: "warning",
        message: "Hat front embroidery is usually 45–60 mm wide.",
      };
    }
    return null;
  }

  if (placement === "center_chest" && logoWidthMm < 150) {
    return {
      severity: "info",
      message:
        "Large center chest designs are often better as DTF or heat press for full-color artwork.",
    };
  }

  return null;
}

export const LOGO_WIDTH_FINE_TUNE_MIN_MM = 40;
export const LOGO_WIDTH_FINE_TUNE_MAX_MM = 280;
